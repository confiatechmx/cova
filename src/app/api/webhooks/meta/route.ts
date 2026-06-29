import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'cova_omnichannel_token_123';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Verificamos si es un evento de webhook de Meta (WhatsApp, IG, FB)
    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
        // Ejemplo simplificado para WhatsApp Cloud API
        const change = body.entry[0].changes[0].value;
        const message = change.messages[0];
        const contact = change.contacts[0];
        
        const senderId = message.from; // Número de teléfono o ID de usuario
        const textContent = message.text?.body || '[Multimedia/Otro]';
        const canal = 'WhatsApp_Cloud'; // Determinar dinámicamente según el endpoint o payload

        // 1. Buscar o crear la conversación
        let { data: conversacion } = await supabase
          .from('conversaciones_omnicanal')
          .select('id')
          .eq('canal', canal)
          .eq('identificador_externo', senderId)
          .single();

        if (!conversacion) {
          const { data: newConv } = await supabase
            .from('conversaciones_omnicanal')
            .insert({
              canal: canal,
              identificador_externo: senderId,
              estado: 'Abierto'
            })
            .select('id')
            .single();
          conversacion = newConv;
        }

        if (conversacion) {
          // 2. Insertar el mensaje
          await supabase.from('mensajes_omnicanal').insert({
            conversacion_id: conversacion.id,
            sentido: 'Entrante',
            tipo: 'Texto',
            contenido: textContent,
            metadatos: { raw_payload: message }
          });
          
          // 3. Actualizar la última hora de mensaje
          await supabase.from('conversaciones_omnicanal')
            .update({ ultimo_mensaje_at: new Date().toISOString(), estado: 'Abierto' })
            .eq('id', conversacion.id);
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error procesando Meta Webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
