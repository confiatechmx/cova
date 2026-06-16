import { NextResponse } from 'next/server';
import { getWhatsAppStatus } from '@/lib/whatsapp';

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
