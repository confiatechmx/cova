"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Loader2, Landmark, Banknote, CreditCard, Search, ArrowRight, Smartphone } from "lucide-react";
import Link from "next/link";

export default function CajaPage() {
  const [loading, setLoading] = useState(true);
  
  // Data
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<any[]>([]);
  const [transaccionesHoy, setTransaccionesHoy] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1. Cuentas por cobrar (Órdenes no pagadas)
      const { data: cuentasData } = await supabase
        .from('ordenes_servicio')
        .select(`
          id, estado, estatus_pago, created_at,
          vehiculos ( marca, modelo, placas, clientes ( nombre ) ),
          orden_servicio_servicios ( precio_cobrado ),
          cotizaciones (
            detalles_cotizacion ( subtotal )
          ),
          pagos_orden ( monto_total, estatus, deleted_at )
        `)
        .in('estatus_pago', ['Pendiente', 'Parcial'])
        .order('created_at', { ascending: false });

      if (cuentasData) {
        const cuentasCalculadas = cuentasData.map(order => {
          const srvTotal = (order.orden_servicio_servicios || []).reduce((acc: number, curr: any) => acc + Number(curr.precio_cobrado), 0);
          const llantasTotal = (order.cotizaciones || []).flatMap((c: any) => c.detalles_cotizacion || []).reduce((acc: number, curr: any) => acc + Number(curr.subtotal), 0);
          const granTotal = srvTotal + llantasTotal;
          
          // Only Approved payments count towards "Paid"
          const pagado = (order.pagos_orden || [])
            .filter((p: any) => p.estatus === 'Aprobado' && p.deleted_at === null)
            .reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
            
          const saldo = granTotal - pagado;

          return {
            ...order,
            granTotal,
            pagado,
            saldo
          };
        }).filter(o => o.saldo > 0);
        
        setCuentasPorCobrar(cuentasCalculadas);
      }

      // 2. Transacciones de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: transaccionesData } = await supabase
        .from('pagos_orden')
        .select(`
          id, monto_total, proveedor_pago, estatus, fecha_pago, external_transaction_id, comision_pasarela, deleted_at,
          ordenes_servicio (
            vehiculos ( marca, modelo, placas )
          )
        `)
        .gte('fecha_pago', today.toISOString())
        .is('deleted_at', null)
        .order('fecha_pago', { ascending: false });

      if (transaccionesData) {
        setTransaccionesHoy(transaccionesData);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  // Resumen de Corte de Caja (Solo Aprobados)
  const aprobadas = transaccionesHoy.filter(t => t.estatus === 'Aprobado');
  const totalEfectivo = aprobadas.filter(t => t.proveedor_pago === 'Efectivo').reduce((a, b) => a + Number(b.monto_total), 0);
  const totalTarjeta = aprobadas.filter(t => t.proveedor_pago === 'Mercado Pago' || t.proveedor_pago === 'Stripe').reduce((a, b) => a + Number(b.monto_total), 0);
  const totalBNPL = aprobadas.filter(t => t.proveedor_pago === 'KueskiPay' || t.proveedor_pago === 'Atrato').reduce((a, b) => a + Number(b.monto_total), 0);
  const totalCobrado = totalEfectivo + totalTarjeta + totalBNPL;
  const totalComisiones = aprobadas.reduce((a, b) => a + Number(b.comision_pasarela), 0);
  const totalNeto = totalCobrado - totalComisiones;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24 md:pb-0">
      
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-5 shrink-0 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Landmark size={24} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Caja y Pagos</h1>
            <p className="text-sm text-zinc-500 font-medium">Corte de caja omnicanal y cuentas por cobrar</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-x-hidden">
        
        {/* Corte de Caja KPI */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-emerald-600 p-5 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Landmark size={48} /></div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 relative z-10">Total Neto (Hoy)</span>
            <span className="text-3xl font-mono font-black text-white relative z-10">${totalNeto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            {totalComisiones > 0 && <span className="text-[10px] text-emerald-200 font-medium relative z-10 mt-1">Bruto: ${totalCobrado.toLocaleString("es-MX")} - Comisiones: ${totalComisiones.toLocaleString("es-MX")}</span>}
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={14} className="text-emerald-500" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Efectivo</span>
            </div>
            <span className="text-xl font-mono font-bold text-zinc-800">${totalEfectivo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tarjetas (MP/Stripe)</span>
            </div>
            <span className="text-xl font-mono font-bold text-zinc-800">${totalTarjeta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone size={14} className="text-purple-500" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">BNPL (Kueski/Atrato)</span>
            </div>
            <span className="text-xl font-mono font-bold text-zinc-800">${totalBNPL.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status Transacciones</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-600 font-semibold">{aprobadas.length} Aprob.</span>
              <span className="text-amber-500 font-semibold">{transaccionesHoy.filter(t => t.estatus === 'Pendiente' || t.estatus === 'Procesando').length} Proc.</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Cuentas por Cobrar */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Cuentas por Cobrar ({cuentasPorCobrar.length})
            </h2>
            
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex-1 max-h-[500px] overflow-y-auto dense-scrollbar">
              {cuentasPorCobrar.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">No hay cuentas por cobrar pendientes.</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {cuentasPorCobrar.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div>
                        <h4 className="font-bold text-zinc-900">{c.vehiculos?.marca} {c.vehiculos?.modelo} <span className="text-zinc-400 text-xs font-normal">({c.vehiculos?.placas})</span></h4>
                        <p className="text-xs text-zinc-500 mt-0.5">{c.vehiculos?.clientes?.nombre} • Estatus: {c.estado}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-black text-amber-600 text-lg">${c.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                        <Link href="/tablero" className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1">
                          Ir a Tablero <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transacciones de Hoy (Intents) */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Historial de Payment Intents (Hoy)
            </h2>
            
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex-1 max-h-[500px] overflow-y-auto dense-scrollbar">
              {transaccionesHoy.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">Aún no hay Payment Intents generados hoy.</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {transaccionesHoy.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.estatus === 'Aprobado' ? 'bg-emerald-50 text-emerald-600' : t.estatus === 'Rechazado' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          {t.proveedor_pago === 'Efectivo' ? <Banknote size={16} /> : t.proveedor_pago === 'KueskiPay' || t.proveedor_pago === 'Atrato' ? <Smartphone size={16} /> : <CreditCard size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 text-sm">{t.proveedor_pago}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${t.estatus === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : t.estatus === 'Rechazado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                              {t.estatus}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{new Date(t.fecha_pago).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {t.ordenes_servicio?.vehiculos?.marca}</p>
                          {t.external_transaction_id && <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Ref: {t.external_transaction_id}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-zinc-900">${Number(t.monto_total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                        {Number(t.comision_pasarela) > 0 && <span className="text-[10px] text-zinc-400 font-medium">Comisión: -${Number(t.comision_pasarela).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
