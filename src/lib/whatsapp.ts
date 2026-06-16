import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';

let globalClient: any = null;
let lastQr: string | null = null;
let connectionStatus: 'Connected' | 'Disconnected' | 'Connecting' = 'Disconnected';
let isWorkerRunning = false;
let lastCronRun = 0;

// Helper to check if a specific automation rule is active in database
export async function isRuleActive(ruleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('reglas_automatizacion')
      .select('activa')
      .eq('id', ruleId)
      .single();
    if (error) throw error;
    return data ? data.activa : false;
  } catch (err) {
    console.error(`Error checking rule ${ruleId}, defaulting to true:`, err);
    return true;
  }
}

// Function to scan database and trigger 6-month reminders
export async function scanSixMonthReminders(force = false): Promise<number> {
  console.log(`Iniciando escaneo de recordatorios de 6 meses (force: ${force})...`);

  // Check if rule is active (if not forced)
  if (!force) {
    const active = await isRuleActive('recordatorio_rotacion_6m');
    if (!active) {
      console.log('Regla de recordatorio de 6 meses desactivada. Cancelando escaneo.');
      return 0;
    }
  }

  try {
    let quotes: any[] = [];
    
    if (force) {
      // For demonstration/testing: pull ANY accepted quotes that haven't received a reminder
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          id,
          cliente_id,
          vehiculo_id,
          total,
          clientes (nombre, telefono),
          vehiculos (marca, modelo, placas)
        `)
        .eq('recordatorio_enviado', false)
        .limit(5);
      
      if (error) throw error;
      quotes = data || [];
    } else {
      // Production: pull quotes accepted exactly 6 months (180 days) ago
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 180);

      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          id,
          cliente_id,
          vehiculo_id,
          total,
          clientes (nombre, telefono),
          vehiculos (marca, modelo, placas)
        `)
        .eq('estatus', 'Aceptada')
        .eq('recordatorio_enviado', false)
        .lte('fecha', targetDate.toISOString());

      if (error) throw error;
      quotes = data || [];
    }

    // Edge case fallback: if forced and there are no accepted quotes, simulate with any vehicle/client
    if (force && quotes.length === 0) {
      console.log('No se encontraron cotizaciones para prueba. Simulando con vehículos existentes...');
      const { data: vehicles, error: vErr } = await supabase
        .from('vehiculos')
        .select(`
          id,
          marca,
          modelo,
          placas,
          clientes (nombre, telefono)
        `)
        .limit(1);

      if (vErr) throw vErr;

      if (vehicles && vehicles.length > 0) {
        const v = vehicles[0];
        const clientObj = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
        
        if (clientObj) {
          // Fetch template
          const { data: template } = await supabase
            .from('plantillas_notificacion')
            .select('contenido')
            .eq('id', 'recordatorio_rotacion')
            .single();

          const baseMsg = template?.contenido || 'Hola {{cliente}}, han pasado 6 meses desde tu cambio de llantas en tu {{vehiculo}}. Te recordamos pasar a Cova para tu servicio de rotación.';
          const msg = baseMsg
            .replace('{{cliente}}', clientObj.nombre)
            .replace('{{vehiculo}}', `${v.marca} ${v.modelo} (${v.placas})`);

          // Queue the simulated notification
          await supabase
            .from('cola_notificaciones')
            .insert({
              telefono: clientObj.telefono,
              mensaje: msg,
              estado: 'Pendiente'
            });

          console.log(`Prueba forzada encolada con éxito para ${clientObj.nombre}`);
          return 1;
        }
      }
      return 0;
    }

    if (quotes.length === 0) {
      console.log('No se encontraron cotizaciones que requieran recordatorio.');
      return 0;
    }

    // Fetch the 6-month rotation reminder template
    const { data: templateData } = await supabase
      .from('plantillas_notificacion')
      .select('contenido')
      .eq('id', 'recordatorio_rotacion')
      .single();

    const templateContent = templateData?.contenido || 'Hola {{cliente}}, han pasado 6 meses desde tu servicio o cambio de llantas en tu {{vehiculo}}. Te recordamos pasar a Cova para tu servicio de rotación, alineación y balanceo. ¡Te esperamos!';

    let enqueuedCount = 0;
    for (const quote of quotes) {
      const client = Array.isArray(quote.clientes) ? quote.clientes[0] : quote.clientes;
      const vehicle = Array.isArray(quote.vehiculos) ? quote.vehiculos[0] : quote.vehiculos;

      if (client && vehicle) {
        // Construct reminder message
        const message = templateContent
          .replace('{{cliente}}', client.nombre)
          .replace('{{vehiculo}}', `${vehicle.marca} ${vehicle.modelo} (${vehicle.placas})`)
          .replace('{{total}}', `$${parseFloat(quote.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);

        // 1. Enqueue to notification queue
        await supabase
          .from('cola_notificaciones')
          .insert({
            telefono: client.telefono,
            mensaje: message,
            estado: 'Pendiente'
          });

        // 2. Mark quote as reminder sent to prevent double dispatch
        await supabase
          .from('cotizaciones')
          .update({ recordatorio_enviado: true })
          .eq('id', quote.id);

        enqueuedCount++;
      }
    }

    console.log(`Se encolaron ${enqueuedCount} recordatorios de rotación.`);
    return enqueuedCount;
  } catch (err: any) {
    console.error('Error en el escaneo de recordatorios de 6 meses:', err.message);
    return 0;
  }
}

// Background queue worker loop
async function startQueueWorker() {
  console.log('Background Worker de WhatsApp iniciado.');
  
  while (true) {
    if (connectionStatus !== 'Connected' || !globalClient) {
      isWorkerRunning = false;
      console.log('WhatsApp desconectado o cliente no disponible. Deteniendo worker de cola.');
      break;
    }

    try {
      // Dynamic Check: Run the 6-month cron task once every 12 hours
      const nowTime = Date.now();
      if (nowTime - lastCronRun > 12 * 60 * 60 * 1000) {
        lastCronRun = nowTime;
        // Run daily scan asynchronously
        scanSixMonthReminders(false);
      }

      // Query next pending message
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
          const cleanPhone = item.telefono.replace(/[^\d]/g, '');
          const jid = `${cleanPhone}@s.whatsapp.net`;

          await globalClient.sendMessage(jid, { text: item.mensaje });

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
          
          await supabase
            .from('cola_notificaciones')
            .update({ estado: 'Fallido' })
            .eq('id', item.id);
        }

        const delay = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
        console.log(`Retraso anti-baneo (humano): Esperando ${delay}ms antes del siguiente despacho...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err: any) {
      console.error('Error en loop de cola:', err.message);
    }

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

    // Fetch latest WhatsApp Web version to prevent handshake connection check errors
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Usando versión de WhatsApp Web: ${version.join('.')} (isLatest: ${isLatest})`);

    const sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers.macOS('Desktop'),
      printQRInTerminal: false,
      logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
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
          setTimeout(() => initWhatsApp(), 5000);
        }
      } else if (connection === 'open') {
        console.log('WhatsApp Web conectado!');
        connectionStatus = 'Connected';
        globalClient = sock;
        lastQr = null;

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
  if (connectionStatus === 'Disconnected' && !globalClient) {
    initWhatsApp();
  }

  return {
    status: connectionStatus,
    qr: lastQr
  };
}

export async function logoutWhatsApp() {
  console.log('Cerrando sesión de WhatsApp...');
  try {
    if (globalClient) {
      try {
        await globalClient.logout();
      } catch (logoutErr: any) {
        console.log('Error al enviar logout al socket, cerrando socket de forma forzada:', logoutErr.message);
        try {
          globalClient.end(undefined);
        } catch (endErr) {}
      }
      globalClient = null;
    }
    
    connectionStatus = 'Disconnected';
    lastQr = null;

    // Esperar 500ms para asegurar la liberación de descriptores de archivos
    await new Promise((resolve) => setTimeout(resolve, 500));

    const authDir = path.join(process.cwd(), 'auth_info_baileys');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('Directorio auth_info_baileys eliminado con éxito.');
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error al desvincular dispositivo:', err);
    return { success: false, error: err.message };
  }
}
