"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { ArrowLeft, User, Phone, Mail, Calendar, Car, ClipboardList, Wallet, Tag, Plus, X } from "lucide-react";

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  placas: string | null;
  anio: number;
  vin?: string;
  color?: string;
  kilometraje?: string;
}

interface ServiceOrder {
  id: string;
  estado: string;
  fecha_ingreso: string;
  vehiculo_id: string;
  estatus_pago: string;
  vehiculo?: Vehicle;
  cotizaciones?: any[];
}

interface ClientProfile {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  empresa?: string;
  rfc?: string;
  fuente_adquisicion?: string;
  notas_internas?: string;
  tags: string[];
  vehiculos: Vehicle[];
  creado_en: string;
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!clientId) return;
      
      try {
        // 1. Fetch client and vehicles
        const { data: clientData, error: clientErr } = await supabase
          .from('clientes')
          .select(`
            id, nombre, telefono, correo, empresa, rfc, fuente_adquisicion, notas_internas, tags, creado_en,
            vehiculos (id, marca, modelo, placas, anio, vin, color, kilometraje)
          `)
          .eq('id', clientId)
          .single();
          
        if (clientErr) throw clientErr;
        setClient(clientData as ClientProfile);

        // 2. Fetch service orders for these vehicles
        if (clientData.vehiculos && clientData.vehiculos.length > 0) {
          const vehicleIds = clientData.vehiculos.map((v: any) => v.id);
          const { data: ordersData, error: ordersErr } = await supabase
            .from('ordenes_servicio')
            .select(`
              id, estado, fecha_ingreso, estatus_pago, vehiculo_id,
              cotizaciones (id, total, estado)
            `)
            .in('vehiculo_id', vehicleIds)
            .order('fecha_ingreso', { ascending: false });

          if (ordersErr) throw ordersErr;
          
          // Map vehicle details to orders for easier rendering
          const mappedOrders = ordersData.map((o: any) => ({
            ...o,
            vehiculo: clientData.vehiculos.find((v: any) => v.id === o.vehiculo_id)
          }));
          
          setOrders(mappedOrders);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [clientId]);

  // Calculations for Financials
  const calculateLTV = () => {
    let ltv = 0;
    orders.forEach(o => {
      if (o.estatus_pago === 'Pagado' && o.cotizaciones) {
        const approvedQuote = o.cotizaciones.find((c: any) => c.estado === 'Aprobada');
        if (approvedQuote) ltv += Number(approvedQuote.total);
      }
    });
    return ltv;
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || !client) return;
    
    const updatedTags = [...(client.tags || []), newTag.trim().toLowerCase()];
    
    // Optimistic Update
    setClient({ ...client, tags: updatedTags });
    setNewTag("");
    setIsAddingTag(false);

    await supabase.from('clientes').update({ tags: updatedTags }).eq('id', client.id);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!client) return;
    const updatedTags = (client.tags || []).filter(t => t !== tagToRemove);
    
    setClient({ ...client, tags: updatedTags });
    await supabase.from('clientes').update({ tags: updatedTags }).eq('id', client.id);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500">Cliente no encontrado.</p>
        <button onClick={() => router.push('/clientes')} className="text-blue-600 hover:underline">Volver al directorio</button>
      </div>
    );
  }

  const ltv = calculateLTV();

  return (
    <div className="h-full flex flex-col relative max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.push('/clientes')}
          className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            {client.nombre}
            <div className="flex items-center gap-2 flex-wrap ml-2">
              {client.tags && client.tags.map((tag, idx) => (
                <span key={idx} className="group bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-purple-900">
                    <X size={10} />
                  </button>
                </span>
              ))}
              
              {isAddingTag ? (
                <form onSubmit={handleAddTag} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    autoFocus
                    placeholder="Nueva etiqueta..."
                    className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-purple-200 focus:outline-none focus:border-purple-400 bg-white w-28"
                  />
                  <button type="button" onClick={() => setIsAddingTag(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={12} />
                  </button>
                </form>
              ) : (
                <button 
                  onClick={() => setIsAddingTag(true)}
                  className="bg-zinc-100 text-zinc-400 border border-dashed border-zinc-300 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 hover:text-zinc-600 transition-colors flex items-center gap-1"
                >
                  <Plus size={10} /> Añadir
                </button>
              )}
            </div>
          </h1>
          <p className="text-sm font-light text-zinc-500 mt-1">Expediente Clínico del Cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Contact Info Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm col-span-1">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User size={16} className="text-blue-500" /> Información de Contacto
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-zinc-400" />
              <span className="text-zinc-700">{client.telefono || 'Sin teléfono'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-zinc-400" />
              <span className="text-zinc-700">{client.correo || 'Sin correo'}</span>
            </div>
            {client.empresa && (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Empresa</span>
                <span className="text-zinc-700 font-medium">{client.empresa}</span>
              </div>
            )}
            {client.rfc && (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded uppercase">RFC</span>
                <span className="text-zinc-700 font-mono text-xs">{client.rfc}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-zinc-400 pt-2 border-t border-zinc-100">
              <Calendar size={16} />
              <span>Cliente desde {new Date(client.creado_en).toLocaleDateString()}</span>
            </div>
            {client.fuente_adquisicion && (
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                <span>Fuente de adquisición: <span className="text-blue-600">{client.fuente_adquisicion}</span></span>
              </div>
            )}
            {client.notas_internas && (
              <div className="mt-2 p-3 bg-yellow-50/50 border border-yellow-100 rounded-xl text-xs text-yellow-800">
                <span className="font-bold block mb-1">Notas Internas:</span>
                {client.notas_internas}
              </div>
            )}
          </div>
        </div>

        {/* Financials Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm col-span-1">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wallet size={16} className="text-emerald-500" /> Valor Financiero (LTV)
          </h3>
          <div className="flex flex-col justify-center h-20">
            <span className="text-3xl font-black text-zinc-900">
              ${ltv.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">Ingresos Pagados</span>
          </div>
        </div>

        {/* Vehicles Summary Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm col-span-1">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Car size={16} className="text-zinc-500" /> Flotilla
          </h3>
          <div className="flex flex-col gap-3">
            {client.vehiculos && client.vehiculos.length > 0 ? (
              client.vehiculos.map(v => (
                <div key={v.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-800">{v.marca} {v.modelo}</span>
                    <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200 font-bold">{v.placas || 'S/P'}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 font-medium">
                    <div className="flex flex-col">
                      <span className="uppercase text-zinc-400">Año</span>
                      <span className="text-zinc-700">{v.anio || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="uppercase text-zinc-400">VIN</span>
                      <span className="text-zinc-700 uppercase">{v.vin || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="uppercase text-zinc-400">Color</span>
                      <span className="text-zinc-700 capitalize">{v.color || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="uppercase text-zinc-400">Km</span>
                      <span className="text-zinc-700">{v.kilometraje ? `${v.kilometraje} km` : '-'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-sm text-zinc-500 italic">No tiene vehículos registrados</span>
            )}
          </div>
        </div>
      </div>

      {/* Service Orders History */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList size={16} className="text-purple-500" /> Historial de Órdenes de Servicio
          </h3>
        </div>
        
        <div className="flex-1 overflow-auto">
          {orders.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50/90 sticky top-0 border-b border-zinc-100">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Vehículo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Estado Operativo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pago</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  let total = 0;
                  if (order.cotizaciones) {
                    const approved = order.cotizaciones.find(c => c.estado === 'Aprobada');
                    if (approved) total = Number(approved.total);
                  }

                  let statusBadge = "bg-zinc-100 text-zinc-600";
                  if (order.estado === 'Entregado') statusBadge = "bg-green-100 text-green-700";
                  if (order.estado === 'En Progreso') statusBadge = "bg-blue-100 text-blue-700";
                  if (order.estado === 'Listo') statusBadge = "bg-purple-100 text-purple-700";

                  let paymentBadge = "bg-zinc-100 text-zinc-600";
                  if (order.estatus_pago === 'Pagado') paymentBadge = "bg-emerald-100 text-emerald-700";
                  if (order.estatus_pago === 'Pendiente') paymentBadge = "bg-red-100 text-red-700";

                  return (
                    <tr key={order.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                      <td className="px-5 py-3 text-sm text-zinc-600">{new Date(order.fecha_ingreso).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-zinc-800">
                        {order.vehiculo?.marca} {order.vehiculo?.modelo}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
                          {order.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${paymentBadge}`}>
                          {order.estatus_pago}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-zinc-900 text-right">
                        ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <ClipboardList size={32} className="text-zinc-300 mb-3" />
              <p className="text-sm font-medium text-zinc-500">No hay órdenes de servicio previas para este cliente.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
