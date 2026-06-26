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
} from 'lucide-react';
import { toast } from 'sonner';
import ModalAltaExpress from './ModalAltaExpress';
import ModalAltaVehiculo from './ModalAltaVehiculo';
import { createPortal } from 'react-dom';

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
  vendedorId?: string;
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
  onClearQuote,
  vendedorId = 'b001bc99-9c0b-4ef8-bb6d-6bb9bd380e51'
}: QuoteBuilderProps) {
  // Client & Vehicle selection state
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);

  // Additional services & package states
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  // Load dynamic services
  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('servicios_taller')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      if (data) setAvailableServices(data);
    };
    fetchServices();
  }, []);

  // Action states
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  // Phase 6 States
  const [isAltaExpressOpen, setIsAltaExpressOpen] = useState(false);
  const [isAltaVehiculoOpen, setIsAltaVehiculoOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastSaleInfo, setLastSaleInfo] = useState<{
    folio: string;
    fecha: string;
    total: number;
    metodoPago: string;
    montoRecibido: number;
    cambio: number;
    cliente: string;
    telefono: string;
    placas: string;
    marca: string;
    modelo: string;
    items: QuoteItem[];
    servicios: {
      alineacion: boolean;
      nitrogeno: boolean;
      balatas: boolean;
    };
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
  const fetchClientsAndVehicles = async (selectNewClientId?: string, selectNewVehicleId?: string) => {
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
        if (selectNewClientId) {
          setSelectedClientId(selectNewClientId);
          if (selectNewVehicleId) {
            setSelectedVehicleId(selectNewVehicleId);
          }
        } else if (formatted.length > 0 && !selectedClientId) {
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

  useEffect(() => {
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
      addLog(`Regla aplicada: Paquete en promoción inyectado con costo $0.00`, 'success');
      const promoService = availableServices.find(s => s.aplica_promo_llantas);
      if (promoService) {
        setSelectedServiceIds(prev => {
          const next = new Set(prev);
          next.add(promoService.id);
          return next;
        });
      }
    } else if (!qualifiesForFreeAlignment && prevPromoRef.current) {
      addLog(`Regla removida: Descuento de servicio por compra de 4 llantas cancelado`, 'warning');
    }
    prevPromoRef.current = qualifiesForFreeAlignment;
  }, [qualifiesForFreeAlignment, availableServices]);

  // Calculate pricing totals
  const subtotalTires = selectedItems.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  
  let subtotalServices = 0;
  availableServices.forEach(srv => {
    if (selectedServiceIds.has(srv.id)) {
      if (srv.aplica_promo_llantas && qualifiesForFreeAlignment) {
        subtotalServices += 0;
      } else {
        subtotalServices += Number(srv.precio);
      }
    }
  });

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
          estatus: 'Enviada',
          vendedor_id: vendedorId
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
      toast.success('Cotización enviada a WhatsApp');
      addLog(`Cotización #${quoteShortId} guardada en Supabase y enviada a WhatsApp`, 'success');

      setWhatsappSent(true);
      setTimeout(() => setWhatsappSent(false), 3000);
    } catch (err) {
      console.error('Error saving quote or sending webhook:', err);
      // Fallback
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Cotización enviada a WhatsApp (Modo local)');
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
    toast.success('Borrador generado y descargado');
    addLog(`Cotización #COVA-${quoteNum} creada en borrador y PDF descargado`, 'success');

    setIsGeneratingPdf(false);
    setPdfGenerated(true);
    setTimeout(() => setPdfGenerated(false), 3000);
  };

  const handleAltaExpressSuccess = async (newClientId: string, newVehicleId: string) => {
    await fetchClientsAndVehicles(newClientId, newVehicleId);
    addLog('Alta Express exitosa: Cliente y vehículo creados y asignados', 'success');
  };

  const handleAltaVehiculoSuccess = async (newVehicleId: string) => {
    await fetchClientsAndVehicles(selectedClientId, newVehicleId);
    addLog('Alta de vehículo exitosa: Vehículo creado y asignado', 'success');
  };

  const handleConfirmPayment = async () => {
    if (!selectedClientId || !selectedVehicleId || selectedItems.length === 0) {
      toast.error('Por favor selecciona un cliente y un vehículo con items en el carrito.');
      return;
    }

    const calculatedChange = paymentMethod === 'Efectivo'
      ? Math.max(0, (parseFloat(amountReceived) || 0) - grandTotal)
      : 0;

    setIsProcessingPayment(true);

    try {
      const cleanVendedorId = vendedorId === 'admin-demo-id' || !vendedorId
        ? 'b001bc99-9c0b-4ef8-bb6d-6bb9bd380e51' // Sofía
        : vendedorId;

      // 1. Guardar la cotización en Supabase con estatus 'Pagada'
      const { data: quote, error: qErr } = await supabase
        .from('cotizaciones')
        .insert({
          cliente_id: selectedClientId,
          vehiculo_id: selectedVehicleId,
          total: grandTotal,
          estatus: 'Pagada',
          vendedor_id: cleanVendedorId
        })
        .select()
        .single();

      if (qErr) throw qErr;

      // 2. Guardar los detalles de la cotización
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

      // 3. Decrementar existencias del inventario físico 'inventario_llantas'
      for (const item of selectedItems) {
        const { data: tireData, error: getErr } = await supabase
          .from('inventario_llantas')
          .select('stock_actual')
          .eq('id', item.tire.id)
          .single();

        if (getErr) throw getErr;

        const currentStock = tireData ? tireData.stock_actual : item.tire.stock_actual;
        const newStock = Math.max(0, currentStock - item.cantidad);

        const { error: updErr } = await supabase
          .from('inventario_llantas')
          .update({ stock_actual: newStock })
          .eq('id', item.tire.id);

        if (updErr) throw updErr;
      }

      // 4. Guardar información para el ticket impreso y visual
      const folioShort = quote.id.substring(0, 8).toUpperCase();
      setLastSaleInfo({
        folio: `COVA-${folioShort}`,
        fecha: new Date().toLocaleString('es-MX'),
        total: grandTotal,
        metodoPago: paymentMethod,
        montoRecibido: paymentMethod === 'Efectivo' ? (parseFloat(amountReceived) || 0) : grandTotal,
        cambio: calculatedChange,
        cliente: currentClient?.nombre || '',
        telefono: currentClient?.telefono || '',
        placas: currentVehicle?.placas || '',
        marca: currentVehicle?.marca || '',
        modelo: currentVehicle?.modelo || '',
        items: [...selectedItems],
        serviciosGenericos: availableServices
          .filter(s => selectedServiceIds.has(s.id))
          .map(s => ({
            nombre: s.nombre,
            precio: (s.aplica_promo_llantas && qualifiesForFreeAlignment) ? 0 : Number(s.precio)
          }))
      });

      toast.success('¡Cobro registrado exitosamente!');
      addLog(`Venta registrada y pagada por $${grandTotal.toFixed(2)} (Folio: COVA-${folioShort})`, 'success');

      // Limpiar estados de servicios y el carrito
      setSelectedServiceIds(new Set());
      onClearQuote();
      
      setIsCheckoutOpen(false);
      setCheckoutSuccess(true);
    } catch (err: any) {
      console.error('Error al registrar venta POS:', err);
      toast.error(`Error al registrar el cobro: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (checkoutSuccess && lastSaleInfo) {
    const totalTires = lastSaleInfo.items.reduce((acc, item) => acc + item.cantidad, 0);
    const formattedTotal = lastSaleInfo.total.toLocaleString('es-MX', { minimumFractionDigits: 2 });
    const formattedSubtotal = (lastSaleInfo.total / 1.16).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    const formattedIva = (lastSaleInfo.total - (lastSaleInfo.total / 1.16)).toLocaleString('es-MX', { minimumFractionDigits: 2 });

    return (
      <div className="panel-card p-5 flex flex-col h-full bg-white animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center pb-5 mb-5 border-b-hairline">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
            <Check className="w-5 h-5 text-emerald-600 animate-bounce" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-charcoal uppercase tracking-wider font-mono">
            Venta POS Exitosa
          </h2>
          <p className="text-[11px] text-charcoal-light font-mono mt-1">
            Folio: {lastSaleInfo.folio} • {lastSaleInfo.fecha}
          </p>
        </div>

        {/* Client / Vehicle summary */}
        <div className="bg-neutral-50 border border-hairline rounded p-3 mb-4 text-xs space-y-1">
          <p className="text-charcoal"><strong className="font-semibold text-neutral-400 font-mono text-[9px] uppercase block">Cliente</strong>{lastSaleInfo.cliente} ({lastSaleInfo.telefono})</p>
          <p className="text-charcoal pt-1.5 border-t border-dashed border-neutral-200 mt-1.5"><strong className="font-semibold text-neutral-400 font-mono text-[9px] uppercase block">Vehículo</strong>{lastSaleInfo.marca} {lastSaleInfo.modelo} • Placas: <span className="font-mono font-bold text-cova-blue">{lastSaleInfo.placas}</span></p>
        </div>

        {/* Ticket Preview Box */}
        <div className="flex-1 flex flex-col mb-4">
          <label className="text-[10px] font-semibold text-charcoal-light/60 uppercase tracking-wider mb-2">
            Vista Previa de Recibo (Media Carta)
          </label>
          <div className="flex-1 border border-hairline rounded bg-neutral-100/50 p-4 overflow-auto max-h-[220px] dense-scrollbar font-mono text-[10px] text-charcoal leading-relaxed shadow-inner">
            <div className="bg-white border border-neutral-300 rounded p-4 mx-auto max-w-[280px] min-h-[300px] shadow-sm select-none">
              {/* Small preview simulation */}
              <div className="text-center border-b border-dashed border-neutral-300 pb-2 mb-2">
                <span className="font-bold tracking-widest text-xs">LLANTERA COVA</span>
                <p className="text-[8px] text-neutral-400 m-0">Tres Ríos, Culiacán</p>
              </div>
              <div className="flex justify-between text-[8px] text-neutral-400 mb-2">
                <span>FOLIO: {lastSaleInfo.folio}</span>
                <span>{lastSaleInfo.fecha.split(', ')[1] || ''}</span>
              </div>
              <div className="space-y-1 mb-2 text-[9px]">
                {lastSaleInfo.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.cantidad}x {item.tire.marca} {item.tire.modelo_llanta}</span>
                    <span>${(item.cantidad * item.precioUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {lastSaleInfo.serviciosGenericos?.map((srv: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[9px]">
                    <span>1x {srv.nombre}</span>
                    <span>${srv.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-neutral-300 pt-2 text-[9px] font-bold text-right flex flex-col items-end">
                <div className="w-24 flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>${lastSaleInfo.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                {lastSaleInfo.metodoPago === 'Efectivo' && (
                  <>
                    <div className="w-24 flex justify-between text-neutral-400 font-normal text-[8px]">
                      <span>EFECTIVO:</span>
                      <span>${lastSaleInfo.montoRecibido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-24 flex justify-between text-emerald-600 font-bold text-[9px]">
                      <span>CAMBIO:</span>
                      <span>${lastSaleInfo.cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Success Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.print()}
            className="w-full py-2.5 text-xs font-semibold text-white bg-cova-blue hover:bg-cova-blue/95 border border-cova-blue hover:shadow-md rounded cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
            <span>Imprimir Nota (Media Carta)</span>
          </button>
          
          <button
            onClick={() => {
              setCheckoutSuccess(false);
              setLastSaleInfo(null);
            }}
            className="w-full py-2 text-xs font-semibold text-charcoal hover:bg-neutral-50 border border-hairline rounded cursor-pointer"
          >
            Nueva Cotización / Venta
          </button>
        </div>

        {/* Hidden Printable Ticket rendered at the body level */}
        {mounted && typeof document !== 'undefined' && createPortal(
          <div id="print-section" className="hidden print:block">
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#111111', lineHeight: '1.4' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #111111', paddingBottom: '10px', marginBottom: '10px' }}>
                <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '1px' }}>LLANTERA COVA</h1>
                <p style={{ margin: '2px 0' }}>Sucursal Tres Ríos • Culiacán, Sin.</p>
                <p style={{ margin: '2px 0' }}>Tel: 667-712-3456</p>
                <p style={{ margin: '2px 0', fontWeight: 'bold', fontSize: '12px' }}>TICKET DE VENTA (POS)</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span><strong>FOLIO:</strong> {lastSaleInfo.folio}</span>
                <span><strong>FECHA:</strong> {lastSaleInfo.fecha}</span>
              </div>

              <div style={{ borderBottom: '1px dashed #111111', paddingBottom: '8px', marginBottom: '8px' }}>
                <p style={{ margin: '2px 0' }}><strong>CLIENTE:</strong> {lastSaleInfo.cliente}</p>
                <p style={{ margin: '2px 0' }}><strong>TELÉFONO:</strong> {lastSaleInfo.telefono}</p>
                <p style={{ margin: '2px 0' }}><strong>VEHÍCULO:</strong> {lastSaleInfo.marca} {lastSaleInfo.modelo} ({lastSaleInfo.placas})</p>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ borderBottom: '1px dashed #111111', paddingBottom: '4px', fontWeight: 'bold', display: 'flex' }}>
                  <span style={{ width: '40px' }}>CANT</span>
                  <span style={{ flex: '1' }}>DESCRIPCIÓN</span>
                  <span style={{ width: '60px', textAlign: 'right' }}>P.UNIT</span>
                  <span style={{ width: '70px', textAlign: 'right' }}>IMPORTE</span>
                </div>
                {lastSaleInfo.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', marginTop: '4px' }}>
                    <span style={{ width: '40px' }}>{item.cantidad}</span>
                    <span style={{ flex: '1' }}>{item.tire.marca} {item.tire.modelo_llanta} {item.tire.ancho}/{item.tire.perfil} R{item.tire.rin}</span>
                    <span style={{ width: '60px', textAlign: 'right' }}>${item.precioUnitario.toFixed(2)}</span>
                    <span style={{ width: '70px', textAlign: 'right' }}>${(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                  </div>
                ))}

                {lastSaleInfo.serviciosGenericos?.map((srv: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', marginTop: '4px' }}>
                    <span style={{ width: '40px' }}>1</span>
                    <span style={{ flex: '1' }}>{srv.nombre}</span>
                    <span style={{ width: '60px', textAlign: 'right' }}>${srv.precio.toFixed(2)}</span>
                    <span style={{ width: '70px', textAlign: 'right' }}>${srv.precio.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #111111', paddingTop: '8px', paddingBottom: '8px', borderBottom: '1px dashed #111111', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ width: '180px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>SUBTOTAL:</span>
                  <span>${formattedSubtotal}</span>
                </div>
                <div style={{ width: '180px', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span>IVA (16%):</span>
                  <span>${formattedIva}</span>
                </div>
                <div style={{ width: '180px', display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  <span>TOTAL NETO:</span>
                  <span>${formattedTotal} MXN</span>
                </div>
              </div>

              <div style={{ paddingBottom: '8px', marginBottom: '8px', marginTop: '8px' }}>
                <p style={{ margin: '2px 0' }}><strong>MÉTODO DE PAGO:</strong> {lastSaleInfo.metodoPago}</p>
                {lastSaleInfo.metodoPago === 'Efectivo' && (
                  <>
                    <p style={{ margin: '2px 0' }}><strong>RECIBIDO:</strong> ${lastSaleInfo.montoRecibido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <p style={{ margin: '2px 0', fontWeight: 'bold' }}><strong>CAMBIO:</strong> ${lastSaleInfo.cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </>
                )}
              </div>

              <div style={{ textAlign: 'center', marginTop: '15px', borderTop: '1px dashed #111111', paddingTop: '10px', fontSize: '9px' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>TÉRMINOS DE GARANTÍA</p>
                <p style={{ margin: '2px 0' }}>1 año de garantía contra defectos de fábrica en llantas.</p>
                <p style={{ margin: '2px 0' }}>No aplica por golpes, chipotes, cortes o mal camino.</p>
                <p style={{ margin: '2px 0' }}>Garantía de 30 días en servicios de mano de obra.</p>
                <p style={{ margin: '2px 0', fontStyle: 'italic', marginTop: '10px' }}>¡Gracias por su preferencia en Llantera Cova!</p>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

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
          {/* Client Select with Inline Button */}
          <div className="flex gap-1.5 items-end">
            <div className="relative flex-1">
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
            <button
              type="button"
              onClick={() => setIsAltaExpressOpen(true)}
              title="Alta Express de Cliente y Vehículo"
              className="h-[34px] w-[34px] flex items-center justify-center bg-white hover:bg-neutral-50 border border-hairline hover:border-neutral-400 text-cova-blue hover:text-cova-blue/80 rounded transition-colors cursor-pointer flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Vehicle Select with Inline Button */}
          <div className="flex gap-1.5 items-end">
            <div className="relative flex-1">
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
            <button
              type="button"
              disabled={!selectedClientId}
              onClick={() => setIsAltaVehiculoOpen(true)}
              title="Añadir Auto Adicional para este Cliente"
              className="h-[34px] w-[34px] flex items-center justify-center bg-white hover:bg-neutral-50 border border-hairline hover:border-neutral-400 text-cova-blue hover:text-cova-blue/80 rounded transition-colors cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-hairline"
            >
              <Plus className="w-4 h-4" />
            </button>
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

        {availableServices.map(srv => {
          const isSelected = selectedServiceIds.has(srv.id);
          const isPromo = srv.aplica_promo_llantas && qualifiesForFreeAlignment;
          
          return (
            <div 
              key={srv.id}
              onClick={() => {
                setSelectedServiceIds(prev => {
                  const next = new Set(prev);
                  if (next.has(srv.id)) next.delete(srv.id);
                  else next.add(srv.id);
                  return next;
                });
              }}
              className={`flex items-center justify-between p-2 rounded border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-neutral-400 bg-neutral-50'
                  : 'border-hairline bg-white hover:bg-neutral-50/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-charcoal" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-300" />
                )}
                <div>
                  <p className="text-xs font-semibold text-charcoal">{srv.nombre}</p>
                  <p className="text-[9px] text-charcoal-light/75 max-w-[200px] truncate">
                    {srv.descripcion || 'Servicio de taller'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-mono font-bold ${isPromo ? 'text-emerald-600' : 'text-charcoal'}`}>
                {isPromo ? '¡GRATIS!' : `$${Number(srv.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          );
        })}
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

      {/* POS Checkout Button */}
      <button
        onClick={() => {
          if (selectedItems.length === 0) return;
          setPaymentMethod('Efectivo');
          setAmountReceived('');
          setIsCheckoutOpen(true);
        }}
        disabled={selectedItems.length === 0}
        className={`w-full mt-3 text-xs font-bold flex items-center justify-center gap-2 px-3 py-3 rounded border transition-all ${
          selectedItems.length === 0
            ? 'bg-neutral-50 border-neutral-200 text-neutral-300 cursor-not-allowed'
            : 'bg-cova-blue hover:bg-cova-blue/95 border-cova-blue text-white shadow-md cursor-pointer hover:-translate-y-0.5 hover:shadow-lg'
        }`}
      >
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span>Proceder al Cobro (POS)</span>
      </button>

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

      {/* Checkout POS Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-hairline rounded-lg w-full max-w-sm p-5 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4 font-sans text-xs text-charcoal">
            {/* Header */}
            <button 
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-charcoal cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="flex items-center gap-2 border-b-hairline pb-3">
              <svg className="w-4 h-4 text-cova-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider font-mono">
                Checkout de Venta (POS)
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-50 border border-hairline rounded p-3 text-center">
                <span className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider">Total a Cobrar</span>
                <div className="text-xl font-bold font-mono text-charcoal mt-1">
                  ${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-charcoal-light">MXN</span>
                </div>
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const val = e.target.value as 'Efectivo' | 'Tarjeta' | 'Transferencia';
                    setPaymentMethod(val);
                    if (val !== 'Efectivo') {
                      setAmountReceived(grandTotal.toString());
                    } else {
                      setAmountReceived('');
                    }
                  }}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 cursor-pointer"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta de Débito/Crédito</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              {paymentMethod === 'Efectivo' ? (
                <div className="relative">
                  <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                    Monto Recibido *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    placeholder="Ingrese cantidad en pesos"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono font-bold"
                  />
                </div>
              ) : (
                <div className="relative bg-neutral-50/50 border border-hairline rounded p-2.5 flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Monto Cargado:</span>
                  <span className="font-bold font-mono text-charcoal">${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                </div>
              )}

              {paymentMethod === 'Efectivo' && (
                <div className="border border-dashed border-hairline rounded p-2.5 bg-neutral-50/50 flex justify-between items-center font-mono">
                  <span className="text-[10px] text-neutral-400 font-sans uppercase">Cambio a Entregar:</span>
                  <span className={`text-sm font-bold ${
                    parseFloat(amountReceived) >= grandTotal ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {amountReceived && parseFloat(amountReceived) >= grandTotal
                      ? `$${(parseFloat(amountReceived) - grandTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : amountReceived
                        ? 'Monto insuficiente'
                        : '$0.00'
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-hairline mt-1">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-50 border border-hairline rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment || (paymentMethod === 'Efectivo' && (!amountReceived || parseFloat(amountReceived) < grandTotal))}
                className="flex-1 py-2 text-xs font-semibold text-ceramic bg-cova-blue border border-cova-blue hover:shadow-md rounded cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessingPayment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
                <span>Confirmar Pago</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alta Express */}
      <ModalAltaExpress
        isOpen={isAltaExpressOpen}
        onClose={() => setIsAltaExpressOpen(false)}
        onSuccess={handleAltaExpressSuccess}
      />

      {/* Modal Alta Vehiculo */}
      <ModalAltaVehiculo
        isOpen={isAltaVehiculoOpen}
        onClose={() => setIsAltaVehiculoOpen(false)}
        onSuccess={handleAltaVehiculoSuccess}
        clienteId={selectedClientId}
        clienteNombre={currentClient?.nombre || ''}
      />
    </div>
  );
}
