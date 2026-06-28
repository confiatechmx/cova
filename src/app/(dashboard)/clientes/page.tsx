"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Phone, Mail, Car, Tag } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Modal } from "../../../components/ui/Modal";
import { ClientForm } from "../../../components/clientes/ClientForm";
import { VehicleForm } from "../../../components/clientes/VehicleForm";

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  placas: string | null;
  anio: number;
  vin: string | null;
  kilometraje_actual: number;
}

interface Client {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  fechaRegistro: string;
  tags: string[];
  vehiculos: Vehicle[];
}

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-100 last:border-0 animate-pulse">
      <td className="px-5 py-3 align-middle">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 bg-zinc-200 rounded w-32" />
          <div className="h-3 bg-zinc-200 rounded w-20" />
        </div>
      </td>
      <td className="px-5 py-3 align-middle">
        <div className="flex flex-col gap-2">
          <div className="h-3 bg-zinc-200 rounded w-24" />
          <div className="h-3 bg-zinc-200 rounded w-32" />
        </div>
      </td>
      <td className="px-5 py-3 align-middle"><div className="h-5 bg-zinc-200 rounded-lg w-48" /></td>
    </tr>
  );
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  async function fetchClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        id,
        nombre,
        telefono,
        correo,
        fecha_registro,
        tags,
        vehiculos (
          id,
          marca,
          modelo,
          placas,
          anio,
          vin,
          kilometraje_actual
        )
      `)
      .order('fecha_registro', { ascending: false });
    
    if (error) {
      console.error('Error fetching clients:', error);
    } else if (data) {
      const formatted: Client[] = data.map((d: any) => ({
        id: d.id,
        nombre: d.nombre,
        telefono: d.telefono || "Sin teléfono",
        correo: d.correo || "Sin correo",
        fechaRegistro: new Date(d.fecha_registro).toLocaleDateString("es-MX", { year: 'numeric', month: 'short', day: 'numeric' }),
        tags: d.tags || [],
        vehiculos: d.vehiculos || [],
      }));
      setClients(formatted);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter((client: Client) => {
    const query = searchQuery.toLowerCase();
    const matchName = client.nombre.toLowerCase().includes(query);
    const matchPhone = client.telefono.toLowerCase().includes(query);
    const matchVehicle = client.vehiculos.some((v: Vehicle) => v.placas?.toLowerCase().includes(query) || v.marca.toLowerCase().includes(query) || v.modelo.toLowerCase().includes(query));
    return matchName || matchPhone || matchVehicle;
  });

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4 sm:gap-0 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Directorio de Clientes</h1>
          <p className="text-sm font-light text-zinc-500 mt-1">Gestiona el contacto de tus clientes y sus vehículos registrados.</p>
        </div>
        <button 
          onClick={() => setIsClientModalOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          Agregar Cliente
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="panel-card p-3 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-80 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-zinc-400" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por nombre, teléfono o placas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-zinc-200/80 rounded-md bg-zinc-50/50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-blue-500 sm:text-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="panel-card overflow-hidden flex-1 flex flex-col bg-zinc-50/50 md:bg-white">
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto flex-1 dense-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm z-10 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase min-w-[200px]">Cliente</th>
                <th className="hidden md:table-cell px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase min-w-[220px]">Datos de Contacto</th>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase min-w-[300px]">Vehículos Registrados</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client: Client) => (
                  <tr 
                    key={client.id} 
                    onClick={() => router.push(`/clientes/${client.id}`)}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-zinc-900 text-sm tracking-tight">{client.nombre}</span>
                        <div className="flex md:hidden items-center gap-1.5 text-[11px] font-medium text-zinc-600 mt-0.5">
                          <Phone size={11} className="text-zinc-400" />
                          {client.telefono}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-medium text-zinc-500">Reg: {client.fechaRegistro}</span>
                          {client.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {client.tags.slice(0, 2).map((tag: string, idx: number) => (
                                <span key={idx} className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                  {tag}
                                </span>
                              ))}
                              {client.tags.length > 2 && (
                                <span className="text-[9px] text-zinc-400 font-bold">+{client.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-5 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                          <Phone size={13} className="text-zinc-400" />
                          {client.telefono}
                        </div>
                        {client.correo !== "Sin correo" && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                            <Mail size={13} className="text-zinc-400" />
                            {client.correo}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2 items-center">
                        {client.vehiculos.length > 0 ? (
                          client.vehiculos.map((v: Vehicle) => (
                            <div 
                              key={v.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClientId(client.id);
                                setSelectedVehicle(v);
                                setIsVehicleModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md border border-zinc-200/60 shadow-sm cursor-pointer hover:bg-zinc-200 hover:border-zinc-300 transition-colors"
                              title="Editar vehículo"
                            >
                              <Car size={13} className="text-zinc-400" />
                              <span className="text-[11px] font-semibold tracking-wide">
                                {v.marca} {v.modelo} 
                                {v.placas && (
                                  <>
                                    <span className="opacity-40 px-1">•</span>
                                    <span className="font-mono">{v.placas}</span>
                                  </>
                                )}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400 italic">Sin vehículos registrados</span>
                        )}
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                            setSelectedVehicle(null);
                            setIsVehicleModalOpen(true);
                          }}
                          className="flex items-center justify-center h-6 w-6 rounded border border-dashed border-zinc-300 text-zinc-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Añadir vehículo a este cliente"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-zinc-500 text-sm">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
             <div className="p-4 text-center text-zinc-500 text-sm">Cargando clientes...</div>
          ) : filteredClients.length > 0 ? (
             filteredClients.map((client: Client) => (
                <div key={client.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-3">
                   <div className="flex justify-between items-start">
                     <div className="flex flex-col">
                       <span className="font-bold text-zinc-900 text-base">{client.nombre}</span>
                       <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mt-1">
                          <Phone size={12} className="text-zinc-400" /> {client.telefono}
                       </div>
                     </div>
                     <button onClick={() => router.push(`/clientes/${client.id}`)} className="text-blue-600 font-bold text-[11px] uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">Ver Perfil</button>
                   </div>
                   
                   {/* Vehiculos (Mobile) */}
                   <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-100">
                     {client.vehiculos.map((v: Vehicle) => (
                       <span 
                          key={v.id} 
                          onClick={() => { setSelectedClientId(client.id); setSelectedVehicle(v); setIsVehicleModalOpen(true); }} 
                          className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold px-2.5 py-1 rounded-md cursor-pointer hover:bg-zinc-200 transition-colors"
                       >
                         {v.placas ? `${v.placas} - ${v.marca}` : v.marca}
                       </span>
                     ))}
                     <button 
                        onClick={() => { setSelectedClientId(client.id); setSelectedVehicle(null); setIsVehicleModalOpen(true); }} 
                        className="flex items-center justify-center gap-1 bg-zinc-50 hover:bg-zinc-100 transition-colors border border-dashed border-zinc-300 text-zinc-500 px-2.5 py-1 rounded-md text-[11px] font-bold"
                     >
                        <Plus size={12} /> Auto
                     </button>
                   </div>
                </div>
             ))
          ) : (
             <div className="p-4 text-center text-zinc-500 text-sm">No se encontraron clientes.</div>
          )}
        </div>
      </div>

      {/* Modal for New Client */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Agregar Nuevo Cliente"
        description="Registra la información de contacto de un nuevo cliente."
      >
        <ClientForm 
          onSuccess={() => {
            setIsClientModalOpen(false);
            fetchClients();
          }}
          onCancel={() => setIsClientModalOpen(false)}
        />
      </Modal>

      {/* Modal for New/Edit Vehicle */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setSelectedClientId(null);
          setSelectedVehicle(null);
        }}
        title={selectedVehicle ? "Editar Vehículo" : "Registrar Vehículo"}
        description={selectedVehicle ? "Modifica los datos del automóvil o elimínalo del registro." : "Añade un nuevo automóvil al perfil del cliente seleccionado."}
      >
        {selectedClientId && (
          <VehicleForm 
            clientId={selectedClientId}
            initialData={selectedVehicle}
            onSuccess={() => {
              setIsVehicleModalOpen(false);
              setSelectedClientId(null);
              setSelectedVehicle(null);
              fetchClients();
            }}
            onCancel={() => {
              setIsVehicleModalOpen(false);
              setSelectedClientId(null);
              setSelectedVehicle(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
