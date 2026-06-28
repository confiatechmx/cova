"use client";

import { useState, useEffect } from "react";
import { Plus, GripVertical, Target, Phone, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface Oportunidad {
  id: string;
  cliente_id: string;
  monto_estimado: number;
  estado: string;
  creado_en: string;
  cliente?: { nombre: string; telefono: string };
}

const COLUMNS = [
  { id: 'nuevo', label: 'Nuevos Leads', color: 'border-blue-500 bg-blue-50/50 text-blue-700' },
  { id: 'contactado', label: 'Contactado', color: 'border-purple-500 bg-purple-50/50 text-purple-700' },
  { id: 'cita_agendada', label: 'Cita Agendada', color: 'border-amber-500 bg-amber-50/50 text-amber-700' },
  { id: 'ganado', label: 'Ganado (En Taller)', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-700' },
  { id: 'perdido', label: 'Perdido', color: 'border-red-500 bg-red-50/50 text-red-700' }
];

export default function VentasPipelinePage() {
  const [opportunities, setOpportunities] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Opp State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isManualAdvancedOpen, setIsManualAdvancedOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualEmpresa, setManualEmpresa] = useState("");
  const [manualFuente, setManualFuente] = useState("Local");
  const [manualNotas, setManualNotas] = useState("");

  // Ganado (Won) Opp State
  const [isGanadoModalOpen, setIsGanadoModalOpen] = useState(false);
  const [wonOppId, setWonOppId] = useState("");
  const [vehicleMarca, setVehicleMarca] = useState("");
  const [vehicleModelo, setVehicleModelo] = useState("");
  const [vehiclePlacas, setVehiclePlacas] = useState("");
  const [vehicleVin, setVehicleVin] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleKm, setVehicleKm] = useState("");

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('oportunidades_venta')
      .select('*, cliente:clientes(nombre, telefono)')
      .order('creado_en', { ascending: false });
    
    if (data) {
      setOpportunities(data as Oportunidad[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const moveOpportunity = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, estado: newStatus } : o));
    
    // DB Update
    await supabase.from('oportunidades_venta').update({ estado: newStatus }).eq('id', id);
  };

  // Basic drag and drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("id", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    const id = e.dataTransfer.getData("id");
    if (id) {
      if (status === 'ganado') {
        setWonOppId(id);
        setIsGanadoModalOpen(true);
      } else {
        moveOpportunity(id, status);
      }
    }
  };

  const handleCreateManualOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) return;

    // Create client
    const { data: newClient, error: clientErr } = await supabase.from('clientes').insert({
      nombre: manualName,
      telefono: manualPhone,
      correo: '',
      empresa: manualEmpresa || null,
      fuente_adquisicion: manualFuente,
      notas_internas: manualNotas || null,
      tags: ['Prospecto Manual']
    }).select().single();

    if (newClient) {
      await supabase.from('oportunidades_venta').insert({
        cliente_id: newClient.id,
        monto_estimado: Number(manualAmount) || 0,
        estado: 'nuevo'
      });
      
      setIsManualModalOpen(false);
      setIsManualAdvancedOpen(false);
      setManualName("");
      setManualPhone("");
      setManualAmount("");
      setManualEmpresa("");
      setManualFuente("Local");
      setManualNotas("");
      loadData();
    }
  };

  const handleConfirmGanado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wonOppId || !vehicleMarca) return;

    const opp = opportunities.find(o => o.id === wonOppId);
    if (!opp) return;

    // 1. Crear vehiculo
    const { data: newVehicle } = await supabase.from('vehiculos').insert({
      cliente_id: opp.cliente_id,
      marca: vehicleMarca,
      modelo: vehicleModelo,
      placas: vehiclePlacas,
      vin: vehicleVin || null,
      color: vehicleColor || null,
      kilometraje: vehicleKm || null,
      anio: new Date().getFullYear()
    }).select().single();

    if (newVehicle) {
      // 2. Crear orden de servicio
      await supabase.from('ordenes_servicio').insert({
        vehiculo_id: newVehicle.id,
        estado: 'Recibido',
        estatus_pago: 'Pendiente'
      });

      // 3. Actualizar estado opp a ganado
      await moveOpportunity(wonOppId, 'ganado');
      
      setIsGanadoModalOpen(false);
      setWonOppId("");
      setVehicleMarca("");
      setVehicleModelo("");
      setVehiclePlacas("");
      setVehicleVin("");
      setVehicleColor("");
      setVehicleKm("");
      alert("¡Cliente convertido! Orden de Servicio creada en el TallerBoard.");
    }
  };

  return (
    <div className="h-full flex flex-col relative animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Pipeline de Ventas</h1>
          <p className="text-sm font-light text-zinc-500 mt-1">Convierte tus prospectos de redes sociales en órdenes de servicio.</p>
        </div>
        <button 
          onClick={() => setIsManualModalOpen(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={14} />
          Nuevo Prospecto Manual
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 no-scrollbar">
        <div className="flex gap-4 h-full min-w-max">
          
          {COLUMNS.map((col) => {
            const columnOps = opportunities.filter(o => o.estado === col.id);
            const columnTotal = columnOps.reduce((acc, curr) => acc + Number(curr.monto_estimado), 0);

            return (
              <div 
                key={col.id} 
                className="w-80 flex flex-col h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                
                {/* Column Header */}
                <div className={`p-3 rounded-xl border-t-4 mb-3 ${col.color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm">{col.label}</h3>
                    <span className="bg-white/50 px-2 py-0.5 rounded text-[10px] font-bold">
                      {columnOps.length}
                    </span>
                  </div>
                  <div className="text-xs font-medium opacity-80">
                    ${columnTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})} est.
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 bg-zinc-100/50 rounded-xl p-2 overflow-y-auto flex flex-col gap-2 border border-zinc-200/50">
                  {columnOps.length === 0 && !loading && (
                    <div className="p-4 text-center text-zinc-400 text-xs font-medium italic border-2 border-dashed border-zinc-200 rounded-lg">
                      Soltar aquí
                    </div>
                  )}

                  {columnOps.map(op => (
                    <div 
                      key={op.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, op.id)}
                      className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                    >
                      <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 text-zinc-300 transition-opacity">
                        <GripVertical size={16} />
                      </div>
                      
                      <div className="font-bold text-zinc-900 text-sm pr-6">
                        {op.cliente?.nombre || 'Desconocido'}
                      </div>
                      
                      <div className="mt-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <Phone size={12} className="text-zinc-400" />
                          <span>{op.cliente?.telefono || 'Sin teléfono'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-1.5 py-0.5 rounded">
                          <Target size={12} />
                          <span>${Number(op.monto_estimado).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] font-semibold text-zinc-400">
                        <span>Creado: {new Date(op.creado_en).toLocaleDateString()}</span>
                        {col.id === 'ganado' && <CheckCircle2 size={14} className="text-emerald-500" />}
                        {col.id === 'perdido' && <XCircle size={14} className="text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )
          })}

        </div>
      </div>

      {/* Modal Nuevo Prospecto Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Nuevo Prospecto Manual</h2>
            <p className="text-sm text-zinc-500 mb-6">Ingresa al cliente que contactó por teléfono o ventanilla.</p>
            
            <form onSubmit={handleCreateManualOpp} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Nombre</label>
                  <input required type="text" value={manualName} onChange={e => setManualName(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-500" placeholder="Ej. Ana Pérez" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Teléfono</label>
                  <input required type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-500" placeholder="Ej. 5512345678" />
                </div>
              </div>

              <div className="mt-1">
                <button 
                  type="button" 
                  onClick={() => setIsManualAdvancedOpen(!isManualAdvancedOpen)}
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-800 flex items-center gap-1"
                >
                  {isManualAdvancedOpen ? "- Ocultar Datos Avanzados" : "+ Mostrar Datos Avanzados (Opcional)"}
                </button>
              </div>

              {isManualAdvancedOpen && (
                <div className="mt-1 pt-3 border-t border-zinc-200/50 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Empresa</label>
                    <input type="text" value={manualEmpresa} onChange={e => setManualEmpresa(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-500" placeholder="Ej. Bimbo" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Fuente</label>
                    <select value={manualFuente} onChange={e => setManualFuente(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-500">
                      <option value="Local">Local (Taller)</option>
                      <option value="Telefono">Llamada</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Referido">Referido</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Notas Internas</label>
                    <input type="text" value={manualNotas} onChange={e => setManualNotas(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-500" placeholder="Ej. Cliente pide factura..." />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Monto Estimado de Venta ($)</label>
                <input required type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-500" placeholder="0.00" />
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 px-4 py-2 text-sm font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                  Añadir al Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Taller (Ganado) */}
      {isGanadoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border-t-4 border-t-emerald-500">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">¡Venta Ganada! 🚀</h2>
            <p className="text-sm text-zinc-500 mb-6">Para transferirlo al TallerBoard, registra el auto que ingresó.</p>
            
            <form onSubmit={handleConfirmGanado} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Marca</label>
                  <input required type="text" value={vehicleMarca} onChange={e => setVehicleMarca(e.target.value)} className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" placeholder="Ej. Nissan" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Modelo</label>
                  <input required type="text" value={vehicleModelo} onChange={e => setVehicleModelo(e.target.value)} className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" placeholder="Ej. Versa" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Placas</label>
                  <input type="text" value={vehiclePlacas} onChange={e => setVehiclePlacas(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" placeholder="Opcional" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">VIN (Número de Serie)</label>
                  <input type="text" value={vehicleVin} onChange={e => setVehicleVin(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" placeholder="Opcional pero recomendado" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Color</label>
                  <input type="text" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" placeholder="Ej. Rojo" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1 uppercase tracking-wider">Kilometraje</label>
                  <input type="text" value={vehicleKm} onChange={e => setVehicleKm(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" placeholder="Ej. 120,000" />
                </div>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsGanadoModalOpen(false)} className="flex-1 px-4 py-2 text-sm font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm">
                  Crear Orden en Taller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
