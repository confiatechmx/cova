"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Wrench, Edit, Percent } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Modal } from "../../../components/ui/Modal";
import { ServiceForm, Service } from "../../../components/servicios/ServiceForm";

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-100 last:border-0 animate-pulse">
      <td className="px-5 py-4 align-middle">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 bg-zinc-200 rounded w-48" />
          <div className="h-3 bg-zinc-200 rounded w-64" />
        </div>
      </td>
      <td className="px-5 py-4 align-middle text-right"><div className="h-4 bg-zinc-200 rounded w-20 ml-auto" /></td>
      <td className="px-5 py-4 align-middle text-center"><div className="h-4 bg-zinc-200 rounded w-8 mx-auto" /></td>
    </tr>
  );
}

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchServices() {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios_taller')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) {
      console.error('Error fetching services:', error);
    } else if (data) {
      setServices(data as Service[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchServices();
  }, []);

  const handleToggleActive = async (srv: Service) => {
    const nextActive = !srv.activo;
    
    // Optimistic UI update
    setServices(prev => prev.map(s => s.id === srv.id ? { ...s, activo: nextActive } : s));
    
    const { error } = await supabase
      .from('servicios_taller')
      .update({ activo: nextActive })
      .eq('id', srv.id);
      
    if (error) {
      // Revert if error
      setServices(prev => prev.map(s => s.id === srv.id ? { ...s, activo: srv.activo } : s));
      console.error(error);
    }
  };

  const filteredServices = services.filter(srv => {
    const query = searchQuery.toLowerCase();
    return srv.nombre.toLowerCase().includes(query) || (srv.descripcion && srv.descripcion.toLowerCase().includes(query));
  });

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4 sm:gap-0 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Catálogo de Servicios</h1>
          <p className="text-sm font-light text-zinc-500 mt-1">Configura los trabajos de mecánica, precios base y promociones.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedService(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo Servicio
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="panel-card p-3 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 w-full overflow-hidden">
        <div className="relative w-full md:w-80 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-zinc-400" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nombre o descripción..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-1.5 border border-zinc-200/80 rounded-md bg-zinc-50/50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-blue-500 sm:text-sm transition-all"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="panel-card overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 dense-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm z-10 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase min-w-[250px]">Servicio</th>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase text-right">Precio Base</th>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase text-center w-24">Activo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filteredServices.length > 0 ? (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors group">
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col">
                        <span 
                          onClick={() => {
                            setSelectedService(srv);
                            setIsModalOpen(true);
                          }}
                          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer text-sm tracking-tight flex items-center gap-1.5"
                        >
                          {srv.nombre}
                        </span>
                        {srv.descripcion && (
                          <span className="text-[11px] font-medium text-zinc-500 mt-1 max-w-md line-clamp-2 leading-relaxed">
                            {srv.descripcion}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-right">
                      <span className="font-mono text-sm font-semibold text-zinc-900">
                        ${srv.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-center">
                      <label className="relative inline-flex items-center justify-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={srv.activo}  
                          onChange={() => handleToggleActive(srv)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 text-sm">
                    No se encontraron servicios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for New/Edit Service */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedService ? "Editar Servicio" : "Registrar Nuevo Servicio"}
        description="Ajusta los datos del servicio. Los cambios afectarán solo a las nuevas órdenes y cotizaciones."
      >
        <ServiceForm 
          initialData={selectedService}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchServices();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
