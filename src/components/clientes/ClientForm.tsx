"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface ClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClientForm({ onSuccess, onCancel }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    correo: "",
    empresa: "",
    rfc: "",
    fuente_adquisicion: "Local",
    notas_internas: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const supabase = createClient();
    const { error: dbError } = await supabase.from('clientes').insert({
      nombre: formData.nombre,
      telefono: formData.telefono,
      correo: formData.correo,
      empresa: formData.empresa || null,
      rfc: formData.rfc || null,
      fuente_adquisicion: formData.fuente_adquisicion,
      notas_internas: formData.notas_internas || null
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
        
        {/* Datos Personales */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Datos Personales</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClasses}>Nombre Completo</label>
              <input required name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej. Juan Pérez" className={inputClasses} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Teléfono (WhatsApp)</label>
                <input required name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej. 667 123 4567" className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Correo Electrónico (Opcional)</label>
                <input type="email" name="correo" value={formData.correo} onChange={handleChange} placeholder="ejemplo@correo.com" className={inputClasses} />
              </div>
            </div>
          </div>
        </div>

        {/* Datos Extendidos (Opcional) */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2 mt-4">Datos Avanzados (Opcional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Empresa (Flotilla)</label>
              <input name="empresa" value={formData.empresa} onChange={handleChange} placeholder="Ej. Bimbo" className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>RFC</label>
              <input name="rfc" value={formData.rfc} onChange={handleChange} placeholder="Ej. XAXX010101000" className={`${inputClasses} uppercase`} />
            </div>
            <div>
              <label className={labelClasses}>Fuente de Adquisición</label>
              <select name="fuente_adquisicion" value={formData.fuente_adquisicion} onChange={e => setFormData(prev => ({ ...prev, fuente_adquisicion: e.target.value }))} className={inputClasses}>
                <option value="Local">Local (Taller)</option>
                <option value="Telefono">Llamada</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Google">Google Ads</option>
                <option value="Referido">Referido</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClasses}>Notas Internas</label>
            <input name="notas_internas" value={formData.notas_internas} onChange={handleChange} placeholder="Ej. Preferencias del cliente, datos importantes..." className={inputClasses} />
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
          {loading ? "Guardando..." : "Guardar Cliente"}
        </button>
      </div>
    </form>
  );
}
