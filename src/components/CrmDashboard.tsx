'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Save, 
  Send, 
  ListOrdered, 
  Check, 
  AlertCircle, 
  FileCode,
  Loader2,
  Users,
  MessageSquare
} from 'lucide-react';
import ClientsDirectory from './ClientsDirectory';

interface NotificationTemplate {
  id: string;
  nombre: string;
  contenido: string;
}

interface QueueItem {
  id: string;
  telefono: string;
  mensaje: string;
  estado: 'Pendiente' | 'Enviado' | 'Fallido';
  fecha_creacion: string;
  fecha_envio: string | null;
}

export default function CrmDashboard() {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'directorio' | 'whatsapp'>('directorio');

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected' | 'Connecting'>('Disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Template state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('cotizacion');
  const [templateContent, setTemplateContent] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Automation Rules state
  const [rules, setRules] = useState<{ id: string; nombre: string; activa: boolean }[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [forcingScan, setForcingScan] = useState(false);

  // Fetch connection status from Next.js API
  const fetchStatus = async (showLoading = false) => {
    if (showLoading) setLoadingStatus(true);
    try {
      const res = await fetch('/api/whatsapp');
      const data = await res.json();
      setConnectionStatus(data.status || 'Disconnected');
      setQrCode(data.qr || null);
    } catch (err) {
      console.error('Error fetching WhatsApp status API:', err);
      setConnectionStatus('Disconnected');
      setQrCode(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch templates from Supabase
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const { data, error } = await supabase
        .from('plantillas_notificacion')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
      
      // Select first template content
      const first = data?.find(t => t.id === selectedTemplateId);
      if (first) {
        setTemplateContent(first.contenido);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch queue from Supabase
  const fetchQueue = async (showLoading = false) => {
    if (showLoading) setLoadingQueue(true);
    try {
      const { data, error } = await supabase
        .from('cola_notificaciones')
        .select('*')
        .order('fecha_creacion', { ascending: false })
        .limit(20);

      if (error) throw error;
      setQueue(data || []);
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchStatus(true);
    fetchTemplates();
    fetchQueue(true);
    fetchRules();

    // Setup polling intervals for status and queue (every 5 seconds)
    const statusInterval = setInterval(() => fetchStatus(false), 5000);
    const queueInterval = setInterval(() => fetchQueue(false), 5000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(queueInterval);
    };
  }, []);

  // Update editor textarea when selected template changes
  useEffect(() => {
    const matched = templates.find(t => t.id === selectedTemplateId);
    if (matched) {
      setTemplateContent(matched.contenido);
    }
  }, [selectedTemplateId, templates]);

  // Save template update to Supabase
  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from('plantillas_notificacion')
        .update({ contenido: templateContent })
        .eq('id', selectedTemplateId);

      if (error) throw error;
      
      // Update local templates state
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplateId ? { ...t, contenido: templateContent } : t
      ));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Simulate enqueuing a notification
  const handleSimulateNotification = async () => {
    setSimulating(true);
    try {
      // Create mock message replacing bracket keys
      const mockMsg = templateContent
        .replace('{{cliente}}', 'María López')
        .replace('{{vehiculo}}', 'Chevrolet Aveo 2018')
        .replace('{{total}}', '$2,450.00')
        .replace('{{kilometraje}}', '72,050')
        .replace('{{presion_delantera}}', '30')
        .replace('{{presion_trasera}}', '30')
        .replace('{{enlace}}', 'https://cova.mx/c/1024');

      const { error } = await supabase
        .from('cola_notificaciones')
        .insert({
          telefono: '+52 667 987 6543',
          mensaje: mockMsg,
          estado: 'Pendiente'
        });

      if (error) throw error;
      
      // Instantly refresh queue
      await fetchQueue(false);
    } catch (err) {
      console.error('Error simulating notification:', err);
    } finally {
      setSimulating(false);
    }
  };

  const fetchRules = async () => {
    try {
      setLoadingRules(true);
      const { data, error } = await supabase
        .from('reglas_automatizacion')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleToggleRule = async (ruleId: string, active: boolean) => {
    setTogglingRuleId(ruleId);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_rule', ruleId, active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo al actualizar regla');
      
      // Update local state
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, activa: active } : r));
    } catch (err) {
      console.error('Error toggling rule:', err);
      alert('Error al actualizar la regla. Por favor, intenta de nuevo.');
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleForceTestScan = async () => {
    setForcingScan(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_cron' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo al forzar escaneo');
      
      alert(`Ejecución de prueba completada. Se encolaron ${data.enqueuedCount} recordatorios.`);
      // Instantly refresh queue
      await fetchQueue(false);
    } catch (err: any) {
      console.error('Error forcing test scan:', err);
      alert(`Error al forzar la ejecución de prueba: ${err.message}`);
    } finally {
      setForcingScan(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('¿Seguro que deseas desvincular el dispositivo de WhatsApp? Se cerrará la sesión actual y se limpiará la caché local.')) return;
    
    setLoggingOut(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo al desvincular');
      
      // Update local state instantly
      setConnectionStatus('Disconnected');
      setQrCode(null);
      alert('Dispositivo desvinculado con éxito. Puedes escanear un nuevo número.');
    } catch (err: any) {
      console.error('Error logging out:', err);
      alert(`Error al desvincular: ${err.message}`);
    } finally {
      setLoggingOut(false);
      fetchStatus(false);
    }
  };

  const handleRetryMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from('cola_notificaciones')
        .update({ estado: 'Pendiente' })
        .eq('id', msgId);

      if (error) throw error;
      
      // Update local state directly
      setQueue(prev => prev.map(item => item.id === msgId ? { ...item, estado: 'Pendiente' } : item));
    } catch (err) {
      console.error('Error retrying message:', err);
      alert('Error al reintentar el envío del mensaje.');
    }
  };

  const getRuleDescription = (ruleId: string) => {
    switch (ruleId) {
      case 'enviar_cotizacion_auto':
        return 'Envía automáticamente un WhatsApp con el detalle en PDF/link al cliente cuando se genera una cotización en el mostrador.';
      case 'avisar_auto_listo':
        return 'Notifica de inmediato al cliente cuando el estado de su vehículo en el taller se marca como Listo para Entrega.';
      case 'recordatorio_rotacion_6m':
        return 'Analiza las ventas pasadas diariamente y notifica al cliente que es momento de rotar, alinear y balancear sus llantas.';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Pestañas CRM superiores */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg self-start">
        <button
          onClick={() => setActiveTab('directorio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'directorio'
              ? 'bg-white text-cova-blue shadow-sm'
              : 'text-neutral-500 hover:text-charcoal'
          }`}
        >
          <Users className="w-4 h-4" />
          Directorio de Clientes
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-white text-cova-blue shadow-sm'
              : 'text-neutral-500 hover:text-charcoal'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Automatización WhatsApp
        </button>
      </div>

      {activeTab === 'directorio' ? (
        <ClientsDirectory />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
          {/* Panel 1: Estado de Conexión (Takes 4 cols) */}
      <div className="lg:col-span-4 panel-card p-5 bg-white flex flex-col h-full">
        <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
          <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
            WhatsApp Web Gateway
          </span>
          <button 
            onClick={() => fetchStatus(true)}
            className="text-neutral-400 hover:text-charcoal transition-colors"
            title="Actualizar estado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between p-3 bg-neutral-50 border border-hairline rounded mb-4 font-sans select-none">
          <span className="text-xs text-charcoal-light font-medium">Estado del Canal:</span>
          {connectionStatus === 'Connected' ? (
            <span className="text-[10px] bg-cova-blue text-ceramic font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Wifi className="w-3 h-3 text-white" />
              <span>CONECTADO</span>
            </span>
          ) : connectionStatus === 'Connecting' ? (
            <span className="text-[10px] bg-neutral-800 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
              <RefreshCw className="w-3 h-3 text-neutral-300 animate-spin" />
              <span>CONECTANDO</span>
            </span>
          ) : (
            <span className="text-[10px] bg-neutral-200 text-charcoal font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-neutral-500" />
              <span>DESCONECTADO</span>
            </span>
          )}
        </div>

        {/* QR Code / Connection Guide */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 border border-hairline rounded bg-neutral-50/50">
          {connectionStatus === 'Connected' ? (
            <div className="text-center py-6 px-4 flex flex-col items-center">
              <Check className="w-10 h-10 text-emerald-600 bg-emerald-50 rounded-full p-2 mx-auto mb-2 border border-emerald-100" />
              <p className="text-xs font-semibold text-charcoal">Canal Vinculado Exitosamente</p>
              <p className="text-[10px] text-charcoal-light mt-1 leading-relaxed max-w-[200px] mx-auto">
                La pasarela local está enlazada y monitoreando la base de datos de Llantera Cova en segundo plano.
              </p>
              
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-4 text-[9px] font-semibold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-hairline hover:border-red-200 px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loggingOut ? 'Desvinculando...' : 'Desvincular Dispositivo'}
              </button>
            </div>
          ) : qrCode ? (
            <div className="text-center">
              <div className="bg-white p-2 border border-hairline rounded inline-block shadow-sm">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-44 h-44 pointer-events-none select-none"
                />
              </div>
              <p className="text-[10px] font-semibold text-charcoal uppercase tracking-wider mt-3">
                Vincular Dispositivo Web
              </p>
              <p className="text-[9px] text-charcoal-light mt-1 leading-normal max-w-[200px] mx-auto">
                Abre WhatsApp en tu celular y escanea este código desde la sección "Dispositivos Vinculados".
              </p>
            </div>
          ) : (
            <div className="text-center py-10">
              <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto mb-2" />
              <p className="text-[10px] text-neutral-400 font-mono">Esperando generación de QR...</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel 2: Editor de Plantillas (Takes 4 cols) */}
      <div className="lg:col-span-4 panel-card p-5 bg-white flex flex-col h-full">
        <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
          <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
            Editor de Plantillas CRM
          </span>
          
          {saveSuccess && (
            <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" />
              <span>Guardado</span>
            </span>
          )}
        </div>

        {loadingTemplates ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <span className="text-xs text-charcoal-light animate-pulse font-medium">Cargando plantillas...</span>
          </div>
        ) : (
          <div className="space-y-4 flex flex-col h-full flex-1">
            {/* Template Selector */}
            <div className="relative">
              <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                Seleccionar Plantilla
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 appearance-none cursor-pointer"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {/* Template Text Area */}
            <div className="relative flex-1 min-h-[180px]">
              <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                Cuerpo del Mensaje
              </label>
              <textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="w-full h-full bg-white border border-hairline rounded pt-5 pb-2 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-sans resize-none"
              />
            </div>

            {/* Dynamic replacement keys guide */}
            <div className="bg-neutral-50 border border-hairline rounded p-2.5 text-[9px] font-mono text-charcoal-light leading-relaxed">
              <span className="font-semibold block uppercase font-sans text-[8px] text-neutral-400 mb-1">Claves Dinámicas Compatibles:</span>
              <span>{"{{cliente}}"} • {"{{vehiculo}}"} • {"{{total}}"} • {"{{kilometraje}}"} • {"{{presion_delantera}}"} • {"{{presion_trasera}}"}</span>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="w-full py-2.5 text-xs font-semibold rounded border border-cova-blue bg-cova-blue text-ceramic hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {savingTemplate ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-white" />
              )}
              <span>Guardar Plantilla</span>
            </button>
          </div>
        )}
      </div>

      {/* Panel 3: Monitor de Cola (Takes 4 cols) */}
      <div className="lg:col-span-4 panel-card p-5 bg-white flex flex-col h-full">
        <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
          <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
            Monitor de Envios (Cola)
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchQueue(true)}
              className="text-neutral-400 hover:text-charcoal transition-colors"
              title="Recargar cola"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleSimulateNotification}
              disabled={simulating}
              className="text-[9px] font-bold bg-white hover:bg-neutral-50 text-charcoal border border-hairline hover:border-neutral-400 px-2 py-1 rounded transition-all flex items-center gap-1 hover:-translate-y-0.5 shadow-sm cursor-pointer"
              title="Insertar mensaje pendiente en Supabase"
            >
              {simulating ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Send className="w-2.5 h-2.5 text-cova-blue" />
              )}
              <span>Simular Envio</span>
            </button>
          </div>
        </div>

        {/* Audit Queue Table List */}
        <div className="flex-1 overflow-auto border border-hairline rounded dense-scrollbar min-h-[300px] max-h-[340px] bg-neutral-50/20">
          {loadingQueue ? (
            <div className="h-full flex items-center justify-center py-12">
              <span className="text-xs text-charcoal-light animate-pulse font-medium">Cargando cola...</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center p-4">
              <ListOrdered className="w-6 h-6 text-neutral-300 mb-1" />
              <p className="text-[10px] text-neutral-400 font-medium">La cola está vacía</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {queue.map((item) => {
                let statusBadge = 'bg-neutral-100 text-neutral-600';
                if (item.estado === 'Enviado') statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                if (item.estado === 'Fallido') statusBadge = 'bg-red-50 text-red-700 border border-red-100';
                
                return (
                  <div key={item.id} className="p-2.5 hover:bg-white transition-colors flex flex-col gap-1 text-[10px] font-mono leading-relaxed">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-charcoal font-sans">{item.telefono}</span>
                      
                      <div className="flex items-center gap-1.5">
                        {item.estado === 'Fallido' && (
                          <button
                            onClick={() => handleRetryMessage(item.id)}
                            className="p-0.5 text-neutral-400 hover:text-cova-blue hover:bg-neutral-100 rounded transition-all cursor-pointer"
                            title="Reintentar envío"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span className={`px-1 rounded text-[8px] uppercase tracking-wider font-semibold ${statusBadge}`}>
                          {item.estado}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-charcoal-light text-[9px] line-clamp-2 leading-normal font-sans">
                      {item.mensaje}
                    </p>

                    <div className="flex items-center justify-between text-[8px] text-neutral-400 pt-0.5 border-t border-dashed border-neutral-100 mt-0.5">
                      <span>Creado: {new Date(item.fecha_creacion).toLocaleTimeString()}</span>
                      {item.fecha_envio && (
                        <span>Enviado: {new Date(item.fecha_envio).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel 4: Reglas de Automatización Activas (Takes 12 cols, below) */}
      <div className="lg:col-span-12 panel-card p-5 bg-white flex flex-col">
        <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Reglas de Automatización Activas
            </span>
            <span className="text-[9px] bg-neutral-100 text-charcoal-light font-mono px-1.5 py-0.5 rounded">
              Bento Automation Engine
            </span>
          </div>
          
          <button
            onClick={handleForceTestScan}
            disabled={forcingScan}
            className="text-[9px] font-bold bg-white hover:bg-neutral-50 text-charcoal border border-hairline hover:border-neutral-400 px-3 py-1.5 rounded transition-all flex items-center gap-1.5 hover:-translate-y-0.5 shadow-sm cursor-pointer"
          >
            {forcingScan ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 text-cova-blue" />
            )}
            <span>Forzar Ejecución de Prueba (6 Meses)</span>
          </button>
        </div>

        {loadingRules ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-charcoal-light animate-pulse font-medium">Cargando reglas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                className="p-4 border border-hairline rounded bg-neutral-50/50 flex flex-col justify-between hover:border-neutral-300 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                      {rule.id.replace(/_/g, ' ')}
                    </span>
                    
                    {/* Switch toggle */}
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rule.activa} 
                        onChange={() => handleToggleRule(rule.id, !rule.activa)}
                        className="sr-only peer"
                        disabled={togglingRuleId === rule.id}
                      />
                      <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cova-blue"></div>
                    </label>
                  </div>
                  
                  <h4 className="text-xs font-semibold text-charcoal mb-1">
                    {rule.nombre}
                  </h4>
                  <p className="text-[10px] text-charcoal-light leading-relaxed">
                    {getRuleDescription(rule.id)}
                  </p>
                </div>
                
                <div className="mt-3 pt-3 border-t border-dashed border-neutral-200 flex items-center justify-between text-[9px]">
                  <span className="text-neutral-400 font-mono">Estado:</span>
                  <span className={`font-semibold ${rule.activa ? 'text-cova-blue' : 'text-neutral-400'}`}>
                    {rule.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
