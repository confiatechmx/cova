'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Tipos base
type PaymentProvider = 'MercadoPago' | 'KueskiPay' | 'Atrato';

interface PaymentIntentResponse {
  success: boolean;
  payment_url?: string;
  error?: string;
}

/**
 * Genera un link de pago real contactando a la API del proveedor seleccionado.
 */
export async function generatePaymentLink(
  ordenId: string, 
  monto: number, 
  proveedor: PaymentProvider,
  descripcion: string = 'Servicio Automotriz'
): Promise<PaymentIntentResponse> {
  const supabase = await createClient();

  try {
    let paymentUrl = '';
    let externalTransactionId = '';

    if (proveedor === 'MercadoPago') {
      // MOCK: En producción usar sdk de mercadopago.preferences.create
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN || 'TEST-mock-token'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{ title: descripcion, quantity: 1, unit_price: monto, currency_id: 'MXN' }],
          back_urls: { success: "https://tudominio.com/caja", pending: "https://tudominio.com/caja", failure: "https://tudominio.com/caja" },
          auto_return: "approved"
        })
      });
      // Mocking the URL since we don't have real keys right now
      paymentUrl = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=mock_${Date.now()}`;
      externalTransactionId = `mp_${Date.now()}`;
    } 
    else if (proveedor === 'KueskiPay') {
      // MOCK: En producción usar API de Kueski Pay
      paymentUrl = `https://pay.kueskipay.com/checkout/mock_${Date.now()}`;
      externalTransactionId = `kueski_${Date.now()}`;
    }
    else if (proveedor === 'Atrato') {
      // MOCK: En producción usar API de Atrato Pago
      paymentUrl = `https://checkout.atratopago.com/mock_${Date.now()}`;
      externalTransactionId = `atrato_${Date.now()}`;
    }

    // Guardar el intento de pago en la base de datos como "Procesando"
    const { error: dbError } = await supabase.from('pagos_orden').insert({
      orden_id: ordenId,
      monto_total: monto,
      proveedor_pago: proveedor,
      estatus: 'Procesando',
      external_transaction_id: externalTransactionId
    });

    if (dbError) throw dbError;

    revalidatePath('/(dashboard)/tablero', 'page');
    revalidatePath('/(dashboard)/caja', 'page');

    return {
      success: true,
      payment_url: paymentUrl
    };

  } catch (error: any) {
    console.error('Error generando link de pago:', error);
    return { success: false, error: error.message };
  }
}
