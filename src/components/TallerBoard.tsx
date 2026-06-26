'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, ArrowRight, Check, AlertTriangle, Loader2, Image as ImageIcon, X } from 'lucide-react';

export interface BoardOrder {
  id: string;
  vehiculo_id: string;
  nivel_gasolina: string;
  kilometraje_ingreso: number;
  notas_recepcion: string;
  estado: 'En Fila' | 'En Proceso' | 'Listo para Entrega';
  fecha_ingreso: string;
  vehiculos: {
    marca: string;
    modelo: string;
    anio: number;
    placas: string;
  };
  mecanico_id?: string;
  checklist_danos?: {
    zona_vehiculo: string;
    tipo_dano: string;
    url_foto: string | null;
  }[];
}

export interface TallerBoardRef {
  refreshBoard: () => void;
}

const MOCK_ORDERS: BoardOrder[] = [
  {
    id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e01',
    vehiculo_id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    nivel_gasolina: '1/4',
    kilometraje_ingreso: 72050,
    notas_recepcion: 'Cliente reporta un rechinido constante al frenar a baja velocidad.',
    estado: 'En Fila',
    fecha_ingreso: new Date(Date.now() - 120 * 60000).toISOString(), // 2 hours ago
    vehiculos: { marca: 'Chevrolet', modelo: 'Aveo', anio: 2018, placas: 'VMY-789-B' }
  },
  {
    id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e04',
    vehiculo_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    nivel_gasolina: 'Lleno',
    kilometraje_ingreso: 89000,
    notas_recepcion: 'Servicio de cambio de amortiguadores delanteros y revisión de bujes de suspensión.',
    estado: 'En Fila',
    fecha_ingreso: new Date(Date.now() - 300 * 60000).toISOString(), // 5 hours ago
    vehiculos: { marca: 'Nissan', modelo: 'NP300', anio: 2019, placas: 'VMX-456-D' }
  },
  {
    id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e02',
    vehiculo_id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    nivel_gasolina: '3/4',
    kilometraje_ingreso: 35080,
    notas_recepcion: 'Montaje de 4 llantas nuevas Goodyear Wrangler y alineación / balanceo.',
    estado: 'En Proceso',
    fecha_ingreso: new Date(Date.now() - 240 * 60000).toISOString(), // 4 hours ago
    vehiculos: { marca: 'Toyota', modelo: 'Hilux', anio: 2021, placas: 'VNZ-123-C' }
  },
  {
    id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e03',
    vehiculo_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    nivel_gasolina: '1/2',
    kilometraje_ingreso: 45010,
    notas_recepcion: 'Alineación y Balanceo de rutina. Calibración general de llantas.',
    estado: 'Listo para Entrega',
    fecha_ingreso: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
    vehiculos: { marca: 'Nissan', modelo: 'Versa', anio: 2020, placas: 'VJS-456-A' }
  }
];

