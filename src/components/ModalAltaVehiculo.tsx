'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Car, Check, Loader2 } from 'lucide-react';

interface ModalAltaVehiculoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicleId: string) => void;
  clienteId: string;
  clienteNombre: string;
}

export default function ModalAltaVehiculo({
  isOpen,
  onClose,
  onSuccess,
  clienteId,
  clienteNombre
}: ModalAltaVehiculoProps) {
  const [loading, setLoading] = useState(false);

  // Form states
  const [placas, setPlacas] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [kilometraje, setKilometraje] = useState<number>(50000);
  const [vin, setVin] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!clienteId) {
        alert('Error: No hay un cliente válido seleccionado.');
        setLoading(false);
        return;
      }

      // Create vehicle linked to the selected client
      const { data: vehicle, error: vErr } = await supabase
        .from('vehiculos')
        .insert({
          cliente_id: clienteId,
          marca: marca.trim(),
          modelo: modelo.trim(),
          anio: anio,
          placas: placas.toUpperCase().trim(),
          vin: vin.trim() || null,
          kilometraje_actual: kilometraje,
          presion_delantera_psi: 32,
          presion_trasera_psi: 32,
          medida_oem: '205/55 R16'
        })
        .select()
        .single();

      if (vErr) throw vErr;

      // Trigger success and pass the new vehicle ID back
      onSuccess(vehicle.id);
      onClose();
    } catch (err: any) {
      console.error('Error in ModalAltaVehiculo:', err);
      alert(`Error al registrar el vehículo: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-hairline rounded-lg w-full max-w-md p-5 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4 font-sans text-xs text-charcoal">
        {/* Header */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-charcoal cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1 border-b-hairline pb-3">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-cova-blue" />
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider font-mono">
              Registrar Auto Adicional
            </h3>
          </div>
          <p className="text-[10px] text-charcoal-light">
            Asociando nuevo vehículo a: <strong className="text-charcoal font-sans">{clienteNombre}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Placas (MX) *
                </label>
                <input
                  type="text"
                  required
                  value={placas}
                  onChange={(e) => setPlacas(e.target.value)}
                  placeholder="Ej. VJS-456-A"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono uppercase"
                />
              </div>

              <div className="relative col-span-2">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ej. Nissan"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="relative col-span-2">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ej. Versa"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Año *
                </label>
                <input
                  type="number"
                  required
                  value={anio}
                  onChange={(e) => setAnio(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Kilometraje de Ingreso *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={kilometraje}
                  onChange={(e) => setKilometraje(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono"
                />
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  VIN (Opcional)
                </label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="Número de serie"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-3 border-t border-hairline mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-50 border border-hairline rounded cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-xs font-semibold text-ceramic bg-cova-blue border border-cova-blue hover:shadow-md rounded cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white" />
              )}
              <span>Guardar y Asignar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
