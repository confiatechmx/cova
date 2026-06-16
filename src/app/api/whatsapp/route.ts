import { NextResponse } from 'next/server';
import { getWhatsAppStatus, scanSixMonthReminders } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const statusData = await getWhatsAppStatus();
    return NextResponse.json(statusData);
  } catch (err: any) {
    console.error('Error in WhatsApp API route:', err);
    return NextResponse.json(
      { error: 'Fallo al obtener estado de WhatsApp', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ruleId, active } = body;

    if (action === 'toggle_rule') {
      if (!ruleId) {
        return NextResponse.json({ error: 'ruleId requerido' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('reglas_automatizacion')
        .update({ activa: active })
        .eq('id', ruleId)
        .select();

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true, data });
    }

    if (action === 'force_cron') {
      const enqueuedCount = await scanSixMonthReminders(true);
      return NextResponse.json({ success: true, enqueuedCount });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in WhatsApp API POST route:', err);
    return NextResponse.json(
      { error: 'Fallo al procesar petición', details: err.message },
      { status: 500 }
    );
  }
}

