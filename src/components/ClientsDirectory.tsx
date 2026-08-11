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
    <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px]">
      
      {/* Columna Izquierda: Listado de Clientes */}
      <div className="w-full md:w-1/2 lg:w-2/5 bg-card rounded-lg shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
        
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" />
              Directorio de Clientes
            </h2>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
              {filteredClientes.length} registros
            </span>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o placas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <span className="text-sm text-slate-400 animate-pulse font-medium">Cargando directorio...</span>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-700">No se encontraron clientes</p>
              <p className="text-xs text-slate-500 mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredClientes.map(cliente => (
                <div 
                  key={cliente.id}
                  onClick={() => loadClientProfile(cliente)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between group ${selectedCliente?.id === cliente.id ? 'bg-slate-50 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-sm font-normal text-slate-700 truncate mb-1">
                      {cliente.nombre}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 tabular-nums text-sm font-medium text-slate-900">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {cliente.telefono || <span className="font-normal text-slate-400 italic text-xs">Sin teléfono</span>}
                      </span>
                      {cliente.vehiculos && cliente.vehiculos.length > 0 && (
                        <span className="flex items-center gap-1.5 tabular-nums text-sm font-medium text-slate-900">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          {cliente.vehiculos[0].placas}
                          {cliente.vehiculos.length > 1 && <span className="text-xs font-normal text-slate-500 ml-1">(+{cliente.vehiculos.length - 1})</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleEditClick(e, cliente)}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-all shadow-sm"
                      title="Editar contacto"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Perfil Completo del Cliente */}
      <div className="w-full md:w-1/2 lg:w-3/5 bg-card rounded-lg shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
        {!selectedCliente ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
            <User className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-base font-semibold text-slate-700">Selecciona un Cliente</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              Haz clic en un cliente de la lista para ver su perfil completo, vehículos, cotizaciones y servicios.
            </p>
          </div>
        ) : loadingProfile ? (
          <div className="flex-1 flex items-center justify-center bg-white">
            <span className="text-sm font-medium text-slate-400 animate-pulse">Cargando perfil...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-white">
            
            {/* Profile Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedCliente.nombre}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Cliente desde: <span className="tabular-nums">{new Date(selectedCliente.fecha_registro).toLocaleDateString('es-MX')}</span>
                  </p>
                </div>
                <button 
                  onClick={(e) => handleEditClick(e, selectedCliente)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors flex items-center gap-2 border border-slate-200 bg-white shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 tabular-nums text-sm font-medium text-slate-900 bg-white px-3 py-2 rounded-md border border-slate-300 shadow-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {selectedCliente.telefono || <span className="text-slate-400 italic text-xs font-normal">No registrado</span>}
                </div>
                <div className="flex items-center gap-2 text-sm font-normal text-slate-700 bg-white px-3 py-2 rounded-md border border-slate-300 shadow-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {selectedCliente.correo || <span className="text-slate-400 italic text-xs">No registrado</span>}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Sección Vehículos */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Car className="w-4 h-4" />
                  Vehículos Asociados ({clientVehicles.length})
                </h3>
                {clientVehicles.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No hay vehículos registrados.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clientVehicles.map(vehiculo => (
                      <div key={vehiculo.id} className="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-normal text-sm text-slate-700">
                            {vehiculo.marca} {vehiculo.modelo}
                          </span>
                          <span className="tabular-nums text-xs font-medium text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                            {vehiculo.placas}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-3">
                          <span className="tabular-nums text-slate-700">Año {vehiculo.anio}</span>
                          <span className="text-slate-300">•</span>
                          <span className="tabular-nums text-slate-700">{vehiculo.kilometraje_actual.toLocaleString()} km</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección Historial de Servicios */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Wrench className="w-4 h-4" />
                  Historial Clínico de Servicios
                </h3>
                {clientOrders.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No hay servicios registrados en el taller.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Desktop Table */}
                    <div className="hidden md:block border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehículo</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {clientOrders.map(order => {
                            const date = new Date(order.fecha_ingreso).toLocaleDateString('es-MX', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            });
                            
                            let statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
                            if (order.estado === 'Listo para Entrega') statusColor = 'bg-success/10 text-success border-success/20';
                            if (order.estado === 'En Proceso') statusColor = 'bg-primary/10 text-primary border-primary/20';
                            
                            return (
                              <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                <td className="py-3 px-4 text-sm text-slate-900 tabular-nums font-medium whitespace-nowrap">{date}</td>
                                <td className="py-3 px-4 text-sm font-normal text-slate-700">
                                  {order.vehiculo.marca} {order.vehiculo.modelo}
                                  <span className="tabular-nums text-sm font-medium text-slate-900 ml-2 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.vehiculo.placas}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-xs px-2 py-1 rounded-md font-medium uppercase tracking-wider border ${statusColor}`}>
                                    {order.estado}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm font-normal text-slate-700 max-w-[200px] truncate" title={order.notas_recepcion}>
                                  {order.notas_recepcion || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards - Styled for consistency */}
                    <div className="md:hidden grid grid-cols-1 gap-3">
                      {clientOrders.map(order => {
                        const date = new Date(order.fecha_ingreso).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        });
                        let statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
                        if (order.estado === 'Listo para Entrega') statusColor = 'bg-success/10 text-success border-success/20';
                        if (order.estado === 'En Proceso') statusColor = 'bg-primary/10 text-primary border-primary/20';

                        return (
                          <div key={order.id} className="border border-slate-200 rounded-md bg-white p-4 shadow-sm">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                              <span className="text-sm font-medium tabular-nums text-slate-900">{date}</span>
                              <span className={`text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider border ${statusColor}`}>
                                {order.estado}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-normal text-slate-700">
                                {order.vehiculo.marca} {order.vehiculo.modelo}
                              </p>
                              <p className="text-sm font-medium tabular-nums text-slate-900 mt-1">{order.vehiculo.placas}</p>
                            </div>
                            {order.notas_recepcion && (
                              <div className="mt-3 pt-3 border-t border-slate-200 border-dashed">
                                <p className="text-sm font-normal text-slate-500 italic">"{order.notas_recepcion}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Cotizaciones */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4" />
                  Cotizaciones Previas
                </h3>
                {clientQuotes.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No hay cotizaciones para este cliente.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientQuotes.map(quote => {
                      let bgStatus = 'bg-white border-slate-200';
                      if (quote.estatus === 'Pagada') bgStatus = 'bg-success/5 border-success/20';
                      else if (quote.estatus === 'Aceptada') bgStatus = 'bg-primary/5 border-primary/20';
                      
                      return (
                        <div key={quote.id} className={`p-4 rounded-md shadow-sm border ${bgStatus}`}>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-medium tabular-nums text-slate-500">
                              {new Date(quote.fecha).toLocaleDateString('es-MX')}
                            </span>
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-sm text-slate-700">
                              {quote.estatus}
                            </span>
                          </div>
                          <div className="text-lg font-medium tabular-nums text-slate-900 mt-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg shadow-sm border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                Editar Datos del Cliente
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Nombre Completo
                </label>
                <input 
                  type="text" 
                  value={editForm.nombre}
                  onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Teléfono (WhatsApp)
                </label>
                <input 
                  type="text" 
                  value={editForm.telefono}
                  onChange={e => setEditForm({...editForm, telefono: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums"
                  placeholder="+52 667 000 0000"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Correo Electrónico
                </label>
                <input 
                  type="email" 
                  value={editForm.correo}
                  onChange={e => setEditForm({...editForm, correo: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit || !editForm.nombre.trim()}
                className="bg-primary hover:bg-primary/90 text-white rounded-md shadow-sm transition-colors px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? 'Guardando...' : (
                  <>
                    <Save className="w-4 h-4" />
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
