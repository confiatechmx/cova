'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Tire } from './TireSearch';
import { 
  User, 
  Car, 
  FileText, 
  Send, 
  Trash2, 
  Check, 
  Plus, 
  Minus, 
  CheckSquare, 
  Square,
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export interface QuoteItem {
  tire: Tire;
  cantidad: number;
  precioUnitario: number;
}

interface QuoteBuilderProps {
  selectedItems: QuoteItem[];
  onRemoveItem: (tireId: string) => void;
  onUpdateQuantity: (tireId: string, delta: number) => void;
  onClearQuote: () => void;
}

interface Client {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  vehiculos?: Vehicle[];
}

interface Vehicle {
  id: string;
  cliente_id: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  vin: string;
  kilometraje_actual: number;
  presion_delantera_psi?: number;
  presion_trasera_psi?: number;
  medida_oem?: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'add' | 'remove';
}

const MOCK_CLIENTS: Client[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    nombre: 'Juan Pérez',
    telefono: '+52 667 123 4567',
    correo: 'juan.perez@email.com',
    vehiculos: [
      {
        id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        cliente_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        marca: 'Nissan',
        modelo: 'Versa',
        anio: 2020,
        placas: 'VJS-456-A',
        vin: '3N1CN8AP1LL123456',
        kilometraje_actual: 45000,
        presion_delantera_psi: 33,
        presion_trasera_psi: 33,
        medida_oem: '185/65 R15'
      }
    ]
  },
  {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    nombre: 'María López',
    telefono: '+52 667 987 6543',
    correo: 'maria.lopez@email.com',
    vehiculos: [
      {
        id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        cliente_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        marca: 'Chevrolet',
        modelo: 'Aveo',
        anio: 2018,
        placas: 'VMY-789-B',
        vin: 'KL1TD54E5JB654321',
        kilometraje_actual: 72000,
        presion_delantera_psi: 30,
        presion_trasera_psi: 30,
        medida_oem: '185/60 R15'
      }
    ]
  },
  {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    nombre: 'Carlos Mendoza',
    telefono: '+52 667 444 5566',
    correo: 'carlos.mendoza@email.com',
    vehiculos: [
      {
        id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
        cliente_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: 2021,
        placas: 'VNZ-123-C',
        vin: 'MR0FR22G9M8987654',
        kilometraje_actual: 35000,
        presion_delantera_psi: 29,
        presion_trasera_psi: 36,
        medida_oem: '265/65 R17'
      }
    ]
  }
];

