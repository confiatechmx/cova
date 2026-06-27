"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";

interface TireFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TireForm({ onSuccess, onCancel }: TireFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    marca: "",
    modelo_llanta: "",
    ancho: "",
    perfil: "",
    rin: "",
    indice_carga_velocidad: "",
    tipo_terreno: "HT",
    stock_actual: "0",
    stock_minimo: "0",
    precio_venta: "0.00"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const { error: dbError } = await supabase.from('inventario_llantas').insert({
      marca: formData.marca,
      modelo_llanta: formData.modelo_llanta,
      ancho: parseInt(formData.ancho),
      perfil: parseInt(formData.perfil),
      rin: parseInt(formData.rin),
      indice_carga_velocidad: formData.indice_carga_velocidad,
      tipo_terreno: formData.tipo_terreno,
      stock_actual: parseInt(formData.stock_actual),
      stock_minimo: parseInt(formData.stock_minimo),
      precio_venta: parseFloat(formData.precio_venta),
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="p-6 space-y-7 flex-1">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}
        
        {/* Identificación */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Identificación de la Llanta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Marca</label>
              <input required name="marca" value={formData.marca} onChange={handleChange} placeholder="Ej. Michelin" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Modelo</label>
              <input required name="modelo_llanta" value={formData.modelo_llanta} onChange={handleChange} placeholder="Ej. Primacy 4" className={inputClasses} />
            </div>
          </div>
        </div>

        {/* Medidas (Compact Grid) */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Especificaciones (Nomenclatura)</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClasses}>Ancho</label>
              <input required type="number" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="205" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Perfil</label>
              <input required type="number" name="perfil" value={formData.perfil} onChange={handleChange} placeholder="55" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Rin (R)</label>
              <input required type="number" name="rin" value={formData.rin} onChange={handleChange} placeholder="16" className={inputClasses} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
              <label className={labelClasses}>Índice (Carga/Vel)</label>
              <input required name="indice_carga_velocidad" value={formData.indice_carga_velocidad} onChange={handleChange} placeholder="Ej. 91V" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Tipo de Terreno</label>
              <select required name="tipo_terreno" value={formData.tipo_terreno} onChange={handleChange} className={inputClasses}>
                <option value="HT">HT (Highway / Carretera)</option>
                <option value="AT">AT (All Terrain / Mixto)</option>
                <option value="MT">MT (Mud Terrain / Lodo)</option>
                <option value="All Season">All Season</option>
                <option value="Passenger">Passenger</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inventario y Precio */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Inventario y Finanzas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Stock Inicial</label>
              <input required type="number" min="0" name="stock_actual" value={formData.stock_actual} onChange={handleChange} className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Precio de Venta ($)</label>
              <input required type="number" step="0.01" min="0" name="precio_venta" value={formData.precio_venta} onChange={handleChange} className={inputClasses} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-6 py-4 bg-white border-t border-zinc-200 flex justify-end gap-3 shrink-0">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-sm">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Guardando..." : "Guardar Llanta"}
        </button>
      </div>
    </form>
  );
}
