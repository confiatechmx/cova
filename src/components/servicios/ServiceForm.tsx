"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";

export interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
}

interface ServiceFormProps {
  initialData?: Service | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ServiceForm({ initialData, onSuccess, onCancel }: ServiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || "",
    descripcion: initialData?.descripcion || "",
    precio: initialData?.precio?.toString() || "",
    activo: initialData ? initialData.activo : true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precio: parseFloat(formData.precio) || 0,
      activo: formData.activo
    };

    let dbError;
    if (initialData?.id) {
      const { error } = await supabase.from('servicios_taller').update(payload).eq('id', initialData.id);
      dbError = error;
    } else {
      const { error } = await supabase.from('servicios_taller').insert(payload);
      dbError = error;
    }

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
      <div className="p-6 space-y-6 flex-1">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}
        
        <div className="space-y-4">
          <div>
            <label className={labelClasses}>Nombre del Servicio</label>
            <input 
              required 
              name="nombre" 
              value={formData.nombre} 
              onChange={handleChange} 
              placeholder="Ej. Alineación y Balanceo" 
              className={inputClasses} 
            />
          </div>
          
          <div>
            <label className={labelClasses}>Descripción (Opcional)</label>
            <textarea 
              name="descripcion" 
              value={formData.descripcion} 
              onChange={handleChange} 
              placeholder="Ej. Servicio por computadora..." 
              className={`${inputClasses} min-h-[80px] resize-y`} 
            />
          </div>

          <div>
            <label className={labelClasses}>Precio Base (MXN)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-400">$</span>
              <input 
                required 
                type="number" 
                min="0"
                step="0.01"
                name="precio" 
                value={formData.precio} 
                onChange={handleChange} 
                placeholder="0.00" 
                className={`${inputClasses} pl-7 font-mono`} 
              />
            </div>
          </div>
        </div>

        {/* Switches */}
        <div className="space-y-4 pt-2 border-t border-zinc-100">
          <label className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 cursor-pointer hover:bg-zinc-100/50 transition-colors">
            <span className="text-sm font-semibold text-zinc-900">Servicio Activo en POS</span>
            <div className="relative flex items-center h-5">
              <input 
                type="checkbox" 
                name="activo"
                checked={formData.activo}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>
        </div>
      </div>

      <div className="px-6 py-4 bg-white border-t border-zinc-200 flex justify-end gap-3 shrink-0">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Guardando..." : (initialData ? "Actualizar Servicio" : "Guardar Servicio")}
        </button>
      </div>
    </form>
  );
}