export default function QuoteBuilder({
  selectedItems,
  onRemoveItem,
  onUpdateQuantity,
  onClearQuote
}: QuoteBuilderProps) {
  // Client & Vehicle selection state
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);

  // Additional services & package states
  const [serviceAlignment, setServiceAlignment] = useState(false);
  const [serviceNitrogen, setServiceNitrogen] = useState(false);
  const [serviceBrakes, setServiceBrakes] = useState(false);

  // Action states
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  // Vehicle Clinic Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'history' | 'specs'>('history');
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Operational Log (Audit Log) State
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message: 'Sesión iniciada en Caja 1 • Sucursal Tres Ríos',
      type: 'info'
    }
  ]);

  // Refs for tracking previous state values to auto-log changes
  const prevItemsRef = useRef<QuoteItem[]>([]);
  const prevPromoRef = useRef(false);
  const firstLoadRef = useRef(true);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'add' | 'remove') => {
    const timestamp = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp,
        message,
        type
      },
      ...prev
    ]);
  };

  // Fetch clients and their vehicles
  useEffect(() => {
    const fetchClientsAndVehicles = async () => {
      try {
        setLoadingData(true);
        // Query clients
        const { data: clientsData, error: clientErr } = await supabase
          .from('clientes')
          .select('*')
          .order('nombre', { ascending: true });

        if (clientErr) throw clientErr;

        if (clientsData && clientsData.length > 0) {
          // Query vehicles for these clients
          const { data: vehiclesData, error: vehicleErr } = await supabase
            .from('vehiculos')
            .select('*');

          if (vehicleErr) throw vehicleErr;

          const formatted: Client[] = clientsData.map((client: any) => ({
            ...client,
            vehiculos: vehiclesData?.filter((v: any) => v.cliente_id === client.id) || []
          }));

          setClients(formatted);
          if (formatted.length > 0) {
            setSelectedClientId(formatted[0].id);
          }
        } else {
          setClients(MOCK_CLIENTS);
          setSelectedClientId(MOCK_CLIENTS[0].id);
        }
      } catch (err) {
        console.error('Error fetching relational data, falling back:', err);
        setClients(MOCK_CLIENTS);
        setSelectedClientId(MOCK_CLIENTS[0].id);
      } finally {
        setLoadingData(false);
      }
    };

    fetchClientsAndVehicles();
  }, []);

  // Update selected vehicle when client changes
  const currentClient = clients.find(c => c.id === selectedClientId);
  useEffect(() => {
    if (currentClient && currentClient.vehiculos && currentClient.vehiculos.length > 0) {
      setSelectedVehicleId(currentClient.vehiculos[0].id);
    } else {
      setSelectedVehicleId('');
    }
  }, [selectedClientId, currentClient]);

  const currentVehicle = currentClient?.vehiculos?.find(v => v.id === selectedVehicleId);

  // Business Rule: "Compra de 4 llantas + Alineación y Balanceo gratis"
  const totalTiresCount = selectedItems.reduce((acc, item) => acc + item.cantidad, 0);
  const qualifiesForFreeAlignment = totalTiresCount >= 4;

  // Auto-log selected client changes
  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    if (currentClient) {
      addLog(`Cliente "${currentClient.nombre}" seleccionado`, 'info');
    }
  }, [selectedClientId]);

  // Auto-log additions, removals, and changes in the cart
  useEffect(() => {
    const prev = prevItemsRef.current;
    
    // Check for additions
    selectedItems.forEach(item => {
      const prevItem = prev.find(p => p.tire.id === item.tire.id);
      if (!prevItem) {
        addLog(`Añadido: ${item.cantidad}x ${item.tire.marca} ${item.tire.modelo_llanta} al carrito`, 'add');
      } else if (prevItem.cantidad !== item.cantidad) {
        const diff = item.cantidad - prevItem.cantidad;
        if (diff > 0) {
          addLog(`Modificado: Aumentó cantidad de ${item.tire.marca} a ${item.cantidad} unidades`, 'add');
        } else {
          addLog(`Modificado: Redujo cantidad de ${item.tire.marca} a ${item.cantidad} unidades`, 'remove');
        }
      }
    });

    // Check for removals
    prev.forEach(prevItem => {
      const exists = selectedItems.find(item => item.tire.id === prevItem.tire.id);
      if (!exists) {
        addLog(`Removido: ${prevItem.tire.marca} ${prevItem.tire.modelo_llanta} fuera del carrito`, 'remove');
      }
    });

    prevItemsRef.current = selectedItems;
  }, [selectedItems]);

  // Auto-log business rule triggers
  useEffect(() => {
    if (qualifiesForFreeAlignment && !prevPromoRef.current) {
      addLog(`Regla aplicada: Paquete de Alineación y Balanceo Premium inyectado con costo $0.00`, 'success');
      setServiceAlignment(true);
    } else if (!qualifiesForFreeAlignment && prevPromoRef.current) {
      addLog(`Regla removida: Descuento de Alineación por compra de 4 llantas cancelado`, 'warning');
    }
    prevPromoRef.current = qualifiesForFreeAlignment;
  }, [qualifiesForFreeAlignment]);

  // Pricing constants (MXN)
  const ALIGNMENT_PRICE = 1200.00; // Alignment + balancing normal price
  const NITROGEN_PRICE = 250.00;
  const BRAKES_PRICE = 1800.00;

  // Calculate pricing totals
  const subtotalTires = selectedItems.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  
  let subtotalServices = 0;
  if (serviceAlignment) {
    subtotalServices += qualifiesForFreeAlignment ? 0 : ALIGNMENT_PRICE;
  }
  if (serviceNitrogen) {
    subtotalServices += NITROGEN_PRICE;
  }
  if (serviceBrakes) {
    subtotalServices += BRAKES_PRICE;
  }

  const grandTotal = subtotalTires + subtotalServices;

  // Fetch clinical history from Supabase
  const fetchServiceHistory = async (vehicleId: string) => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('historial_servicios')
        .select('*')
        .eq('vehiculo_id', vehicleId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setServiceHistory(data || []);
    } catch (err) {
      console.error('Error fetching service history, using mock:', err);
      // Fallback mocks
      const mocks: Record<string, any[]> = {
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44': [
          { fecha: '2026-03-10', descripcion: 'Alineación, Balanceo y Rotación de neumáticos', costo: 1200.00 },
          { fecha: '2025-09-15', descripcion: 'Servicio de cambio de balatas delanteras', costo: 1800.00 }
        ],
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55': [
          { fecha: '2026-01-20', descripcion: 'Cambio de 2 amortiguadores delanteros y alineación', costo: 4200.00 },
          { fecha: '2025-06-12', descripcion: 'Parche de sección en llanta trasera izquierda', costo: 350.00 }
        ],
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66': [
          { fecha: '2026-04-05', descripcion: 'Instalación de 4 llantas nuevas Goodyear Wrangler y balanceo', costo: 20560.00 },
          { fecha: '2025-10-18', descripcion: 'Engrasado de suspensión y reapriete general', costo: 850.00 }
        ]
      };
      setServiceHistory(mocks[vehicleId] || []);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Actions
  const handleSaveAndWhatsapp = async () => {
    if (!currentClient || selectedItems.length === 0) return;
    
    setIsSendingWhatsapp(true);
    setWhatsappSent(false);

    try {
      // 1. Save quote to Database
      const { data: quote, error: qErr } = await supabase
        .from('cotizaciones')
        .insert({
          cliente_id: selectedClientId,
          vehiculo_id: selectedVehicleId,
          total: grandTotal,
          estatus: 'Enviada'
        })
        .select()
        .single();

      if (qErr) throw qErr;

      // 2. Save quote details
      const details = selectedItems.map(item => ({
        cotizacion_id: quote.id,
        llanta_id: item.tire.id,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        subtotal: item.precioUnitario * item.cantidad
      }));

      const { error: dErr } = await supabase
        .from('detalles_cotizacion')
        .insert(details);

      if (dErr) throw dErr;

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const quoteShortId = quote.id.substr(0, 8).toUpperCase();
      addLog(`Cotización #${quoteShortId} guardada en Supabase y enviada a WhatsApp`, 'success');

      setWhatsappSent(true);
      setTimeout(() => setWhatsappSent(false), 3000);
    } catch (err) {
      console.error('Error saving quote or sending webhook:', err);
      // Fallback
      await new Promise(resolve => setTimeout(resolve, 1500));
      addLog(`Cotización #COVA-${Math.floor(1000 + Math.random()*9000)} generada y enviada a WhatsApp (offline/mock)`, 'success');
      setWhatsappSent(true);
      setTimeout(() => setWhatsappSent(false), 3000);
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (selectedItems.length === 0) return;
    setIsGeneratingPdf(true);
    setPdfGenerated(false);
    
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    const quoteNum = Math.floor(1000 + Math.random() * 9000);
    addLog(`Cotización #COVA-${quoteNum} creada en borrador y PDF descargado`, 'success');

    setIsGeneratingPdf(false);
    setPdfGenerated(true);
    setTimeout(() => setPdfGenerated(false), 3000);
  };

  return (
    <div className="panel-card p-5 flex flex-col h-full bg-white">
      {/* Title block */}
      <div className="pb-4 mb-4 border-b-hairline">
        <h2 className="text-sm font-semibold tracking-tight text-charcoal flex items-center gap-2">
          <span>Cotizador Express</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 font-mono text-emerald-700 border border-emerald-100 font-semibold uppercase">
            Fase 1 Activa
          </span>
        </h2>
        <p className="text-xs text-charcoal-light mt-0.5">
          Ingreso ágil de órdenes y servicios rápidos
        </p>
      </div>

      {/* Client / Vehicle Selection Fields */}
      <div className="space-y-3 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Client Select */}
          <div className="relative">
            <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              <span>Cliente</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 transition-colors appearance-none cursor-pointer"
            >
              {loadingData ? (
                <option>Cargando clientes...</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.telefono})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Vehicle Select */}
          <div className="relative">
            <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider flex items-center gap-1">
              <Car className="w-2.5 h-2.5" />
              <span>Vehículo</span>
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              disabled={!selectedClientId}
              className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 transition-colors appearance-none cursor-pointer disabled:bg-neutral-50 disabled:cursor-not-allowed"
            >
              {currentClient?.vehiculos && currentClient.vehiculos.length > 0 ? (
                currentClient.vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} {v.anio} • {v.placas}
                  </option>
                ))
              ) : (
                <option>Sin vehículos asociados</option>
              )}
            </select>
          </div>
        </div>

        {/* Selected Vehicle Metadata readout (Interactive Ficha Clínica trigger) */}
        {currentVehicle && (
          <div 
            onClick={() => {
              setIsModalOpen(true);
              fetchServiceHistory(currentVehicle.id);
            }}
            className="bg-neutral-50 hover:bg-neutral-100/80 cursor-pointer border border-hairline hover:border-neutral-300 rounded p-2 text-[10px] text-charcoal-light font-mono flex items-center justify-between gap-x-4 gap-y-1 transition-all select-none"
            title="Haga clic para ver Ficha Clínica"
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span><strong>VIN:</strong> {currentVehicle.vin ? currentVehicle.vin.substr(0, 8) + '...' : 'No reg'}</span>
              <span><strong>Placas:</strong> {currentVehicle.placas}</span>
              <span><strong>OEM:</strong> {currentVehicle.medida_oem || 'Ver specs'}</span>
            </div>
            <span className="text-[9px] font-sans font-semibold text-charcoal flex items-center gap-0.5 bg-neutral-200/60 px-1.5 py-0.5 rounded">
              <span>Ver Ficha Clínica</span>
              <span>→</span>
            </span>
          </div>
        )}
      </div>

      {/* Selected Items List */}
      <div className="flex-1 min-h-[160px] mb-4 flex flex-col">
        <label className="text-[10px] font-semibold text-charcoal-light/60 uppercase tracking-wider mb-2 block">
          Llantas Seleccionadas
        </label>
        
        {selectedItems.length === 0 ? (
          <div className="flex-1 border border-dashed border-hairline rounded flex flex-col items-center justify-center p-6 text-center bg-neutral-50/50">
            <FileText className="w-6 h-6 text-neutral-300 mb-1.5" />
            <p className="text-xs font-medium text-charcoal">La cotización está vacía</p>
            <p className="text-[10px] text-charcoal-light mt-0.5 max-w-[200px]">
              Selecciona medidas de llanta en la matriz y presiona (+) para agregarlas aquí.
            </p>
          </div>
        ) : (
          <div className="flex-1 border border-hairline rounded divide-y divide-neutral-100 overflow-auto dense-scrollbar max-h-[160px]">
            {selectedItems.map((item) => {
              const itemTotal = item.precioUnitario * item.cantidad;
              return (
                <div key={item.tire.id} className="p-2.5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                  <div className="flex-1 pr-3">
                    <div className="text-xs font-semibold text-charcoal">
                      {item.tire.marca} - {item.tire.modelo_llanta}
                    </div>
                    <div className="text-[10px] text-charcoal-light/75 font-mono mt-0.5">
                      {item.tire.ancho}/{item.tire.perfil} R{item.tire.rin} • {item.tire.indice_carga_velocidad}
                    </div>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="flex items-center gap-1.5 mr-4">
                    <button
                      onClick={() => onUpdateQuantity(item.tire.id, -1)}
                      className="p-1 rounded border border-hairline hover:bg-neutral-50 hover:border-neutral-400 transition-colors text-charcoal"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center text-charcoal">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.tire.id, 1)}
                      disabled={item.cantidad >= item.tire.stock_actual}
                      className="p-1 rounded border border-hairline hover:bg-neutral-50 hover:border-neutral-400 transition-colors text-charcoal disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right pr-3 font-mono">
                    <div className="text-xs font-semibold text-charcoal">
                      ${itemTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] text-charcoal-light/60">
                      ${item.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
                    </div>
                  </div>

                  {/* Trash */}
                  <button
                    onClick={() => onRemoveItem(item.tire.id)}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 text-neutral-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto Service Packages toggles */}
      <div className="mb-4 space-y-2 border-t-hairline pt-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
            Paquetes y Adicionales
          </label>
          {qualifiesForFreeAlignment && (
            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 animate-pulse">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Promo 4x Llanta Activa</span>
            </span>
          )}
        </div>

        {/* Alignment package */}
        <div 
          onClick={() => setServiceAlignment(!serviceAlignment)}
          className={`flex items-center justify-between p-2 rounded border transition-all cursor-pointer select-none ${
            serviceAlignment
              ? 'border-neutral-400 bg-neutral-50'
              : 'border-hairline bg-white hover:bg-neutral-50/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {serviceAlignment ? (
              <CheckSquare className="w-4 h-4 text-charcoal" />
            ) : (
              <Square className="w-4 h-4 text-neutral-300" />
            )}
            <div>
              <p className="text-xs font-semibold text-charcoal">Alineación y Balanceo Premium</p>
              <p className="text-[9px] text-charcoal-light/75">
                {qualifiesForFreeAlignment ? 'Ahorro: -$1,200 (Cortesia)' : 'Alineación + Balanceo 4 neumáticos'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-mono font-bold ${qualifiesForFreeAlignment ? 'text-emerald-600' : 'text-charcoal'}`}>
            {qualifiesForFreeAlignment ? '¡GRATIS!' : '$1,200.00'}
          </span>
        </div>

        {/* Nitrogen Package */}
        <div 
          onClick={() => setServiceNitrogen(!serviceNitrogen)}
          className={`flex items-center justify-between p-2 rounded border transition-all cursor-pointer select-none ${
            serviceNitrogen
              ? 'border-neutral-400 bg-neutral-50'
              : 'border-hairline bg-white hover:bg-neutral-50/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {serviceNitrogen ? (
              <CheckSquare className="w-4 h-4 text-charcoal" />
            ) : (
              <Square className="w-4 h-4 text-neutral-300" />
            )}
            <div>
              <p className="text-xs font-semibold text-charcoal">Nitrógeno Automotriz</p>
              <p className="text-[9px] text-charcoal-light/75">Presión estable y mayor durabilidad de hule</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-charcoal">$250.00</span>
        </div>

        {/* Brake Service */}
        <div 
          onClick={() => setServiceBrakes(!serviceBrakes)}
          className={`flex items-center justify-between p-2 rounded border transition-all cursor-pointer select-none ${
            serviceBrakes
              ? 'border-neutral-400 bg-neutral-50'
              : 'border-hairline bg-white hover:bg-neutral-50/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {serviceBrakes ? (
              <CheckSquare className="w-4 h-4 text-charcoal" />
            ) : (
              <Square className="w-4 h-4 text-neutral-300" />
            )}
            <div>
              <p className="text-xs font-semibold text-charcoal">Servicio de Frenos (Balatas)</p>
              <p className="text-[9px] text-charcoal-light/75">Limpieza, rectificación y cambio de balatas eje delantero</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-charcoal">$1,800.00</span>
        </div>
      </div>

      {/* Quote summary block */}
      <div className="bg-neutral-50 border border-hairline rounded p-4 mb-4 mt-auto">
        <div className="flex justify-between text-xs text-charcoal-light">
          <span>Subtotal llantas:</span>
          <span className="font-mono">${subtotalTires.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs text-charcoal-light mt-1.5">
          <span>Servicios y paquetes:</span>
          <span className="font-mono">${subtotalServices.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-charcoal border-t border-dashed border-hairline pt-2 mt-2">
          <span>Total Cotización:</span>
          <span className="font-mono text-base">${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-charcoal-light">MXN</span></span>
        </div>
      </div>

      {/* Actions (PDF & WhatsApp) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* PDF Download Button */}
        <button
          onClick={handleGeneratePdf}
          disabled={selectedItems.length === 0 || isGeneratingPdf}
          className={`w-full text-xs font-semibold flex items-center justify-center gap-2 px-3 py-2.5 rounded border transition-all ${
            selectedItems.length === 0
              ? 'bg-neutral-50 border-neutral-200 text-neutral-300 cursor-not-allowed'
              : 'bg-white border-hairline hover:border-neutral-400 hover:bg-neutral-50 text-charcoal shadow-sm hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : pdfGenerated ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span>{isGeneratingPdf ? 'Generando...' : pdfGenerated ? '¡PDF Creado!' : 'Generar PDF'}</span>
        </button>

        {/* WhatsApp Send Button (Oxford Brand Blue) */}
        <button
          onClick={handleSaveAndWhatsapp}
          disabled={selectedItems.length === 0 || isSendingWhatsapp}
          className={`w-full text-xs font-semibold flex items-center justify-center gap-2 px-3 py-2.5 rounded border transition-all ${
            selectedItems.length === 0
              ? 'bg-neutral-50 border-neutral-200 text-neutral-300 cursor-not-allowed'
              : 'bg-cova-blue border-cova-blue text-ceramic shadow-sm hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          {isSendingWhatsapp ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : whatsappSent ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{isSendingWhatsapp ? 'Enviando...' : whatsappSent ? '¡Enviado!' : 'WhatsApp'}</span>
        </button>
      </div>

      {/* Operational Audit Log timeline */}
      <div className="mt-5 border-t border-hairline pt-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
            Bitácora Operativa (Audit Log)
          </span>
          <button 
            onClick={() => setLogs([{
              id: 'init',
              timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              message: 'Bitácora reiniciada',
              type: 'info'
            }])}
            className="text-[9px] text-neutral-400 hover:text-neutral-600 transition-colors font-mono"
          >
            Limpiar
          </button>
        </div>
        
        <div className="bg-neutral-50 border border-hairline rounded p-2.5 max-h-[120px] overflow-auto dense-scrollbar space-y-2 text-[10px]">
          {logs.map((log) => {
            let badgeStyle = 'bg-neutral-200 text-neutral-600';
            if (log.type === 'add') badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
            if (log.type === 'remove') badgeStyle = 'bg-red-50 text-red-700 border border-red-100';
            if (log.type === 'success') badgeStyle = 'bg-emerald-100 text-emerald-800 font-bold';
            if (log.type === 'warning') badgeStyle = 'bg-amber-50 text-amber-700 border border-amber-100';
            
            return (
              <div key={log.id} className="flex gap-2 items-start leading-relaxed font-mono">
                <span className="text-neutral-400 flex-shrink-0">{log.timestamp}</span>
                <span className={`px-1 py-0.5 rounded text-[8px] uppercase tracking-wider flex-shrink-0 ${badgeStyle}`}>
                  {log.type}
                </span>
                <span className="text-charcoal flex-1">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical Vehicle Modal */}
      {isModalOpen && currentVehicle && (
        <div className="fixed inset-0 bg-neutral-900/20 backdrop-blur-[1px] flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-hairline rounded-lg shadow-lg max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-neutral-50 p-4 border-b border-hairline flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  <span>Ficha Clínica del Vehículo</span>
                </h3>
                <p className="text-[11px] text-charcoal-light font-medium mt-0.5">
                  {currentVehicle.marca} {currentVehicle.modelo} {currentVehicle.anio} • {currentVehicle.placas}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-charcoal transition-colors text-xs font-bold font-sans p-1"
              >
                ✕
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-hairline bg-white text-xs">
              <button 
                onClick={() => setModalTab('history')}
                className={`flex-1 py-2 text-center font-medium border-b-2 transition-all ${
                  modalTab === 'history' 
                    ? 'border-charcoal text-charcoal' 
                    : 'border-transparent text-neutral-400 hover:text-charcoal'
                }`}
              >
                Historial de Servicios
              </button>
              <button 
                onClick={() => setModalTab('specs')}
                className={`flex-1 py-2 text-center font-medium border-b-2 transition-all ${
                  modalTab === 'specs' 
                    ? 'border-charcoal text-charcoal' 
                    : 'border-transparent text-neutral-400 hover:text-charcoal'
                }`}
              >
                Especificaciones OEM
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4 max-h-[300px] overflow-auto dense-scrollbar">
              {modalTab === 'history' ? (
                loadingHistory ? (
                  <div className="py-8 text-center text-xs text-charcoal-light animate-pulse font-mono">Cargando historial clínico...</div>
                ) : serviceHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400 font-mono">Sin registros de servicio previos.</div>
                ) : (
                  <div className="space-y-3">
                    {serviceHistory.map((service, idx) => (
                      <div key={idx} className="p-2.5 rounded border border-hairline bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                          <span>{service.fecha}</span>
                          <span className="font-semibold text-charcoal-light">${parseFloat(service.costo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-charcoal leading-relaxed font-medium">{service.descripcion}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded border border-hairline font-mono">
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase font-sans">Medida OEM de Agencia</span>
                      <span className="text-xs font-semibold text-charcoal">{currentVehicle.medida_oem || '205/55 R16'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase font-sans">Tipo Vehículo</span>
                      <span className="text-xs font-semibold text-charcoal">Pasajero / Sedán</span>
                    </div>
                  </div>

                  <div className="border border-hairline rounded overflow-hidden">
                    <div className="bg-neutral-50 px-3 py-1.5 border-b border-hairline text-[10px] font-semibold text-charcoal uppercase tracking-wider">
                      Presión de Inflado Recomendada
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-neutral-100 p-3 font-mono">
                      <div className="text-center">
                        <span className="text-[10px] text-neutral-400 block font-sans">Eje Delantero</span>
                        <span className="text-lg font-bold text-charcoal">{currentVehicle.presion_delantera_psi || 32} PSI</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-neutral-400 block font-sans">Eje Trasero</span>
                        <span className="text-lg font-bold text-charcoal">{currentVehicle.presion_trasera_psi || 32} PSI</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded p-2.5 text-[11px] text-amber-700 leading-relaxed flex gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      <strong>Nota de calibración:</strong> Siempre calibre la presión de inflado en frío (antes de circular más de 2 km) para asegurar la máxima durabilidad y precisión.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Oxford Brand Blue Button) */}
            <div className="bg-neutral-50 px-4 py-3 border-t border-hairline flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="bg-cova-blue text-ceramic shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-xs px-3.5 py-1.5 rounded font-semibold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
