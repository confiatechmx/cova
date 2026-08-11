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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
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
    <div className="flex flex-col min-h-screen bg-background pb-24 md:pb-0">
      
      {/* Header */}
      <header className="bg-card border-b border-slate-200 px-6 py-5 shrink-0 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Landmark size={24} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Caja y Pagos</h1>
            <p className="text-sm text-slate-500 font-medium">Corte de caja omnicanal y cuentas por cobrar</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-x-hidden">
        
        {/* Corte de Caja KPI */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Landmark size={48} className="text-slate-900" /></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Total Neto (Hoy)</span>
            <span className="text-2xl font-bold text-slate-900 tabular-nums relative z-10">${totalNeto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            {totalComisiones > 0 && <span className="text-[10px] text-slate-400 font-medium relative z-10 mt-1 tabular-nums">Bruto: ${totalCobrado.toLocaleString("es-MX")} - Comisiones: ${totalComisiones.toLocaleString("es-MX")}</span>}
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={14} className="text-success" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Efectivo</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">${totalEfectivo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-primary" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarjetas (MP/Stripe)</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">${totalTarjeta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone size={14} className="text-secondary-foreground" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">BNPL (Kueski)</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">${totalBNPL.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transacciones</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-success font-semibold">{aprobadas.length} Aprob.</span>
              <span className="text-slate-500 font-semibold">{transaccionesHoy.filter(t => t.estatus === 'Pendiente' || t.estatus === 'Procesando').length} Proc.</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Cuentas por Cobrar */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Cuentas por Cobrar ({cuentasPorCobrar.length})
            </h2>
            
            <div className="bg-card border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 max-h-[500px] overflow-y-auto">
              {cuentasPorCobrar.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No hay cuentas por cobrar pendientes.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Cliente / Vehículo</th>
                      <th className="px-4 py-3 text-right">Monto Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cuentasPorCobrar.map(c => {
                      const isOverdue = c.estado === 'Terminado / Listo para Entrega';
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <h4 className="font-semibold text-slate-900 text-sm">{c.vehiculos?.marca} {c.vehiculos?.modelo} <span className="text-slate-500 font-normal tabular-nums">({c.vehiculos?.placas})</span></h4>
                            <p className="text-xs text-slate-500 mt-0.5">{c.vehiculos?.clientes?.nombre} • Estatus: {c.estado}</p>
                          </td>
                          <td className="px-4 py-3 text-right flex flex-col items-end justify-center">
                            <span className={`text-base font-bold tabular-nums ${isOverdue ? 'text-destructive' : 'text-slate-500'}`}>
                              ${c.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                            <Link href="/tablero" className="text-[10px] uppercase font-bold text-primary hover:text-primary/80 flex items-center gap-1 mt-1">
                              Cobrar <ArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Transacciones de Hoy */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              Ingresos del Día
            </h2>
            
            <div className="bg-card border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 max-h-[500px] overflow-y-auto">
              {transaccionesHoy.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Aún no hay transacciones generadas hoy.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Transacción</th>
                      <th className="px-4 py-3 text-right">Total Pagado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaccionesHoy.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.estatus === 'Aprobado' ? 'bg-success/10 text-success' : t.estatus === 'Rechazado' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {t.proveedor_pago === 'Efectivo' ? <Banknote size={16} /> : t.proveedor_pago === 'KueskiPay' || t.proveedor_pago === 'Atrato' ? <Smartphone size={16} /> : <CreditCard size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">{t.proveedor_pago}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${t.estatus === 'Aprobado' ? 'bg-success text-white' : t.estatus === 'Rechazado' ? 'bg-destructive text-white' : 'bg-yellow-500 text-white'}`}>
                                {t.estatus}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{new Date(t.fecha_pago).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {t.ordenes_servicio?.vehiculos?.marca}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-base font-bold text-slate-900 tabular-nums flex flex-col items-end justify-center">
                            ${Number(t.monto_total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            {Number(t.comision_pasarela) > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium font-sans">
                                Com: -${Number(t.comision_pasarela).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
