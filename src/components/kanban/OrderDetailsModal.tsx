"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, User, Car, Clock, Wrench, Plus, Trash2, CheckCircle2, Package2, Banknote, CreditCard, Landmark, Smartphone, Image as ImageIcon } from "lucide-react";
import { generatePaymentLink } from "@/app/actions/payments";

interface OrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
  onUpdate: () => void;
}

// Local UI Component for Accordion to mimic Shadcn
const AccordionItem = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button 
        onClick={() => setOpen(!open)}
        className="flex flex-1 items-center justify-between py-4 text-sm font-semibold text-slate-900 transition-all hover:underline w-full text-left"
      >
        {title}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="pb-4 pt-0 text-sm">
          {children}
        </div>
      )}
    </div>
  )
};

export function OrderDetailsModal({ orderId, onClose, onUpdate }: OrderDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableTires, setAvailableTires] = useState<any[]>([]);
  const [activePaymentProviders, setActivePaymentProviders] = useState<any[]>([]);
  
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [addingServiceLoading, setAddingServiceLoading] = useState(false);

  const [isAddingTire, setIsAddingTire] = useState(false);
  const [selectedTireId, setSelectedTireId] = useState("");
  const [selectedTireQty, setSelectedTireQty] = useState(1);
  const [addingTireLoading, setAddingTireLoading] = useState(false);

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const [paymentProvider, setPaymentProvider] = useState("Efectivo");
  const [addingPaymentLoading, setAddingPaymentLoading] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");

  // DVI Mock State (UI Demonstration)
  const [dviState, setDviState] = useState<Record<string, 'bien' | 'precaucion' | 'urgente'>>({});
  const [dragActive, setDragActive] = useState<string | null>(null);

  const handleStatusChange = (category: string, status: 'bien' | 'precaucion' | 'urgente') => {
    setDviState(prev => ({ ...prev, [category]: status }));
  };

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel('pagos_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pagos_orden',
        filter: `orden_id=eq.${orderId}`
      }, (payload) => {
        const updatedPago = payload.new;
        if (updatedPago.estatus === 'Aprobado') {
          setOrder((prev: any) => {
            if (!prev) return prev;
            const idx = prev.pagos_orden.findIndex((p: any) => p.id === updatedPago.id);
            if (idx === -1) return prev;
            if (prev.pagos_orden[idx].estatus === 'Aprobado') return prev;
            
            const newPagos = [...prev.pagos_orden];
            newPagos[idx] = updatedPago;
            
            const srvTotal = prev.orden_servicio_servicios?.reduce((a: number, c: any) => a + Number(c.precio_cobrado), 0) || 0;
            const tireTotal = prev.cotizaciones?.detalles_cotizacion?.reduce((a: number, c: any) => a + Number(c.subtotal), 0) || 0;
            const granT = srvTotal + tireTotal;
            const totalPagado = newPagos.filter((p: any) => p.estatus === 'Aprobado').reduce((a: number, c: any) => a + Number(c.monto_total), 0);
            
            let newEstatus = 'Pendiente';
            if (totalPagado > 0 && totalPagado < granT) newEstatus = 'Parcial';
            if (totalPagado >= granT) newEstatus = 'Pagado';
            
            return { ...prev, pagos_orden: newPagos, estatus_pago: newEstatus };
          });
          onUpdate();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes_servicio')
        .select(`
          *,
          vehiculos (
            id, marca, modelo, placas,
            clientes ( id, nombre, telefono )
          ),
          orden_servicio_servicios (
            id, precio_cobrado,
            servicios_taller ( id, nombre )
          ),
          cotizaciones (
            id, total,
            detalles_cotizacion (
              id, cantidad, precio_unitario, subtotal,
              inventario_llantas ( id, marca, modelo_llanta, rin, ancho, perfil, stock_actual )
            )
          ),
          pagos_orden (
            id, monto_total, proveedor_pago, estatus, external_transaction_id, comision_pasarela, fecha_pago, deleted_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (!orderError && orderData) {
        if (orderData.pagos_orden) {
          orderData.pagos_orden = orderData.pagos_orden.filter((p: any) => p.deleted_at === null);
        }
        setOrder(orderData);
      }
      const { data: mechData } = await supabase.from('empleados').select('id, nombre').eq('rol', 'Mecánico').eq('activo', true);
      if (mechData) setMechanics(mechData);
      const { data: srvData } = await supabase.from('servicios_taller').select('id, nombre, precio').eq('activo', true).order('nombre');
      if (srvData) setAvailableServices(srvData);
      const { data: tiresData } = await supabase.from('inventario_llantas').select('*').gt('stock_actual', 0).order('marca');
      if (tiresData) setAvailableTires(tiresData);
      const { data: providersData } = await supabase.from('configuracion_pagos').select('*').eq('activo', true);
      if (providersData) {
        setActivePaymentProviders(providersData);
        if (providersData.length > 0) setPaymentProvider(providersData[0].proveedor);
      }
      setLoading(false);
    }
    if (orderId) loadData();
  }, [orderId]);

  const handleUpdateStatus = async (newStatus: string) => {
    const { error } = await supabase.from('ordenes_servicio').update({ estado: newStatus }).eq('id', orderId);
    if (!error) { setOrder({ ...order, estado: newStatus }); onUpdate(); }
  };

  const handleUpdateMechanic = async (mechanicId: string) => {
    const val = mechanicId === "" ? null : mechanicId;
    const { error } = await supabase.from('ordenes_servicio').update({ mecanico_id: val }).eq('id', orderId);
    if (!error) setOrder({ ...order, mecanico_id: val });
  };

  const handleAddService = async () => {
    if (!selectedServiceId) return;
    const service = availableServices.find(s => s.id === selectedServiceId);
    if (!service) return;
    setAddingServiceLoading(true);
    const payload = { orden_servicio_id: orderId, servicio_id: service.id, precio_cobrado: service.precio };
    const { data, error } = await supabase.from('orden_servicio_servicios').insert(payload).select('id, precio_cobrado, servicios_taller(id, nombre)').single();
    if (!error && data) {
      setOrder({ ...order, orden_servicio_servicios: [...(order.orden_servicio_servicios || []), data] });
      setIsAddingService(false);
      setSelectedServiceId("");
    }
    setAddingServiceLoading(false);
  };

  const handleRemoveService = async (relationId: string) => {
    const { error } = await supabase.from('orden_servicio_servicios').delete().eq('id', relationId);
    if (!error) {
      setOrder({ ...order, orden_servicio_servicios: order.orden_servicio_servicios.filter((s: any) => s.id !== relationId) });
    }
  };

  const handleAddTire = async () => {
    if (!selectedTireId || selectedTireQty < 1) return;
    const tire = availableTires.find(t => t.id === selectedTireId);
    if (!tire) return;
    setAddingTireLoading(true);
    let currentCotizacionId = order.cotizacion_id;
    if (!currentCotizacionId) {
      const { data: newCotizacion, error: cotError } = await supabase.from('cotizaciones').insert({
        cliente_id: order.vehiculos.clientes.id,
        vehiculo_id: order.vehiculos.id,
        estatus: 'Borrador'
      }).select('id').single();
      if (!cotError && newCotizacion) {
        currentCotizacionId = newCotizacion.id;
        await supabase.from('ordenes_servicio').update({ cotizacion_id: currentCotizacionId }).eq('id', orderId);
      }
    }
    if (currentCotizacionId) {
      const subtotalItem = tire.precio_venta * selectedTireQty;
      const { data: newDetail, error: detailError } = await supabase.from('detalles_cotizacion').insert({
        cotizacion_id: currentCotizacionId,
        llanta_id: tire.id,
        cantidad: selectedTireQty,
        precio_unitario: tire.precio_venta,
        subtotal: subtotalItem
      }).select('id, cantidad, precio_unitario, subtotal, inventario_llantas(id, marca, modelo_llanta, rin, ancho, perfil, stock_actual)').single();
      if (!detailError && newDetail) {
        await supabase.from('inventario_llantas').update({ stock_actual: tire.stock_actual - selectedTireQty }).eq('id', tire.id);
        const updatedCotizaciones = order.cotizaciones || { detalles_cotizacion: [] };
        setOrder({
          ...order,
          cotizacion_id: currentCotizacionId,
          cotizaciones: {
            ...updatedCotizaciones,
            detalles_cotizacion: [...(updatedCotizaciones.detalles_cotizacion || []), newDetail]
          }
        });
        setAvailableTires(prev => prev.map(t => t.id === tire.id ? { ...t, stock_actual: t.stock_actual - selectedTireQty } : t));
        setIsAddingTire(false);
        setSelectedTireId("");
        setSelectedTireQty(1);
      }
    }
    setAddingTireLoading(false);
  };

  const handleRemoveTire = async (detail: any) => {
    const { error } = await supabase.from('detalles_cotizacion').delete().eq('id', detail.id);
    if (!error) {
      const tire = detail.inventario_llantas;
      await supabase.from('inventario_llantas').update({ stock_actual: tire.stock_actual + detail.cantidad }).eq('id', tire.id);
      const updatedDetalles = order.cotizaciones.detalles_cotizacion.filter((d: any) => d.id !== detail.id);
      setOrder({
        ...order,
        cotizaciones: { ...order.cotizaciones, detalles_cotizacion: updatedDetalles }
      });
      setAvailableTires(prev => prev.map(t => t.id === tire.id ? { ...t, stock_actual: t.stock_actual + detail.cantidad } : t));
    }
  };

  const servicesList = order?.orden_servicio_servicios || [];
  const subtotalServicios = servicesList.reduce((acc: number, curr: any) => acc + Number(curr.precio_cobrado), 0);
  const tiresList = order?.cotizaciones?.detalles_cotizacion || [];
  const subtotalLlantas = tiresList.reduce((acc: number, curr: any) => acc + Number(curr.subtotal), 0);
  const granTotal = subtotalServicios + subtotalLlantas;
  const pagosList = order?.pagos_orden || [];
  const totalPagado = pagosList
    .filter((p: any) => p.estatus === 'Aprobado')
    .reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
  const saldoPendiente = granTotal - totalPagado;

  const handleAddPayment = async () => {
    const monto = parseFloat(paymentAmount.toString());
    if (isNaN(monto) || monto <= 0) return;
    setAddingPaymentLoading(true);
    const providerConfig = activePaymentProviders.find(p => p.proveedor === paymentProvider);
    const requiresHardwareIntegration = ['Mercado Pago', 'Stripe', 'KueskiPay', 'Atrato'].includes(paymentProvider);
    const comision = providerConfig ? monto * (Number(providerConfig.comision_porcentaje) / 100) : 0;

    if (requiresHardwareIntegration) {
      setPaymentStatusMessage(`Generando link con ${paymentProvider}...`);
      const res = await generatePaymentLink(orderId, monto, paymentProvider as any);
      if (res.success) {
        setPaymentStatusMessage(`Esperando pago del cliente en ${paymentProvider}...`);
        const { data: newPago } = await supabase.from('pagos_orden').select('*').eq('orden_id', orderId).order('created_at', { ascending: false }).limit(1).single();
        if (newPago) {
           const newPagos = [...(order.pagos_orden || []), newPago];
           setOrder((prev: any) => ({ ...prev, pagos_orden: newPagos }));
           setIsAddingPayment(false);
           setPaymentAmount("");
           setPaymentStatusMessage("");
           setAddingPaymentLoading(false);
           if (res.payment_url) window.open(res.payment_url, '_blank');
        }
      } else {
        alert("Error generando link: " + res.error);
        setAddingPaymentLoading(false);
      }
    } else {
      const payload = {
        orden_servicio_id: orderId,
        monto_total: monto,
        proveedor_pago: paymentProvider,
        estatus: 'Aprobado',
        comision_pasarela: comision
      };
      const { data: intent, error } = await supabase.from('pagos_orden').insert(payload).select('*').single();
      if (!error && intent) {
        const newPagos = [...(order.pagos_orden || []), intent];
        const newTotalPagado = newPagos.filter(p => p.estatus === 'Aprobado').reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
        let newEstatus = 'Pendiente';
        if (newTotalPagado > 0 && newTotalPagado < granTotal) newEstatus = 'Parcial';
        if (newTotalPagado >= granTotal) newEstatus = 'Pagado';
        await supabase.from('ordenes_servicio').update({ estatus_pago: newEstatus }).eq('id', orderId);
        setOrder((prev: any) => ({ ...prev, pagos_orden: newPagos, estatus_pago: newEstatus }));
        setIsAddingPayment(false);
        setPaymentAmount("");
        setPaymentStatusMessage("");
        setAddingPaymentLoading(false);
        onUpdate();
      } else {
        setAddingPaymentLoading(false);
      }
    }
  };

  const handleRemovePayment = async (pagoId: string) => {
    const { error } = await supabase.from('pagos_orden').update({ deleted_at: new Date().toISOString() }).eq('id', pagoId);
    if (!error) {
      const newPagos = order.pagos_orden.filter((p: any) => p.id !== pagoId);
      const newTotalPagado = newPagos.filter((p: any) => p.estatus === 'Aprobado').reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
      let newEstatus = 'Pendiente';
      if (newTotalPagado > 0 && newTotalPagado < granTotal) newEstatus = 'Parcial';
      if (newTotalPagado >= granTotal) newEstatus = 'Pagado';
      await supabase.from('ordenes_servicio').update({ estatus_pago: newEstatus }).eq('id', orderId);
      setOrder({ ...order, pagos_orden: newPagos, estatus_pago: newEstatus });
      onUpdate();
    }
  };

  if (loading || !order) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <p className="text-sm">Cargando expediente...</p>
      </div>
    );
  }

  const v = order.vehiculos;
  const c = v?.clientes;
  
  const dviCategories = [
    { id: 'frenos', label: 'Sistema de Frenos' },
    { id: 'suspension', label: 'Suspensión y Dirección' },
    { id: 'motor', label: 'Motor y Fluidos' },
    { id: 'llantas', label: 'Condición de Llantas' }
  ];

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-background w-full max-w-7xl mx-auto rounded-xl overflow-hidden shadow-2xl">
      
      {/* Top Header */}
      <div className="bg-card px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
            <Car size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
              {v?.marca} {v?.modelo} <span className="text-slate-500 font-normal text-sm ml-1 tabular-nums">{v?.placas}</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <User size={12} /> {c?.nombre} {c?.telefono ? `• ${c.telefono}` : ''}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                order.estatus_pago === 'Pagado' ? 'bg-success text-white' :
                order.estatus_pago === 'Parcial' ? 'bg-yellow-500 text-white' : 'bg-destructive text-white'
              }`}>
                {order.estatus_pago || 'Pendiente'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 sm:items-end">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Estatus Operativo</label>
          <select 
            value={order.estado}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="h-8 text-sm font-semibold bg-white border border-slate-300 rounded-md py-1 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm cursor-pointer"
          >
            <option value="En Espera / Recepción">En Espera / Recepción</option>
            <option value="En Diagnóstico">En Diagnóstico</option>
            <option value="Por Autorizar">Por Autorizar</option>
            <option value="En Proceso / Reparación">En Proceso / Reparación</option>
            <option value="Por Validar / Control de Calidad">Por Validar / Control de Calidad</option>
            <option value="Terminado / Listo para Entrega">Terminado / Listo para Entrega</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          
          {/* LEFT PANEL: Client, Vehicle, and Quote */}
          <div className="flex flex-col gap-6">
            
            <section className="bg-card p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock size={16} className="text-slate-400" /> Datos de Recepción
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Kilometraje</span>
                  <span className="text-sm font-medium text-slate-900 tabular-nums">{order.kilometraje_ingreso?.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Gasolina</span>
                  <span className="text-sm font-medium text-slate-900 tabular-nums">{order.nivel_gasolina}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mecánico Asignado</span>
                <select 
                  value={order.mecanico_id || ""}
                  onChange={(e) => handleUpdateMechanic(e.target.value)}
                  className="h-8 w-full text-sm bg-white border border-slate-300 rounded-md px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                >
                  <option value="">Sin asignar (En fila)</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* QUOTE / COTIZACIÓN */}
            <section className="bg-card rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" /> Cotización de Servicios y Refacciones
                </h3>
              </div>
              
              <div className="p-4 flex flex-col gap-4">
                {/* Llantas y Refacciones */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Refacciones</h4>
                    <button onClick={() => setIsAddingTire(true)} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                      <Plus size={14} /> Añadir
                    </button>
                  </div>
                  {isAddingTire && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex gap-2 items-center flex-wrap sm:flex-nowrap mb-3">
                      <select value={selectedTireId} onChange={(e) => setSelectedTireId(e.target.value)} className="flex-1 h-8 text-sm border border-slate-300 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[200px]">
                        <option value="" disabled>Inventario...</option>
                        {availableTires.map(t => <option key={t.id} value={t.id} disabled={t.stock_actual <= 0}>{t.marca} {t.modelo_llanta} - Disp: {t.stock_actual} - ${t.precio_venta}</option>)}
                      </select>
                      <input type="number" min="1" value={selectedTireQty} onChange={(e) => setSelectedTireQty(parseInt(e.target.value) || 1)} className="w-16 h-8 text-sm border border-slate-300 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center tabular-nums text-slate-900" />
                      <button onClick={handleAddTire} disabled={addingTireLoading || !selectedTireId} className="bg-primary hover:bg-primary/90 text-white px-3 h-8 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors">OK</button>
                      <button onClick={() => setIsAddingTire(false)} className="text-slate-500 hover:text-slate-700 px-2 h-8 text-xs font-medium">Cancelar</button>
                    </div>
                  )}
                  {tiresList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No hay refacciones.</p>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                        <tr>
                          <th className="py-2">Item</th>
                          <th className="py-2 text-center w-12">Cant</th>
                          <th className="py-2 text-right">P. Unit</th>
                          <th className="py-2 text-right">Importe</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tiresList.map((row: any) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="py-2 text-xs font-medium text-slate-800">{row.inventario_llantas?.marca} {row.inventario_llantas?.modelo_llanta}</td>
                            <td className="py-2 text-xs font-semibold text-slate-900 text-center tabular-nums">{row.cantidad}</td>
                            <td className="py-2 text-xs font-medium text-slate-900 text-right tabular-nums">${Number(row.precio_unitario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 text-sm font-semibold text-slate-900 text-right tabular-nums">${Number(row.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 text-center"><button onClick={() => handleRemoveTire(row)} className="text-slate-400 hover:text-destructive p-1"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Servicios */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Mano de Obra</h4>
                    <button onClick={() => setIsAddingService(true)} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                      <Plus size={14} /> Añadir
                    </button>
                  </div>
                  {isAddingService && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex gap-2 items-center mb-3">
                      <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} className="flex-1 h-8 text-sm border border-slate-300 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option value="" disabled>Catálogo...</option>
                        {availableServices.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>)}
                      </select>
                      <button onClick={handleAddService} disabled={addingServiceLoading || !selectedServiceId} className="bg-primary hover:bg-primary/90 text-white px-3 h-8 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors">OK</button>
                      <button onClick={() => setIsAddingService(false)} className="text-slate-500 hover:text-slate-700 px-2 h-8 text-xs font-medium">Cancelar</button>
                    </div>
                  )}
                  {servicesList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No hay servicios.</p>
                  ) : (
                    <table className="w-full text-left">
                      <tbody>
                        {servicesList.map((row: any) => (
                          <tr key={row.id} className="border-t border-slate-100 first:border-0">
                            <td className="py-2 text-xs font-medium text-slate-800">{row.servicios_taller?.nombre}</td>
                            <td className="py-2 text-sm font-semibold text-slate-900 text-right tabular-nums">${Number(row.precio_cobrado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 text-center w-8"><button onClick={() => handleRemoveService(row.id)} className="text-slate-400 hover:text-destructive p-1"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-md flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Gran Total</span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>

              </div>
            </section>
          </div>

          {/* RIGHT PANEL: Digital Vehicle Inspection (DVI) */}
          <div className="flex flex-col h-full bg-card rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">Inspección Digital del Vehículo (DVI)</h3>
              <p className="text-xs text-slate-500 mt-1">Registra la evidencia y el estado visual de cada componente para adjuntar a la cotización.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {dviCategories.map((cat, idx) => (
                <AccordionItem key={cat.id} title={`${idx + 1}. ${cat.label}`} defaultOpen={idx === 0}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleStatusChange(cat.id, 'bien')} 
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${dviState[cat.id] === 'bien' ? 'bg-success text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        Bien
                      </button>
                      <button 
                        onClick={() => handleStatusChange(cat.id, 'precaucion')} 
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${dviState[cat.id] === 'precaucion' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        Precaución
                      </button>
                      <button 
                        onClick={() => handleStatusChange(cat.id, 'urgente')} 
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${dviState[cat.id] === 'urgente' ? 'bg-destructive text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        Reparación Urgente
                      </button>
                    </div>

                    <div 
                      className={`p-6 flex flex-col items-center justify-center transition-colors ${dragActive === cat.id ? 'border-dashed border-2 border-primary bg-primary/5' : 'border border-slate-300 rounded-md bg-slate-50'}`}
                      onDragOver={(e) => { e.preventDefault(); setDragActive(cat.id); }}
                      onDragLeave={() => setDragActive(null)}
                      onDrop={(e) => { e.preventDefault(); setDragActive(null); }}
                    >
                      <ImageIcon size={24} className="text-slate-400 mb-2" />
                      <p className="text-xs font-medium text-slate-500">Arrastra y suelta fotos o videos aquí</p>
                      <p className="text-[10px] text-slate-400 mt-1">Soporta JPG, PNG, MP4 (Max 10MB)</p>
                    </div>
                    
                    <div>
                      <input type="text" placeholder="Notas adicionales del técnico..." className="w-full h-8 text-xs border border-slate-300 rounded-md px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                    </div>
                  </div>
                </AccordionItem>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <div className="bg-card border-t border-slate-200 shrink-0 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gran Total</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pagado</span>
            <span className="text-lg font-bold text-success tabular-nums">${totalPagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Saldo</span>
            <span className="text-2xl font-black text-amber-600 tabular-nums">${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm w-full sm:w-auto">
          Cerrar Expediente
        </button>
      </div>
    </div>
  );
}
