"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trash2 } from "lucide-react";

interface VehicleFormProps {
  clientId: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VehicleForm({ clientId, initialData, onSuccess, onCancel }: VehicleFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    marca: initialData?.marca || "",
    modelo: initialData?.modelo || "",
    anio: initialData?.anio?.toString() || "",
    placas: initialData?.placas || "",
    vin: initialData?.vin || "",
    color: initialData?.color || "",
    kilometraje_actual: initialData?.kilometraje_actual?.toString() || "0"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const payload = {
      cliente_id: clientId,
      marca: formData.marca,
      modelo: formData.modelo,
      anio: parseInt(formData.anio),
      placas: formData.placas ? formData.placas.replace(/\s+/g, '-') : null,
      vin: formData.vin,
      color: formData.color,
      kilometraje_actual: parseInt(formData.kilometraje_actual)
    };

    let dbError;
    const supabase = createClient();
    if (initialData?.id) {
      const { error } = await supabase.from('vehiculos').update(payload).eq('id', initialData.id);
      dbError = error;
    } else {
      const { error } = await supabase.from('vehiculos').insert(payload);
      dbError = error;
    }

    setLoading(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      onSuccess();
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar este vehículo?")) return;
    
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: dbError } = await supabase.from('vehiculos').delete().eq('id', initialData.id);
    setLoading(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      onSuccess();
    }
  };

  const inputClasses = "border border-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-white text-sm p-2.5 w-full transition-all text-zinc-800 shadow-sm outline-none";
  const labelClasses = "block text-xs font-semibold text-zinc-600 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="p-6 space-y-7 flex-1">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}
        
        {/* Identificación del Vehículo */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Identificación del Vehículo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Marca</label>
              <input required name="marca" value={formData.marca} onChange={handleChange} placeholder="Ej. NISSAN" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Modelo</label>
              <input required name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Ej. VERSA" className={inputClasses} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className={labelClasses}>Año</label>
              <input required type="number" name="anio" value={formData.anio} onChange={(e) => setFormData(prev => ({ ...prev, anio: e.target.value }))} placeholder="Ej. 2021" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Placas (Opcional)</label>
              <input name="placas" value={formData.placas} onChange={handleChange} placeholder="Ej. VJS-456-A" className={inputClasses} />
            </div>
          </div>
        </div>

        {/* Detalles Técnicos */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Detalles Técnicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClasses}>VIN (Número de Serie) - Opcional</label>
              <input name="vin" value={formData.vin} onChange={handleChange} placeholder="17 caracteres..." className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Color (Opcional)</label>
              <input name="color" value={formData.color} onChange={handleChange} placeholder="Ej. Rojo" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Kilometraje Actual</label>
              <input required type="number" min="0" name="kilometraje_actual" value={formData.kilometraje_actual} onChange={(e) => setFormData(prev => ({ ...prev, kilometraje_actual: e.target.value }))} className={inputClasses} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-6 py-4 bg-white border-t border-zinc-200 flex justify-between gap-3 shrink-0 items-center">
        <div>
          {initialData?.id && (
            <button type="button" onClick={handleDelete} disabled={loading} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-50">
              <Trash2 size={18} />
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Guardando..." : (initialData ? "Actualizar Vehículo" : "Guardar Vehículo")}
          </button>
        </div>
      </div>
    </form>
  );
}
