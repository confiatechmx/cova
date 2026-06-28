"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, Car, User } from "lucide-react";

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  placas: string | null;
}

interface Client {
  id: string;
  nombre: string;
  vehiculos: Vehicle[];
}

interface OrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState("");
  
  const [clients, setClients] = useState<Client[]>([]);
  
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  
  const [formData, setFormData] = useState({
    kilometraje_ingreso: "",
    nivel_gasolina: "1/2",
    notas_recepcion: ""
  });

  useEffect(() => {
    async function loadClients() {
      setFetchingData(true);
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id, 
          nombre, 
          vehiculos (id, marca, modelo, placas)
        `)
        .order('nombre', { ascending: true });
        
      if (!error && data) {
        setClients(data as Client[]);
      }
      setFetchingData(false);
    }
    loadClients();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      setError("Debes seleccionar un vehículo para crear la orden.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    const { error: dbError } = await supabase.from('ordenes_servicio').insert({
      vehiculo_id: selectedVehicleId,
      nivel_gasolina: formData.nivel_gasolina,
      kilometraje_ingreso: parseInt(formData.kilometraje_ingreso) || 0,
      notas_recepcion: formData.notas_recepcion,
      estado: 'Citas del Día'
    });

    setLoading(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      onSuccess();
    }
  };

  const inputClasses = "border border-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-white text-sm p-2.5 w-full transition-all text-zinc-800 shadow-sm outline-none";
  const labelClasses = "block text-xs font-semibold text-zinc-600 mb-1.5";

  // Encontrar vehículos del cliente seleccionado
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const availableVehicles = selectedClient?.vehiculos || [];

  if (fetchingData) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <p className="text-sm">Cargando base de clientes...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh] sm:max-h-[80vh]">
      <div className="p-6 space-y-7 flex-1 overflow-y-auto dense-scrollbar">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}
        
        {/* Sección: Selección de Cliente y Vehículo */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
            <User size={16} className="text-blue-600" /> Identificación
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className={labelClasses}>Cliente Registrado</label>
              <select 
                required 
                value={selectedClientId} 
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedVehicleId(""); // Resetear vehículo al cambiar de cliente
                }}
                className={inputClasses}
              >
                <option value="" disabled>Selecciona un cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              {clients.length === 0 && <p className="text-xs text-amber-600 mt-1">No hay clientes registrados en el sistema.</p>}
            </div>

            <div>
              <label className={labelClasses}>Vehículo a ingresar</label>
              <select 
                required 
                disabled={!selectedClientId || availableVehicles.length === 0}
                value={selectedVehicleId} 
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className={inputClasses}
              >
                <option value="" disabled>
                  {!selectedClientId 
                    ? "Primero selecciona un cliente" 
                    : availableVehicles.length === 0 
                      ? "Este cliente no tiene vehículos registrados" 
                      : "Selecciona un vehículo..."}
                </option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} {v.placas ? `(${v.placas})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sección: Datos de Recepción */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
            <Car size={16} className="text-blue-600" /> Check-in del Vehículo
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Kilometraje de Ingreso</label>
              <input 
                required 
                type="number" 
                min="0"
                name="kilometraje_ingreso" 
                value={formData.kilometraje_ingreso} 
                onChange={handleChange} 
                placeholder="Ej. 45000" 
                className={inputClasses} 
              />
            </div>
            <div>
              <label className={labelClasses}>Nivel de Gasolina</label>
              <select 
                required 
                name="nivel_gasolina" 
                value={formData.nivel_gasolina} 
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="Vacío">Vacío</option>
                <option value="1/4">1/4</option>
                <option value="1/2">1/2</option>
                <option value="3/4">3/4</option>
                <option value="Lleno">Lleno</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className={labelClasses}>Falla Reportada o Notas de Recepción</label>
            <textarea 
              name="notas_recepcion" 
              value={formData.notas_recepcion} 
              onChange={handleChange} 
              placeholder="Ej. Cliente reporta ruido al frenar..." 
              className={`${inputClasses} min-h-[80px] resize-y`} 
            />
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-6 py-4 bg-white border-t border-zinc-200 flex justify-end gap-3 shrink-0">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !selectedVehicleId} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Creando..." : "Crear Orden"}
        </button>
      </div>
    </form>
  );
}
