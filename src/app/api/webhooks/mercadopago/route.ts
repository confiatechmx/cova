import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || searchParams.get('type');
    const id = searchParams.get('id') || searchParams.get('data.id');

    if (!id) {
      return new NextResponse('Bad Request: Missing ID', { status: 400 });
    }

    if (topic === 'payment') {
      const supabase = await createClient();
      
      // MOCK: En producción, aquí haríamos un fetch a la API de MP para verificar el estado real del pago con el ID
      // const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }});
      // const paymentInfo = await paymentResponse.json();
      
      const isApproved = true; // paymentInfo.status === 'approved'
      const externalTransactionId = `mp_${id}`; // Debería mapearse al ID que se guardó al generar el intent
      
      if (isApproved) {
        // En un entorno real, buscaríamos el pago por el preference_id o el external_transaction_id guardado
        // await supabase.from('pagos_orden').update({ estatus: 'Aprobado', fecha_pago: new Date().toISOString() }).eq('external_transaction_id', externalTransactionId);
        
        console.log(`Pago ${id} aprobado vía Webhook de Mercado Pago`);
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error procesando Webhook de Mercado Pago:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
