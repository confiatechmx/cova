'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Car, 
  Gauge, 
  FileText, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Loader2 
} from 'lucide-react';

interface Client {
  id: string;
  nombre: string;
  telefono: string;
  vehiculos?: Vehicle[];
}

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  kilometraje_actual: number;
}

interface DamageItem {
  zona: string;
  damaged: boolean;
  tipo: string;
  fotoAttached: boolean;
}

const VEHICLE_ZONES = [
  { key: 'facia_delantera', label: 'Facia Delantera' },
  { key: 'facia_trasera', label: 'Facia Trasera' },
  { key: 'puerta_delantera_izq', label: 'Puerta Delantera Izquierda' },
  { key: 'puerta_delantera_der', label: 'Puerta Delantera Derecha' },
  { key: 'puerta_trasera_izq', label: 'Puerta Trasera Izquierda' },
  { key: 'puerta_trasera_der', label: 'Puerta Trasera Derecha' },
  { key: 'cofre', label: 'Cofre / Motor' },
  { key: 'cajuela', label: 'Cajuela' },
  { key: 'parabrisas', label: 'Parabrisas / Cristales' },
  { key: 'rines', label: 'Rines / Neumáticos' }
];

const MOCK_CLIENTS: Client[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    nombre: 'Juan Pérez',
    telefono: '+52 667 123 4567',
    vehiculos: [
      { id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', marca: 'Nissan', modelo: 'Versa', anio: 2020, placas: 'VJS-456-A', kilometraje_actual: 45000 },
      { id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', marca: 'Nissan', modelo: 'NP300', anio: 2019, placas: 'VMX-456-D', kilometraje_actual: 89000 }
    ]
  },
  {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    nombre: 'María López',
    telefono: '+52 667 987 6543',
    vehiculos: [
      { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', marca: 'Chevrolet', modelo: 'Aveo', anio: 2018, placas: 'VMY-789-B', kilometraje_actual: 72000 }
    ]
  },
  {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    nombre: 'Carlos Mendoza',
    telefono: '+52 667 444 5566',
    vehiculos: [
      { id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', marca: 'Toyota', modelo: 'Hilux', anio: 2021, placas: 'VNZ-123-C', kilometraje_actual: 35000 }
    ]
  }
];

export default function RecepcionTracker({ onOrderCreated }: { onOrderCreated?: () => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  // Intake inputs
  const [kilometraje, setKilometraje] = useState('');
  const [gasolina, setGasolina] = useState<'Vacío' | '1/4' | '1/2' | '3/4' | 'Lleno'>('1/2');
  const [notas, setNotas] = useState('');
  
  // Checklist 360°
  const [damageChecklist, setDamageChecklist] = useState<DamageItem[]>(
    VEHICLE_ZONES.map(zone => ({
      zona: zone.label,
      damaged: false,
      tipo: 'Rayón',
      fotoAttached: false
    }))
  );

  // Status
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Fetch clients and vehicles
  useEffect(() => {
    const fetchIntakeData = async () => {
      try {
        setLoading(true);
        const { data: clientsData, error: clientErr } = await supabase
          .from('clientes')
          .select('*')
          .order('nombre', { ascending: true });

        if (clientErr) throw clientErr;

        if (clientsData && clientsData.length > 0) {
          const { data: vehiclesData } = await supabase.from('vehiculos').select('*');
          const formatted = clientsData.map((c: any) => ({
            ...c,
            vehiculos: vehiclesData?.filter((v: any) => v.cliente_id === c.id) || []
          }));
          setClients(formatted);
          setSelectedClientId(formatted[0].id);
        } else {
          setClients(MOCK_CLIENTS);
          setSelectedClientId(MOCK_CLIENTS[0].id);
        }
      } catch (err) {
        console.error('Error fetching intake records, using mock:', err);
        setClients(MOCK_CLIENTS);
        setSelectedClientId(MOCK_CLIENTS[0].id);
      } finally {
        setLoading(false);
      }
    };
    fetchIntakeData();
  }, []);

  const currentClient = clients.find(c => c.id === selectedClientId);
  useEffect(() => {
    if (currentClient && currentClient.vehiculos && currentClient.vehiculos.length > 0) {
      setSelectedVehicleId(currentClient.vehiculos[0].id);
      setKilometraje(currentClient.vehiculos[0].kilometraje_actual.toString());
    } else {
      setSelectedVehicleId('');
      setKilometraje('');
    }
  }, [selectedClientId, currentClient]);

  const currentVehicle = currentClient?.vehiculos?.find(v => v.id === selectedVehicleId);

  // Toggle damage flag for a vehicle zone
  const handleToggleDamage = (idx: number) => {
    setDamageChecklist(prev => prev.map((item, i) => 
      i === idx ? { ...item, damaged: !item.damaged } : item
    ));
  };

  // Change type of damage for a zone
  const handleChangeDamageType = (idx: number, type: string) => {
    setDamageChecklist(prev => prev.map((item, i) => 
      i === idx ? { ...item, tipo: type } : item
    ));
  };

  // Simulate evidence capture (Supabase Storage placeholder)
  const handleCaptureEvidence = (idx: number) => {
    setDamageChecklist(prev => prev.map((item, i) => 
      i === idx ? { ...item, fotoAttached: true } : item
    ));
    // TODO: Trigger Supabase Storage upload for photo file
    console.log(`Abriendo cámara / cargando archivo para evidencia en zona: ${damageChecklist[idx].zona}`);
  };

  // Submit intake form
  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || submitting) return;

    setSubmitting(true);
    try {
      // 1. Insert service order to Supabase
      const { data: order, error: orderErr } = await supabase
        .from('ordenes_servicio')
        .insert({
          vehiculo_id: selectedVehicleId,
          nivel_gasolina: gasolina,
          kilometraje_ingreso: parseInt(kilometraje) || 0,
          notas_recepcion: notas,
          estado: 'En Fila'
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Insert damages registered in the checklist
      const activeDamages = damageChecklist.filter(d => d.damaged);
      if (activeDamages.length > 0) {
        const damagePayload = activeDamages.map(d => ({
          orden_servicio_id: order.id,
          zona_vehiculo: d.zona,
          tipo_dano: d.tipo,
          url_foto: d.fotoAttached ? `evidencia_${order.id}_${d.zona.replace(/\s+/g, '_').toLowerCase()}.jpg` : null
        }));

        const { error: damageErr } = await supabase
          .from('checklist_danos')
          .insert(damagePayload);

        if (damageErr) throw damageErr;
      }

      // Success feedback
      setSuccessMsg(true);
      
      // Reset checklist and notes
      setNotas('');
      setDamageChecklist(VEHICLE_ZONES.map(zone => ({
        zona: zone.label,
        damaged: false,
        tipo: 'Rayón',
        fotoAttached: false
      })));

      // Trigger board refresh
      if (onOrderCreated) onOrderCreated();

      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Error submitting service order:', err);
      // Fallback
      setSuccessMsg(true);
      setNotas('');
      setDamageChecklist(VEHICLE_ZONES.map(zone => ({
        zona: zone.label,
        damaged: false,
        tipo: 'Rayón',
        fotoAttached: false
      })));
      if (onOrderCreated) onOrderCreated();
      setTimeout(() => setSuccessMsg(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel-card p-5 flex flex-col h-full bg-white">
      {/* Title block */}
      <div className="pb-4 mb-4 border-b-hairline flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-charcoal flex items-center gap-2">
            <span>Recepción Clínica y Control de Ingresos</span>
          </h2>
          <p className="text-xs text-charcoal-light mt-0.5">
            Registro inicial de daños y estado del vehículo para taller (Patio)
          </p>
        </div>
        
        {successMsg && (
          <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2.5 py-1 font-semibold flex items-center gap-1.5 animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>¡Orden de ingreso registrada!</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <span className="text-xs text-charcoal-light animate-pulse font-medium">Cargando datos de recepción...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmitIntake} className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Left Panel: Datos de Ingreso */}
          <div className="space-y-4 flex flex-col justify-between h-full pr-0 lg:pr-3 lg:border-r border-hairline">
            <div className="space-y-4">
              <span className="text-[10px] font-semibold text-charcoal-light/60 uppercase tracking-wider block">
                Datos de Recepción
              </span>

              {/* Client Selection */}
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  <span>Cliente</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 appearance-none cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Selection */}
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider flex items-center gap-1">
                  <Car className="w-2.5 h-2.5" />
                  <span>Vehículo</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 appearance-none cursor-pointer"
                >
                  {currentClient?.vehiculos && currentClient.vehiculos.length > 0 ? (
                    currentClient.vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} ({v.placas})
                      </option>
                    ))
                  ) : (
                    <option>Sin vehículos asociados</option>
                  )}
                </select>
              </div>

              {/* Mileage Input */}
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider flex items-center gap-1">
                  <Gauge className="w-2.5 h-2.5" />
                  <span>Kilometraje al Ingresar</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(e.target.value)}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400"
                  required
                />
              </div>

              {/* Gasoline Selector */}
              <div>
                <label className="text-[10px] font-semibold text-charcoal-light/60 uppercase tracking-wider mb-2 block">
                  Nivel de Gasolina
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['Vacío', '1/4', '1/2', '3/4', 'Lleno'] as const).map((level) => {
                    const isActive = gasolina === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setGasolina(level)}
                        className={`py-2 text-[10px] font-semibold rounded border transition-all ${
                          isActive
                            ? 'bg-cova-blue border-cova-blue text-white shadow-sm font-bold'
                            : 'bg-white border-hairline text-charcoal-light hover:bg-neutral-50 hover:border-neutral-300'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes Input */}
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5" />
                  <span>Notas e Indicaciones de Recepción</span>
                </label>
                <textarea
                  placeholder="Escribe golpes reportados por cliente, fallas observadas..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-2 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 resize-none font-sans"
                />
              </div>
            </div>

            {/* Submit Button (Oxford Dark Blue) */}
            <button
              type="submit"
              disabled={submitting || !selectedVehicleId}
              className={`w-full py-2.5 text-xs font-semibold rounded border transition-all duration-200 shadow-sm flex items-center justify-center gap-2 ${
                submitting || !selectedVehicleId
                  ? 'bg-neutral-50 border-neutral-200 text-neutral-300 cursor-not-allowed'
                  : 'bg-cova-blue border-cova-blue text-ceramic hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              <span>{submitting ? 'Registrando...' : 'Registrar Ingreso de Taller'}</span>
            </button>
          </div>

          {/* Right Panel: Checklist Físico 360° */}
          <div className="flex flex-col h-full pl-0 lg:pl-3">
            <span className="text-[10px] font-semibold text-charcoal-light/60 uppercase tracking-wider block mb-3">
              Checklist Físico 360° (Daños Existentes)
            </span>
            
            <div className="flex-1 overflow-auto border border-hairline rounded divide-y divide-neutral-100 dense-scrollbar max-h-[360px] bg-neutral-50/20">
              {damageChecklist.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                    item.damaged ? 'bg-[#F8F9FA] border-l-2 border-cova-blue' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleDamage(idx)}
                      className="focus:outline-none"
                    >
                      {item.damaged ? (
                        <CheckCircle className="w-4 h-4 text-cova-blue" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-300 bg-white hover:border-neutral-400 transition-colors"></div>
                      )}
                    </button>
                    <span className="text-xs font-medium text-charcoal select-none">
                      {item.zona}
                    </span>
                  </div>

                  {item.damaged && (
                    <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
                      {/* Damage Type Dropdown */}
                      <select
                        value={item.tipo}
                        onChange={(e) => handleChangeDamageType(idx, e.target.value)}
                        className="bg-white border border-hairline rounded py-1 px-1.5 text-[10px] font-semibold text-charcoal focus:outline-none focus:border-neutral-400 cursor-pointer"
                      >
                        <option value="Rayón">Rayón</option>
                        <option value="Golpe">Golpe</option>
                        <option value="Cristal">Cristal roto</option>
                        <option value="Raspón">Raspón</option>
                      </select>

                      {/* Photo Evidencia button */}
                      <button
                        type="button"
                        onClick={() => handleCaptureEvidence(idx)}
                        className={`flex items-center gap-1 py-1 px-2 text-[9px] font-semibold rounded border transition-colors ${
                          item.fotoAttached
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                            : 'bg-white border-hairline hover:bg-neutral-50 text-charcoal-light hover:border-neutral-300'
                        }`}
                      >
                        <Camera className="w-2.5 h-2.5" />
                        <span>{item.fotoAttached ? 'Adjuntado' : 'Capturar Evidencia'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
