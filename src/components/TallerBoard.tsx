'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, ArrowRight, Check, AlertTriangle, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

export type OrderStatus = 
  | 'En Espera / Recepción' 
  | 'En Diagnóstico' 
  | 'Por Autorizar' 
  | 'En Proceso / Reparación' 
  | 'Por Validar / Control de Calidad' 
  | 'Terminado / Listo para Entrega'
  // Legacy states for backward compatibility
  | 'En Fila' 
  | 'En Proceso' 
  | 'Listo para Entrega';

export interface BoardOrder {
  id: string;
  vehiculo_id: string;
  nivel_gasolina: string;
  kilometraje_ingreso: number;
  notas_recepcion: string;
  estado: OrderStatus;
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

const COLUMNS = [
  'En Espera / Recepción',
  'En Diagnóstico',
  'Por Autorizar',
  'En Proceso / Reparación',
  'Por Validar / Control de Calidad',
  'Terminado / Listo para Entrega'
] as const;

// Helper to normalize legacy statuses into new ones
const normalizeStatus = (status: OrderStatus): typeof COLUMNS[number] => {
  if (status === 'En Fila') return 'En Espera / Recepción';
  if (status === 'En Proceso') return 'En Proceso / Reparación';
  if (status === 'Listo para Entrega') return 'Terminado / Listo para Entrega';
  return status as typeof COLUMNS[number];
};

const MOCK_ORDERS: BoardOrder[] = [
  {
    id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e01',
    vehiculo_id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    nivel_gasolina: '1/4',
    kilometraje_ingreso: 72050,
    notas_recepcion: 'Cliente reporta un rechinido constante al frenar a baja velocidad.',
    estado: 'En Espera / Recepción',
    fecha_ingreso: new Date(Date.now() - 120 * 60000).toISOString(),
    vehiculos: { marca: 'Chevrolet', modelo: 'Aveo', anio: 2018, placas: 'VMY-789-B' }
  },
  {
    id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e02',
    vehiculo_id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    nivel_gasolina: '3/4',
    kilometraje_ingreso: 35080,
    notas_recepcion: 'Montaje de 4 llantas nuevas Goodyear Wrangler y alineación / balanceo.',
    estado: 'En Proceso / Reparación',
    fecha_ingreso: new Date(Date.now() - 240 * 60000).toISOString(),
    vehiculos: { marca: 'Toyota', modelo: 'Hilux', anio: 2021, placas: 'VNZ-123-C' }
  },
  {
    id: '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e03',
    vehiculo_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    nivel_gasolina: '1/2',
    kilometraje_ingreso: 45010,
    notas_recepcion: 'Alineación y Balanceo de rutina. Calibración general de llantas.',
    estado: 'Terminado / Listo para Entrega',
    fecha_ingreso: new Date(Date.now() - 60 * 60000).toISOString(),
    vehiculos: { marca: 'Nissan', modelo: 'Versa', anio: 2020, placas: 'VJS-456-A' }
  }
];

const TallerBoard = forwardRef<TallerBoardRef, {}>((props, ref) => {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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
          vehiculos (marca, modelo, anio, placas),
          checklist_danos (zona_vehiculo, tipo_dano, url_foto)
        `)
        .order('fecha_ingreso', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
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

  const handleMoveOrder = async (orderId: string, currentStatus: OrderStatus) => {
    const normalized = normalizeStatus(currentStatus);
    const currentIndex = COLUMNS.indexOf(normalized);
    if (currentIndex === -1 || currentIndex === COLUMNS.length - 1) return;
    
    const nextStatus = COLUMNS[currentIndex + 1];
    setUpdatingId(orderId);
    
    try {
      const { error } = await supabase
        .from('ordenes_servicio')
        .update({ estado: nextStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Automation Rule Execution
      if (nextStatus === 'Terminado / Listo para Entrega') {
        try {
          const { data: ruleData, error: ruleErr } = await supabase
            .from('reglas_automatizacion')
            .select('activa')
            .eq('id', 'avisar_auto_listo')
            .single();

          if (!ruleErr && ruleData?.activa) {
            const { data: orderDetails, error: detailsErr } = await supabase
              .from('ordenes_servicio')
              .select('kilometraje_ingreso, vehiculos(marca, modelo, placas, clientes(nombre, telefono))')
              .eq('id', orderId)
              .single();

            if (!detailsErr && orderDetails) {
              const vehicle = Array.isArray(orderDetails.vehiculos) ? orderDetails.vehiculos[0] : orderDetails.vehiculos;
              if (vehicle) {
                const client = Array.isArray(vehicle.clientes) ? vehicle.clientes[0] : vehicle.clientes;
                if (client && client.telefono) {
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

                    await supabase
                      .from('cola_notificaciones')
                      .insert({ telefono: client.telefono, mensaje: message, estado: 'Pendiente' });
                  }
                }
              }
            }
          }
        } catch (autoErr) {
          console.error('Error executing automation rule avisar_auto_listo:', autoErr);
        }
      }
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado: nextStatus } : o));
      toast.success('Estado actualizado');
    } catch (err) {
      console.error('Error moving order status:', err);
      toast.error('Error al cambiar el estado de la orden');
      // Mock update to keep UI fluid on errors
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
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, mecanico_id: mecanicoId } : o));
      toast.success('Mecánico asignado');
    } catch (err) {
      console.error('Error assigning mechanic:', err);
      toast.error('Error al asignar el mecánico.');
    }
  };

  const handleArchiveOrder = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('ordenes_servicio')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Vehículo entregado y archivado');
    } catch (err) {
      console.error('Error checking out vehicle:', err);
      toast.error('Error al registrar la salida del vehículo');
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

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <span className="text-sm font-medium text-slate-500 animate-pulse">Cargando tablero operativo...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full">
      {/* Contenedor Principal (Horizontal Scroll) */}
      <div className="flex flex-row overflow-x-auto gap-6 pb-4 items-start h-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {COLUMNS.map((colName) => {
          const colOrders = orders.filter(o => normalizeStatus(o.estado) === colName);
          
          return (
            <div 
              key={colName} 
              className="flex-shrink-0 w-[340px] flex flex-col gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/50 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {colName}
                </h3>
                <span className="text-xs font-semibold tabular-nums text-slate-500 bg-slate-200/50 px-2.5 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex flex-col gap-3">
                {colOrders.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center">
                    <p className="text-xs font-medium text-slate-400">Sin órdenes en esta etapa</p>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-card p-4 rounded-lg shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-50/80 transition-all duration-200 flex flex-col gap-3"
                    >
                      {/* Top row: Badges and ID */}
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100/50 tabular-nums">
                            {order.vehiculos?.placas}
                          </span>
                        </div>
                        <span className="text-[10px] font-normal text-slate-400 tabular-nums uppercase tracking-wider">
                          ID: {order.id.slice(0, 8)}
                        </span>
                      </div>

                      {/* Main Title: Vehicle */}
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 leading-snug">
                          {order.vehiculos?.marca} {order.vehiculos?.modelo} <span className="tabular-nums font-normal text-slate-500">{order.vehiculos?.anio}</span>
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="tabular-nums">{getElapsedTime(order.fecha_ingreso)}</span>
                        </div>
                      </div>

                      {/* Order Metrics / Info */}
                      <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Kilometraje</span>
                          <span className="text-xs font-medium text-slate-700 tabular-nums">{order.kilometraje_ingreso.toLocaleString()} km</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Gasolina</span>
                          <span className="text-xs font-medium text-slate-700 tabular-nums">{order.nivel_gasolina}</span>
                        </div>
                      </div>

                      {/* Reception Notes */}
                      {order.notas_recepcion && (
                        <p className="text-xs text-slate-600 italic line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-md border border-slate-100">
                          "{order.notas_recepcion}"
                        </p>
                      )}

                      {/* Damages Badge */}
                      {order.checklist_danos && order.checklist_danos.length > 0 && (
                        <button 
                          onClick={() => setViewingDamagesOrder(order)}
                          className="inline-flex items-center gap-1.5 self-start rounded-full border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Daños ({order.checklist_danos.length})
                        </button>
                      )}

                      {/* Mechanic & Action */}
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-500">Mecánico:</span>
                          <select
                            value={order.mecanico_id || ''}
                            onChange={(e) => handleAssignMechanic(order.id, e.target.value)}
                            className="bg-transparent border-b border-dashed border-slate-300 text-slate-700 font-medium focus:outline-none focus:border-primary cursor-pointer pb-0.5 text-right w-[120px]"
                          >
                            <option value="" disabled>Asignar...</option>
                            {mechanics.map(m => (
                              <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Action Buttons based on status */}
                        <div className="mt-2 pt-3 border-t border-slate-100 flex justify-end">
                          {colName !== 'Terminado / Listo para Entrega' ? (
                            <button
                              onClick={() => handleMoveOrder(order.id, colName)}
                              disabled={updatingId === order.id}
                              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                              )}
                              <span>Siguiente Fase</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchiveOrder(order.id)}
                              disabled={updatingId === order.id}
                              className="text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Entregar y Cerrar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Galería de Daños */}
      {viewingDamagesOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg shadow-sm border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Daños en Recepción
              </h3>
              <button 
                onClick={() => setViewingDamagesOrder(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-5">
                <p className="text-sm font-medium text-slate-900">
                  {viewingDamagesOrder.vehiculos?.marca} {viewingDamagesOrder.vehiculos?.modelo} <span className="tabular-nums font-normal text-slate-500">({viewingDamagesOrder.vehiculos?.placas})</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="tabular-nums">Revisado el {new Date(viewingDamagesOrder.fecha_ingreso).toLocaleString('es-MX')}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                {viewingDamagesOrder.checklist_danos?.map((dano, i) => (
                  <div key={i} className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm flex flex-col">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-800">{dano.zona_vehiculo}</p>
                      <span className="inline-flex mt-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                        {dano.tipo_dano}
                      </span>
                    </div>
                    <div className="flex-1 min-h-[140px] relative bg-slate-100 flex items-center justify-center">
                      {dano.url_foto ? (
                        <img 
                          src={dano.url_foto} 
                          alt={`Daño en ${dano.zona_vehiculo}`} 
                          className="w-full h-full object-cover absolute inset-0 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(dano.url_foto!, '_blank')}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                          <ImageIcon className="w-6 h-6 opacity-50" />
                          <span className="text-[10px] font-medium">Sin fotografía</span>
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
