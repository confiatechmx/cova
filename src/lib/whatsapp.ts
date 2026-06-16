import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import pino from 'pino';
import { supabase } from './supabase';

let globalClient: any = null;
let lastQr: string | null = null;
let connectionStatus: 'Connected' | 'Disconnected' | 'Connecting' = 'Disconnected';
let isWorkerRunning = false;

async function startQueueWorker() {
  console.log('Background Worker de WhatsApp iniciado.');
  
  while (true) {
    if (connectionStatus !== 'Connected' || !globalClient) {
      isWorkerRunning = false;
      console.log('WhatsApp desconectado o cliente no disponible. Deteniendo worker de cola.');
      break;
    }

    try {
      // 1. Query next pending message
      const { data, error } = await supabase
        .from('cola_notificaciones')
        .select('*')
        .eq('estado', 'Pendiente')
        .order('fecha_creacion', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error consultando cola en Supabase:', error);
      } else if (data && data.length > 0) {
        const item = data[0];
        console.log(`Despachando mensaje pendiente ID: ${item.id} a ${item.telefono}`);

        try {
          // Format phone to JID (remove + and spaces: eg +52 667 123 4567 -> 526671234567@s.whatsapp.net)
          const cleanPhone = item.telefono.replace(/[^\d]/g, '');
          const jid = `${cleanPhone}@s.whatsapp.net`;

          // 2. Send message via WhatsApp Socket
          await globalClient.sendMessage(jid, { text: item.mensaje });

          // 3. Mark message as Sent
          await supabase
            .from('cola_notificaciones')
            .update({ 
              estado: 'Enviado', 
              fecha_envio: new Date().toISOString() 
            })
            .eq('id', item.id);

          console.log(`Mensaje ID ${item.id} enviado exitosamente.`);
        } catch (sendErr: any) {
          console.error(`Error al enviar mensaje ID ${item.id}:`, sendErr.message);
          
          // 4. Mark message as Failed
          await supabase
            .from('cola_notificaciones')
            .update({ estado: 'Fallido' })
            .eq('id', item.id);
        }

        // Anti-ban delay: wait random between 4,000 and 8,000 milliseconds
        const delay = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
        console.log(`Retraso anti-baneo (humano): Esperando ${delay}ms antes del siguiente despacho...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err: any) {
      console.error('Error en loop de cola:', err.message);
    }

    // Wait 5 seconds before checking again for new messages
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

async function initWhatsApp() {
  if (connectionStatus === 'Connecting' || connectionStatus === 'Connected') return;

  connectionStatus = 'Connecting';
  lastQr = null;
  console.log('Conectando a WhatsApp Web...');

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) // suppress library logging to keep console clean
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          // Convert string to base64 QR image
          lastQr = await qrcode.toDataURL(qr);
        } catch (qrErr) {
          console.error('Error al generar QR base64:', qrErr);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Conexión cerrada. Reconectando:', shouldReconnect);
        connectionStatus = 'Disconnected';
        globalClient = null;
        lastQr = null;
        if (shouldReconnect) {
          // Reconnect after 5 seconds
          setTimeout(() => initWhatsApp(), 5000);
        }
      } else if (connection === 'open') {
        console.log('WhatsApp Web conectado!');
        connectionStatus = 'Connected';
        globalClient = sock;
        lastQr = null;

        // Initialize background queue worker if not already running
        if (!isWorkerRunning) {
          isWorkerRunning = true;
          startQueueWorker();
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err: any) {
    console.error('Fallo al inicializar cliente de WhatsApp:', err.message);
    connectionStatus = 'Disconnected';
  }
}

export async function getWhatsAppStatus() {
  // Trigger connection if currently disconnected
  if (connectionStatus === 'Disconnected' && !globalClient) {
    initWhatsApp();
  }

  return {
    status: connectionStatus,
    qr: lastQr
  };
}
