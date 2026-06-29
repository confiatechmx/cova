import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, reference } = body; // Depende de la estructura del Webhook de Kueski

    if (!id) {
      return new NextResponse('Bad Request: Missing ID', { status: 400 });
    }

    if (status === 'approved' || status === 'paid') {
      const supabase = await createClient();
      
      const externalTransactionId = reference || `kueski_${id}`;
      
      // MOCK: Actualizar el estatus en la base de datos
      // await supabase.from('pagos_orden').update({ estatus: 'Aprobado', fecha_pago: new Date().toISOString() }).eq('external_transaction_id', externalTransactionId);
      
      console.log(`Pago ${id} aprobado vía Webhook de KueskiPay`);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error procesando Webhook de KueskiPay:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
