"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, User, Car, Clock, Wrench, Plus, Trash2, CheckCircle2, Package2, Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";

interface OrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderDetailsModal({ orderId, onClose, onUpdate }: OrderDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableTires, setAvailableTires] = useState<any[]>([]);
  const [activePaymentProviders, setActivePaymentProviders] = useState<any[]>([]);
  
  // States for adding a new service
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [addingServiceLoading, setAddingServiceLoading] = useState(false);

  // States for adding a new tire
  const [isAddingTire, setIsAddingTire] = useState(false);
  const [selectedTireId, setSelectedTireId] = useState("");
  const [selectedTireQty, setSelectedTireQty] = useState(1);
  const [addingTireLoading, setAddingTireLoading] = useState(false);

  // States for adding a new payment (Payment Intents)
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const [paymentProvider, setPaymentProvider] = useState("Efectivo");
  const [addingPaymentLoading, setAddingPaymentLoading] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");

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
            id, monto_total, proveedor_pago, estatus, external_transaction_id, comision_pasarela, fecha_pago
          )
        `)
        .eq('id', orderId)
        .single();

      if (!orderError && orderData) {
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

  // Payment Calculation
  const servicesList = order?.orden_servicio_servicios || [];
  const subtotalServicios = servicesList.reduce((acc: number, curr: any) => acc + Number(curr.precio_cobrado), 0);

  const tiresList = order?.cotizaciones?.detalles_cotizacion || [];
  const subtotalLlantas = tiresList.reduce((acc: number, curr: any) => acc + Number(curr.subtotal), 0);

  const granTotal = subtotalServicios + subtotalLlantas;
  const pagosList = order?.pagos_orden || [];
  // Only count Approved payments towards the total paid
  const totalPagado = pagosList
    .filter((p: any) => p.estatus === 'Aprobado')
    .reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
  const saldoPendiente = granTotal - totalPagado;

  const handleAddPayment = async () => {
    const monto = parseFloat(paymentAmount.toString());
    if (isNaN(monto) || monto <= 0) return;

    setAddingPaymentLoading(true);
    
    // Si es Efectivo o Transferencia, se asume cobro directo y manual sin Webhook.
    const providerConfig = activePaymentProviders.find(p => p.proveedor === paymentProvider);
    const requiresHardwareIntegration = ['Mercado Pago', 'Stripe', 'KueskiPay', 'Atrato'].includes(paymentProvider);
    
    const initialStatus = requiresHardwareIntegration ? 'Procesando' : 'Aprobado';
    const comision = providerConfig ? monto * (Number(providerConfig.comision_porcentaje) / 100) : 0;

    const payload = {
      orden_servicio_id: orderId,
      monto_total: monto,
      proveedor_pago: paymentProvider,
      estatus: initialStatus,
      comision_pasarela: comision
    };

    // 1. Create the Intent
    const { data: intent, error } = await supabase
      .from('pagos_orden')
      .insert(payload)
      .select('*')
      .single();

    if (!error && intent) {
      
      if (requiresHardwareIntegration) {
        // SIMULATE WEBHOOK / HARDWARE DELAY
        setPaymentStatusMessage(`Despertando terminal ${paymentProvider}...`);
        
        // Simulating the user tapping their card / BNPL app approval
        setTimeout(async () => {
          setPaymentStatusMessage("Esperando autorización del banco...");
          
          setTimeout(async () => {
            // Webhook received! Transaction successful.
            const fakeTxId = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            
            const { data: approvedIntent } = await supabase
              .from('pagos_orden')
              .update({ estatus: 'Aprobado', external_transaction_id: fakeTxId })
              .eq('id', intent.id)
              .select('*')
              .single();

            if (approvedIntent) {
              updateOrderWithNewPayment(approvedIntent);
            }
          }, 2000);
          
        }, 1500);

      } else {
        // Instant approval (Cash)
        updateOrderWithNewPayment(intent);
      }
    } else {
      setAddingPaymentLoading(false);
    }
  };

  const updateOrderWithNewPayment = async (newPayment: any) => {
    const newPagos = [...(order.pagos_orden || []), newPayment];
    const newTotalPagado = newPagos.filter(p => p.estatus === 'Aprobado').reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
    
    let newEstatus = 'Pendiente';
    if (newTotalPagado > 0 && newTotalPagado < granTotal) newEstatus = 'Parcial';
    if (newTotalPagado >= granTotal) newEstatus = 'Pagado';

    await supabase.from('ordenes_servicio').update({ estatus_pago: newEstatus }).eq('id', orderId);

    setOrder((prev: any) => ({
      ...prev,
      pagos_orden: newPagos,
      estatus_pago: newEstatus
    }));

    setIsAddingPayment(false);
    setPaymentAmount("");
    setPaymentStatusMessage("");
    setAddingPaymentLoading(false);
    onUpdate();
  };

  const handleRemovePayment = async (pagoId: string) => {
    const { error } = await supabase.from('pagos_orden').delete().eq('id', pagoId);
    if (!error) {
      const newPagos = order.pagos_orden.filter((p: any) => p.id !== pagoId);
      const newTotalPagado = newPagos.filter((p: any) => p.estatus === 'Aprobado').reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
      let newEstatus = 'Pendiente';
      if (newTotalPagado > 0 && newTotalPagado < granTotal) newEstatus = 'Parcial';
      if (newTotalPagado >= granTotal) newEstatus = 'Pagado';

      await supabase.from('ordenes_servicio').update({ estatus_pago: newEstatus }).eq('id', orderId);

      setOrder({
        ...order,
        pagos_orden: newPagos,
        estatus_pago: newEstatus
      });
      onUpdate();
    }
  };


  if (loading || !order) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <p className="text-sm">Cargando expediente...</p>
      </div>
    );
  }

  const v = order.vehiculos;
  const c = v?.clientes;
  const inputClasses = "border border-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-white text-sm p-2 w-full transition-all text-zinc-800 shadow-sm outline-none";
  
  return (
    <div className="flex flex-col h-full max-h-[85vh] sm:max-h-[85vh] bg-zinc-50/30">
      
      {/* Top Banner */}
      <div className="bg-white px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Car size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight leading-tight">
              {v?.marca} {v?.modelo} <span className="text-zinc-500 font-normal text-sm ml-1">{v?.placas}</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
              <User size={12} /> {c?.nombre} {c?.telefono ? `• ${c.telefono}` : ''}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                order.estatus_pago === 'Pagado' ? 'bg-emerald-100 text-emerald-700' :
                order.estatus_pago === 'Parcial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {order.estatus_pago || 'Pendiente'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 sm:items-end">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Estatus Operativo</label>
          <select 
            value={order.estado}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="text-sm font-semibold bg-white border border-zinc-200 rounded-md py-1.5 px-3 text-zinc-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            <option value="Citas del Día">Citas del Día</option>
            <option value="En Inspección">En Inspección</option>
            <option value="En Rampa">En Rampa (Trabajando)</option>
            <option value="Listo para Entrega">Listo para Entrega</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto dense-scrollbar p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Operations */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <section>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Wrench size={16} className="text-zinc-400" /> Operación
              </h3>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Mecánico Asignado</label>
                <select 
                  value={order.mecanico_id || ""}
                  onChange={(e) => handleUpdateMechanic(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Sin asignar (En fila)</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-zinc-400" /> Datos de Recepción
              </h3>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Kilometraje</span>
                    <span className="text-sm font-medium text-zinc-900">{order.kilometraje_ingreso?.toLocaleString()} km</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Gasolina</span>
                    <span className="text-sm font-medium text-zinc-900">{order.nivel_gasolina}</span>
                  </div>
                </div>
                {order.notas_recepcion && (
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Notas / Falla</span>
                    <p className="text-sm text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">{order.notas_recepcion}</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Services, Parts & Payments */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* SERVICIOS */}
            <section className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-600" /> Trabajos y Servicios
                </h3>
                {!isAddingService && (
                  <button onClick={() => setIsAddingService(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus size={14} /> Agregar Servicio
                  </button>
                )}
              </div>
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                {isAddingService && (
                  <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex gap-2 items-center">
                    <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} className="flex-1 text-sm border border-blue-200 rounded-md p-1.5 focus:outline-none focus:border-blue-500">
                      <option value="" disabled>Selecciona del catálogo...</option>
                      {availableServices.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>)}
                    </select>
                    <button onClick={handleAddService} disabled={addingServiceLoading || !selectedServiceId} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors">Añadir</button>
                    <button onClick={() => setIsAddingService(false)} className="text-zinc-500 hover:text-zinc-700 px-2 py-1.5 text-xs font-medium">Cancelar</button>
                  </div>
                )}
                {servicesList.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 text-xs">No hay servicios de mano de obra en esta orden.</div>
                ) : (
                  <table className="w-full text-left">
                    <tbody>
                      {servicesList.map((row: any) => (
                        <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-2.5 text-sm font-medium text-zinc-800">{row.servicios_taller?.nombre}</td>
                          <td className="px-4 py-2.5 text-sm font-mono font-semibold text-zinc-900 text-right w-32">${Number(row.precio_cobrado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-2.5 w-10 text-center"><button onClick={() => handleRemoveService(row.id)} className="text-zinc-400 hover:text-red-500 p-1"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* LLANTAS Y REFACCIONES */}
            <section className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <Package2 size={16} className="text-blue-600" /> Refacciones y Llantas
                </h3>
                {!isAddingTire && (
                  <button onClick={() => setIsAddingTire(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus size={14} /> Agregar Pieza
                  </button>
                )}
              </div>
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                {isAddingTire && (
                  <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <select value={selectedTireId} onChange={(e) => setSelectedTireId(e.target.value)} className="flex-1 text-sm border border-blue-200 rounded-md p-1.5 focus:outline-none focus:border-blue-500 min-w-[200px]">
                      <option value="" disabled>Selecciona del inventario...</option>
                      {availableTires.map(t => <option key={t.id} value={t.id} disabled={t.stock_actual <= 0}>{t.marca} {t.modelo_llanta} ({t.ancho}/{t.perfil}R{t.rin}) - Disp: {t.stock_actual} - ${t.precio_venta}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-500 font-medium ml-1">Cant:</span>
                      <input type="number" min="1" max={availableTires.find(t => t.id === selectedTireId)?.stock_actual || 99} value={selectedTireQty} onChange={(e) => setSelectedTireQty(parseInt(e.target.value) || 1)} className="w-16 text-sm border border-blue-200 rounded-md p-1.5 focus:outline-none focus:border-blue-500 text-center" />
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={handleAddTire} disabled={addingTireLoading || !selectedTireId || selectedTireQty < 1} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors">Añadir</button>
                      <button onClick={() => setIsAddingTire(false)} className="text-zinc-500 hover:text-zinc-700 px-2 py-1.5 text-xs font-medium">Cancelar</button>
                    </div>
                  </div>
                )}
                {tiresList.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 text-xs">No hay llantas o refacciones en esta orden.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/80 border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Artículo</th>
                        <th className="px-4 py-2 text-center w-16">Cant</th>
                        <th className="px-4 py-2 text-right">P. Unit</th>
                        <th className="px-4 py-2 text-right">Importe</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiresList.map((row: any) => {
                        const t = row.inventario_llantas;
                        return (
                        <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-2.5 text-sm font-medium text-zinc-800">{t?.marca} {t?.modelo_llanta} <span className="text-xs text-zinc-400 font-normal">({t?.ancho}/{t?.perfil}R{t?.rin})</span></td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-zinc-900 text-center">{row.cantidad}</td>
                          <td className="px-4 py-2.5 text-xs font-mono font-medium text-zinc-500 text-right">${Number(row.precio_unitario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2.5 text-sm font-mono font-semibold text-zinc-900 text-right">${Number(row.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-2.5 text-center"><button onClick={() => handleRemoveTire(row)} className="text-zinc-400 hover:text-red-500 p-1"><Trash2 size={14} /></button></td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER: Payments & Total */}
      <div className="bg-zinc-50 border-t border-zinc-200 shrink-0">
        <div className="px-6 py-4 border-b border-zinc-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 uppercase tracking-wider">
              <Landmark size={16} className="text-emerald-600" /> Pasarela de Pagos
            </h3>
            {saldoPendiente > 0 && !isAddingPayment && (
              <button onClick={() => { setIsAddingPayment(true); setPaymentAmount(saldoPendiente); }} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                <Plus size={14} /> Generar Cobro
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {pagosList.map((p: any) => (
              <div key={p.id} className={`flex justify-between items-center bg-white border p-3 rounded-lg shadow-sm ${p.estatus === 'Aprobado' ? 'border-emerald-200' : p.estatus === 'Rechazado' ? 'border-rose-200' : 'border-amber-200'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.estatus === 'Aprobado' ? 'bg-emerald-50 text-emerald-600' : p.estatus === 'Rechazado' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    {p.proveedor_pago === 'Efectivo' ? <Banknote size={20} /> : p.proveedor_pago === 'KueskiPay' || p.proveedor_pago === 'Atrato' ? <Smartphone size={20} /> : <CreditCard size={20} />}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-zinc-900">{p.proveedor_pago}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${p.estatus === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : p.estatus === 'Rechazado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.estatus}
                      </span>
                      {p.external_transaction_id && <span className="text-xs text-zinc-400 font-mono">Ref: {p.external_transaction_id}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono font-bold text-zinc-900 text-lg">${Number(p.monto_total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  {Number(p.comision_pasarela) > 0 && <span className="text-[10px] text-zinc-400">Comisión: ${Number(p.comision_pasarela).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>}
                </div>
              </div>
            ))}

            {isAddingPayment && (
              <div className="flex flex-col gap-3 bg-white border border-emerald-200 shadow-sm p-4 rounded-xl mt-2 relative overflow-hidden">
                {addingPaymentLoading && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-emerald-600 mb-2" />
                    <span className="text-sm font-semibold text-emerald-800 animate-pulse">{paymentStatusMessage}</span>
                  </div>
                )}
                
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Nueva Intención de Pago</h4>
                
                <div className="flex items-center gap-3">
                  <select value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)} className="w-1/3 text-sm border border-emerald-200 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 bg-emerald-50/30 font-semibold text-emerald-900">
                    {activePaymentProviders.map(p => (
                      <option key={p.id} value={p.proveedor}>{p.proveedor}</option>
                    ))}
                  </select>
                  
                  <div className="flex items-center flex-1">
                    <span className="bg-emerald-50/30 border border-r-0 border-emerald-200 rounded-l-lg p-2.5 text-zinc-500 text-sm font-bold">$</span>
                    <input 
                      type="number" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      className="flex-1 text-base border border-emerald-200 rounded-r-lg p-2.5 focus:outline-none focus:border-emerald-500 font-mono font-bold bg-white"
                    />
                  </div>
                  
                  <button onClick={handleAddPayment} disabled={addingPaymentLoading || !paymentAmount} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap">
                    Confirmar Transacción
                  </button>
                  <button onClick={() => setIsAddingPayment(false)} className="text-zinc-500 hover:text-zinc-700 px-3 py-2.5 text-sm font-medium">
                    Cancelar
                  </button>
                </div>
                
                <p className="text-[10px] text-zinc-400 mt-1">Al elegir Mercado Pago o KueskiPay, el sistema se comunicará con el dispositivo o celular del cliente para autorizar el cobro.</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Gran Total</span>
              <span className="text-lg font-mono font-bold text-zinc-900">${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Monto Aprobado</span>
              <span className="text-lg font-mono font-bold text-emerald-600">${totalPagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Saldo Pendiente</span>
              <span className="text-2xl font-mono font-black text-amber-600">${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors shadow-sm w-full sm:w-auto">
            Cerrar Expediente
          </button>
        </div>
      </div>

    </div>
  );
}
