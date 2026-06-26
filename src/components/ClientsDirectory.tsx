'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  User, 
  Car, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Wrench,
  Edit2,
  X,
  Save,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  kilometraje_actual: number;
}

interface Cotizacion {
  id: string;
  fecha: string;
  total: number;
  estatus: string;
}

interface OrdenServicio {
  id: string;
  fecha_ingreso: string;
  estado: string;
  notas_recepcion: string;
  vehiculo: {
    placas: string;
    marca: string;
    modelo: string;
  };
}

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  fecha_registro: string;
  vehiculos?: Vehiculo[];
}

export default function ClientsDirectory() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected client for profile view
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clientVehicles, setClientVehicles] = useState<Vehiculo[]>([]);
  const [clientQuotes, setClientQuotes] = useState<Cotizacion[]>([]);
  const [clientOrders, setClientOrders] = useState<OrdenServicio[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', telefono: '', correo: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      // Fetch clients and their basic vehicle data for searching by plates
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          vehiculos (
            id, marca, modelo, anio, placas, kilometraje_actual
          )
        `)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClientProfile = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setLoadingProfile(true);
    try {
      // Load vehicles
      const { data: vData, error: vErr } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('marca', { ascending: true });
      if (vErr) throw vErr;
      setClientVehicles(vData || []);

      // Load quotes
      const { data: qData, error: qErr } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('fecha', { ascending: false });
      if (qErr) throw qErr;
      setClientQuotes(qData || []);

      // Load service orders (historial_servicios) via vehicles
      if (vData && vData.length > 0) {
        const vehicleIds = vData.map(v => v.id);
        const { data: oData, error: oErr } = await supabase
          .from('ordenes_servicio')
          .select(`
            *,
            vehiculo:vehiculos ( placas, marca, modelo )
          `)
          .in('vehiculo_id', vehicleIds)
          .order('fecha_ingreso', { ascending: false });
        if (oErr) throw oErr;
        setClientOrders(oData as unknown as OrdenServicio[] || []);
      } else {
        setClientOrders([]);
      }
      
    } catch (err) {
      console.error('Error loading client profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, cliente: Cliente) => {
    e.stopPropagation();
    setEditForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      correo: cliente.correo || ''
    });
    setSelectedCliente(cliente);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCliente) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: editForm.nombre,
          telefono: editForm.telefono,
          correo: editForm.correo
        })
        .eq('id', selectedCliente.id);

      if (error) throw error;
      
      // Update local state
      const updatedCliente = { ...selectedCliente, ...editForm };
      setClientes(prev => prev.map(c => c.id === selectedCliente.id ? { ...c, ...editForm } : c));
      
      if (selectedCliente.id === updatedCliente.id) {
        setSelectedCliente(updatedCliente);
      }
      
      toast.success('Cambios guardados con éxito');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error saving client:', err);
      toast.error('Error al guardar los datos del cliente');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter logic
  const filteredClientes = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    const nameMatch = c.nombre.toLowerCase().includes(term);
    const phoneMatch = c.telefono?.toLowerCase().includes(term);
    const platesMatch = c.vehiculos?.some(v => v.placas.toLowerCase().includes(term));
    return nameMatch || phoneMatch || platesMatch;
  });

  return (
    <div className="flex flex-col md:flex-row gap-5 h-full min-h-[600px]">
      
      {/* Columna Izquierda: Listado de Clientes */}
      <div className="w-full md:w-1/2 lg:w-2/5 panel-card p-0 bg-white flex flex-col h-full border border-hairline overflow-hidden">
        
        {/* Header & Search */}
        <div className="p-4 border-b border-hairline bg-neutral-50/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-cova-blue" />
              Directorio de Clientes
            </h2>
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
              {filteredClientes.length} registros
            </span>
          </div>
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o placas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-hairline rounded bg-white focus:outline-none focus:border-cova-blue transition-colors"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto dense-scrollbar bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-xs text-neutral-400 animate-pulse">Cargando directorio...</span>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <AlertCircle className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-xs text-neutral-500 font-medium">No se encontraron clientes</p>
              <p className="text-[10px] text-neutral-400 mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredClientes.map(cliente => (
                <div 
                  key={cliente.id}
                  onClick={() => loadClientProfile(cliente)}
                  className={`p-4 cursor-pointer hover:bg-neutral-50 transition-colors flex items-center justify-between group ${selectedCliente?.id === cliente.id ? 'bg-blue-50/30 border-l-2 border-l-cova-blue' : 'border-l-2 border-l-transparent'}`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-xs font-bold text-charcoal truncate mb-1">
                      {cliente.nombre}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {cliente.telefono || 'Sin teléfono'}
                      </span>
                      {cliente.vehiculos && cliente.vehiculos.length > 0 && (
                        <span className="flex items-center gap-1 font-mono text-cova-blue">
                          <Car className="w-3 h-3" />
                          {cliente.vehiculos[0].placas}
                          {cliente.vehiculos.length > 1 && ` (+${cliente.vehiculos.length - 1})`}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleEditClick(e, cliente)}
                      className="p-1.5 text-neutral-400 hover:text-cova-blue hover:bg-white rounded border border-transparent hover:border-hairline transition-all shadow-sm"
                      title="Editar contacto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Perfil Completo del Cliente */}
      <div className="w-full md:w-1/2 lg:w-3/5 panel-card p-0 bg-white flex flex-col h-full border border-hairline overflow-hidden">
        {!selectedCliente ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-neutral-50/30">
            <User className="w-12 h-12 text-neutral-200 mb-3" />
            <h3 className="text-sm font-bold text-neutral-400">Selecciona un Cliente</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              Haz clic en un cliente de la lista para ver su perfil completo, vehículos, cotizaciones y servicios.
            </p>
          </div>
        ) : loadingProfile ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-neutral-400 animate-pulse">Cargando perfil...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto dense-scrollbar">
            
            {/* Profile Header */}
            <div className="p-6 border-b border-hairline bg-gradient-to-b from-neutral-50/80 to-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold text-charcoal">{selectedCliente.nombre}</h2>
                  <p className="text-[10px] text-neutral-400 font-mono mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Cliente desde: {new Date(selectedCliente.fecha_registro).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <button 
                  onClick={(e) => handleEditClick(e, selectedCliente)}
                  className="px-3 py-1.5 text-[10px] font-bold text-cova-blue bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs text-charcoal bg-white px-3 py-2 rounded border border-hairline shadow-sm">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {selectedCliente.telefono || <span className="text-neutral-400 italic">No registrado</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-charcoal bg-white px-3 py-2 rounded border border-hairline shadow-sm">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  {selectedCliente.correo || <span className="text-neutral-400 italic">No registrado</span>}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Sección Vehículos */}
              <section>
                <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Car className="w-4 h-4 text-neutral-400" />
                  Vehículos Asociados ({clientVehicles.length})
                </h3>
                {clientVehicles.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No hay vehículos registrados.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clientVehicles.map(vehiculo => (
                      <div key={vehiculo.id} className="p-3 bg-neutral-50 border border-hairline rounded">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-xs text-charcoal">
                            {vehiculo.marca} {vehiculo.modelo}
                          </span>
                          <span className="text-[10px] bg-neutral-200 text-charcoal font-mono px-1.5 rounded font-bold">
                            {vehiculo.placas}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 flex items-center gap-2 mt-2">
                          <span>Año: {vehiculo.anio}</span>
                          <span>•</span>
                          <span>{vehiculo.kilometraje_actual.toLocaleString()} km</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección Historial de Servicios */}
              <section>
                <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-neutral-400" />
                  Historial Clínico de Servicios
                </h3>
                {clientOrders.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No hay servicios registrados en el taller.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Desktop Table */}
                    <div className="hidden md:block border border-hairline rounded overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-hairline">
                            <th className="py-2 px-3 text-[10px] font-bold text-neutral-500 uppercase">Fecha</th>
                            <th className="py-2 px-3 text-[10px] font-bold text-neutral-500 uppercase">Vehículo</th>
                            <th className="py-2 px-3 text-[10px] font-bold text-neutral-500 uppercase">Estado</th>
                            <th className="py-2 px-3 text-[10px] font-bold text-neutral-500 uppercase">Notas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {clientOrders.map(order => {
                            const date = new Date(order.fecha_ingreso).toLocaleDateString('es-MX', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            });
                            
                            let statusColor = 'bg-neutral-100 text-neutral-600';
                            if (order.estado === 'Listo para Entrega') statusColor = 'bg-emerald-50 text-emerald-700';
                            if (order.estado === 'En Proceso') statusColor = 'bg-blue-50 text-cova-blue';
                            
                            return (
                              <tr key={order.id} className="hover:bg-neutral-50/50">
                                <td className="py-2 px-3 text-[11px] text-charcoal font-mono whitespace-nowrap">{date}</td>
                                <td className="py-2 px-3 text-[11px] font-semibold text-charcoal">
                                  {order.vehiculo.marca} {order.vehiculo.modelo} <span className="font-mono text-[9px] text-neutral-400 ml-1">{order.vehiculo.placas}</span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${statusColor}`}>
                                    {order.estado}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-[10px] text-neutral-500 max-w-[200px] truncate" title={order.notas_recepcion}>
                                  {order.notas_recepcion || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden grid grid-cols-1 gap-3">
                      {clientOrders.map(order => {
                        const date = new Date(order.fecha_ingreso).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        });
                        let statusColor = 'bg-neutral-100 text-neutral-600';
                        if (order.estado === 'Listo para Entrega') statusColor = 'bg-emerald-50 text-emerald-700';
                        if (order.estado === 'En Proceso') statusColor = 'bg-blue-50 text-cova-blue';

                        return (
                          <div key={order.id} className="border border-hairline rounded bg-white p-3 flex flex-col gap-2 shadow-sm">
                            <div className="flex justify-between items-center border-b border-hairline pb-2">
                              <span className="text-[11px] text-charcoal font-mono">{date}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${statusColor}`}>
                                {order.estado}
                              </span>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-charcoal">
                                {order.vehiculo.marca} {order.vehiculo.modelo}
                              </p>
                              <p className="text-[9px] font-mono text-neutral-400">{order.vehiculo.placas}</p>
                            </div>
                            {order.notas_recepcion && (
                              <div className="mt-1 pt-2 border-t border-hairline border-dashed">
                                <p className="text-[10px] text-neutral-500 italic">"{order.notas_recepcion}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Sección Cotizaciones Previas */}
              <section>
                <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-neutral-400" />
                  Cotizaciones Previas
                </h3>
                {clientQuotes.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No hay cotizaciones para este cliente.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {clientQuotes.map(quote => {
                      let bgStatus = 'bg-white';
                      if (quote.estatus === 'Pagada') bgStatus = 'bg-emerald-50/30 border-emerald-200';
                      else if (quote.estatus === 'Aceptada') bgStatus = 'bg-blue-50/30 border-blue-200';
                      
                      return (
                        <div key={quote.id} className={`p-3 border border-hairline rounded ${bgStatus}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-neutral-400">
                              {new Date(quote.fecha).toLocaleDateString('es-MX')}
                            </span>
                            <span className="text-[9px] font-bold uppercase px-1.5 rounded bg-white border border-hairline shadow-sm">
                              {quote.estatus}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-charcoal mt-1">
                            ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-hairline bg-neutral-50/50">
              <h3 className="text-sm font-bold text-charcoal flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cova-blue" />
                Editar Datos del Cliente
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-neutral-400 hover:text-charcoal transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input 
                  type="text" 
                  value={editForm.nombre}
                  onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                  className="w-full text-xs p-2 border border-hairline rounded focus:outline-none focus:border-cova-blue bg-white"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Teléfono (WhatsApp)
                </label>
                <input 
                  type="text" 
                  value={editForm.telefono}
                  onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                  className="w-full text-xs p-2 border border-hairline rounded focus:outline-none focus:border-cova-blue bg-white font-mono"
                  placeholder="+52 667 000 0000"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input 
                  type="email" 
                  value={editForm.correo}
                  onChange={e => setEditForm({...editForm, correo: e.target.value})}
                  className="w-full text-xs p-2 border border-hairline rounded focus:outline-none focus:border-cova-blue bg-white"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t border-hairline bg-neutral-50">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-charcoal transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit || !editForm.nombre.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-cova-blue hover:bg-blue-700 rounded transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {savingEdit ? 'Guardando...' : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