const TallerBoard = forwardRef<TallerBoardRef, {}>((props, ref) => {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal State
  const [viewingDamagesOrder, setViewingDamagesOrder] = useState<BoardOrder | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordenes_servicio')
        .select(`
          id,
          vehiculo_id,
          nivel_gasolina,
          kilometraje_ingreso,
          notas_recepcion,
          estado,
          fecha_ingreso,
          mecanico_id,
          vehiculos (
            marca,
            modelo,
            anio,
            placas
          ),
          checklist_danos (
            zona_vehiculo,
            tipo_dano,
            url_foto
          )
        `)
        .order('fecha_ingreso', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Cast related vehicle table join correctly
        const formatted = data.map((item: any) => ({
          ...item,
          vehiculos: Array.isArray(item.vehiculos) ? item.vehiculos[0] : item.vehiculos
        })) as BoardOrder[];
        setOrders(formatted);
      } else {
        setOrders(MOCK_ORDERS);
      }
    } catch (err) {
      console.error('Error fetching workshop board, falling back:', err);
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanics = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre')
        .eq('rol', 'Mecánico')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (!error && data) {
        setMechanics(data);
      }
    } catch (err) {
      console.error('Error fetching mechanics:', err);
    }
  };

  // Expose the refresh action to parent component using imperitative handle
  useImperativeHandle(ref, () => ({
    refreshBoard() {
      fetchOrders();
      fetchMechanics();
    }
  }));

  useEffect(() => {
    fetchOrders();
    fetchMechanics();
  }, []);

  // Update order state (move card)
  const handleMoveOrder = async (orderId: string, currentStatus: BoardOrder['estado']) => {
    let nextStatus: BoardOrder['estado'] = 'En Fila';
    if (currentStatus === 'En Fila') nextStatus = 'En Proceso';
    else if (currentStatus === 'En Proceso') nextStatus = 'Listo para Entrega';
    else return; // If already ready, no next status

    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('ordenes_servicio')
        .update({ estado: nextStatus })
        .eq('id', orderId);

      if (error) throw error;

      // --- AUTOMATION: Avisar Auto Listo rule ---
      if (nextStatus === 'Listo para Entrega') {
        try {
          // 1. Check if the rule is active
          const { data: ruleData, error: ruleErr } = await supabase
            .from('reglas_automatizacion')
            .select('activa')
            .eq('id', 'avisar_auto_listo')
            .single();

          if (!ruleErr && ruleData?.activa) {
            // 2. Fetch order details with vehicle and client info
            const { data: orderDetails, error: detailsErr } = await supabase
              .from('ordenes_servicio')
              .select(`
                kilometraje_ingreso,
                vehiculos (
                  marca,
                  modelo,
                  placas,
                  clientes (
                    nombre,
                    telefono
                  )
                )
              `)
              .eq('id', orderId)
              .single();

            if (!detailsErr && orderDetails) {
              const vehicle = Array.isArray(orderDetails.vehiculos) 
                ? orderDetails.vehiculos[0] 
                : orderDetails.vehiculos;
              
              if (vehicle) {
                const client = Array.isArray(vehicle.clientes)
                  ? vehicle.clientes[0]
                  : vehicle.clientes;

                if (client && client.telefono) {
                  // 3. Fetch template
                  const { data: templateData, error: templateErr } = await supabase
                    .from('plantillas_notificacion')
                    .select('contenido')
                    .eq('id', 'auto_listo')
                    .single();

                  if (!templateErr && templateData) {
                    const vehicleName = `${vehicle.marca} ${vehicle.modelo} (${vehicle.placas})`;
                    const message = templateData.contenido
                      .replace('{{cliente}}', client.nombre)
                      .replace('{{vehiculo}}', vehicleName)
                      .replace('{{kilometraje}}', orderDetails.kilometraje_ingreso.toString());

                    // 4. Enqueue notification
                    await supabase
                      .from('cola_notificaciones')
                      .insert({
                        telefono: client.telefono,
                        mensaje: message,
                        estado: 'Pendiente'
                      });
                    console.log('Notificación de auto listo encolada exitosamente');
                  }
                }
              }
            }
          }
        } catch (autoErr) {
          console.error('Error executing automation rule avisar_auto_listo:', autoErr);
        }
      }
      
      // Update local state directly
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado: nextStatus } : o));
    } catch (err) {
      console.error('Error moving order status:', err);
      // Mock update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado: nextStatus } : o));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignMechanic = async (orderId: string, mecanicoId: string) => {
    try {
      const { error } = await supabase
        .from('ordenes_servicio')
        .update({ mecanico_id: mecanicoId })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local state directly
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, mecanico_id: mecanicoId } : o));
    } catch (err) {
      console.error('Error assigning mechanic:', err);
      alert('Error al asignar el mecánico.');
    }
  };

  // Complete/archive order
  const handleArchiveOrder = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('ordenes_servicio')
        .delete() // Deleting represents vehicle checkout from patio in this phase
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error('Error checking out vehicle:', err);
      // Mock update
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } finally {
      setUpdatingId(null);
    }
  };

  const getElapsedTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 0) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `Hace ${diffHours}h ${diffMins % 60}m`;
  };

  // Filter columns
  const enFilaOrders = orders.filter(o => o.estado === 'En Fila');
  const enProcesoOrders = orders.filter(o => o.estado === 'En Proceso');
  const listoOrders = orders.filter(o => o.estado === 'Listo para Entrega');

  const columns = [
    { key: 'En Fila', title: 'En Fila', data: enFilaOrders, badgeStyle: 'bg-neutral-100 text-neutral-800' },
    { key: 'En Proceso', title: 'En Proceso', data: enProcesoOrders, badgeStyle: 'bg-blue-50 text-cova-blue border border-blue-100 font-bold' },
    { key: 'Listo para Entrega', title: 'Listo para Entrega', data: listoOrders, badgeStyle: 'bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold' }
  ] as const;

  return (
    <div className="w-full flex flex-col h-full gap-4">
      {loading ? (
        <div className="py-16 text-center text-xs text-charcoal-light animate-pulse font-medium">
          Cargando tablero operativo...
        </div>
      ) : (
        <div className="flex md:grid overflow-x-auto hide-scrollbar snap-x md:grid-cols-3 gap-5 pb-2">
          {columns.map((col) => (
            <div key={col.key} className="flex-none w-[85vw] md:w-auto snap-center flex flex-col gap-3.5 bg-neutral-50/50 border border-hairline rounded-lg p-3.5 min-h-[500px]">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b-hairline">
                <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  {col.title}
                </span>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${col.badgeStyle}`}>
                  {col.data.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex flex-col gap-2.5 overflow-auto dense-scrollbar flex-1 max-h-[550px]">
                {col.data.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-hairline rounded-lg bg-white/40 flex flex-col items-center justify-center p-4">
                    <Clock className="w-5 h-5 text-neutral-300 mb-1.5" />
                    <p className="text-[10px] font-medium text-neutral-400">Sin vehículos en esta etapa</p>
                  </div>
                ) : (
                  col.data.map((order) => (
                    <div key={order.id} className="panel-card p-3 flex flex-col gap-2 bg-white">
                      {/* Card Header: Plates & Timing */}
                      <div className="flex items-center justify-between">
                        {/* Plates representation resembling Mexican plate style */}
                        <div className="bg-[#E2E8F0] border border-neutral-300 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-charcoal tracking-wide uppercase">
                          {order.vehiculos?.placas}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-charcoal-light/70 font-mono">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>{getElapsedTime(order.fecha_ingreso)}</span>
                        </div>
                      </div>

                      {/* Vehicle Model & Gas */}
                      <div>
                        <h4 className="text-xs font-semibold text-charcoal leading-snug">
                          {order.vehiculos?.marca} {order.vehiculos?.modelo}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 font-mono text-[9px] text-charcoal-light">
                          <span>Año: {order.vehiculos?.anio}</span>
                          <span>•</span>
                          <span>Gasolina: {order.nivel_gasolina}</span>
                          <span>•</span>
                          <span>KM: {order.kilometraje_ingreso.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Notes / Requested Service */}
                      {order.notas_recepcion && (
                        <div className="bg-neutral-50 border border-hairline rounded p-2 text-[10px] text-charcoal-light leading-relaxed font-sans italic max-h-[50px] overflow-hidden text-ellipsis">
                          "{order.notas_recepcion}"
                        </div>
                      )}

                      {/* Damages Badge */}
                      {order.checklist_danos && order.checklist_danos.length > 0 && (
                        <button 
                          onClick={() => setViewingDamagesOrder(order)}
                          className="flex items-center gap-1.5 self-start bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 rounded text-[9px] font-bold mt-1 hover:bg-rose-100 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Daños Registrados ({order.checklist_danos.length})
                        </button>
                      )}

                      {/* Mechanic Assignment */}
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-neutral-400 font-sans">Mecánico Asignado:</span>
                        <select
                          value={order.mecanico_id || ''}
                          onChange={(e) => handleAssignMechanic(order.id, e.target.value)}
                          className="bg-white border border-hairline rounded px-1.5 py-0.5 text-[9px] text-charcoal focus:outline-none focus:border-neutral-400 cursor-pointer font-sans"
                        >
                          <option value="" disabled>Seleccionar...</option>
                          {mechanics.map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* Action trigger button */}
                      <div className="mt-1 pt-2 border-t border-neutral-100 flex justify-end">
                        {order.estado === 'En Fila' && (
                          <button
                            onClick={() => handleMoveOrder(order.id, order.estado)}
                            disabled={updatingId === order.id}
                            className="text-[9px] font-bold bg-white hover:bg-neutral-50 text-charcoal border border-hairline hover:border-neutral-400 rounded px-2.5 py-1.5 transition-all flex items-center gap-1 hover:-translate-y-0.5 shadow-sm active:translate-y-0 cursor-pointer"
                          >
                            {updatingId === order.id ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <ArrowRight className="w-2.5 h-2.5 text-cova-blue" />
                            )}
                            <span>Iniciar Trabajo</span>
                          </button>
                        )}

                        {order.estado === 'En Proceso' && (
                          <button
                            onClick={() => handleMoveOrder(order.id, order.estado)}
                            disabled={updatingId === order.id}
                            className="text-[9px] font-bold bg-cova-blue hover:shadow-md text-ceramic border border-cova-blue rounded px-2.5 py-1.5 transition-all flex items-center gap-1 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                          >
                            {updatingId === order.id ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                            ) : (
                              <Check className="w-2.5 h-2.5 text-white" />
                            )}
                            <span>Terminar Trabajo</span>
                          </button>
                        )}

                        {order.estado === 'Listo para Entrega' && (
                          <button
                            onClick={() => handleArchiveOrder(order.id)}
                            disabled={updatingId === order.id}
                            className="text-[9px] font-bold bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#111111] border border-neutral-300 hover:border-neutral-400 rounded px-2.5 py-1.5 transition-all flex items-center gap-1 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                          >
                            {updatingId === order.id ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Check className="w-2.5 h-2.5 text-cova-blue" />
                            )}
                            <span>Dar Salida</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Galería de Daños */}
      {viewingDamagesOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-hairline bg-neutral-50">
              <h3 className="text-sm font-bold text-charcoal flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Daños en Recepción
              </h3>
              <button 
                onClick={() => setViewingDamagesOrder(null)}
                className="text-neutral-400 hover:text-charcoal transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold text-charcoal">
                  Vehículo: {viewingDamagesOrder.vehiculos?.marca} {viewingDamagesOrder.vehiculos?.modelo} ({viewingDamagesOrder.vehiculos?.placas})
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Revisado el {new Date(viewingDamagesOrder.fecha_ingreso).toLocaleString('es-MX')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto dense-scrollbar">
                {viewingDamagesOrder.checklist_danos?.map((dano, i) => (
                  <div key={i} className="border border-hairline rounded-lg overflow-hidden bg-neutral-50/50 flex flex-col">
                    <div className="p-2 border-b border-hairline">
                      <p className="text-[11px] font-bold text-charcoal">{dano.zona_vehiculo}</p>
                      <p className="text-[9px] font-mono text-rose-600 bg-rose-50 inline-block px-1.5 rounded mt-0.5 uppercase tracking-wide border border-rose-100">{dano.tipo_dano}</p>
                    </div>
                    <div className="flex-1 min-h-[120px] relative bg-neutral-100 flex items-center justify-center">
                      {dano.url_foto ? (
                        <img 
                          src={dano.url_foto} 
                          alt={`Daño en ${dano.zona_vehiculo}`} 
                          className="w-full h-full object-cover absolute inset-0 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(dano.url_foto!, '_blank')}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-400 gap-1.5 p-4 text-center">
                          <ImageIcon className="w-6 h-6 opacity-50" />
                          <span className="text-[9px]">Sin evidencia fotográfica</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

TallerBoard.displayName = 'TallerBoard';
export default TallerBoard;
