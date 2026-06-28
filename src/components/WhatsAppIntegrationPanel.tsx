"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Save, 
  Check, 
  Loader2,
  ArrowLeft,
  Plus,
  MessageSquare,
  Zap,
  Settings2
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  nombre: string;
  contenido: string;
}

interface AutomationRule {
  id: string;
  nombre: string;
  activa: boolean;
}

interface WhatsAppIntegrationPanelProps {
  onBack: () => void;
}

export default function WhatsAppIntegrationPanel({ onBack }: WhatsAppIntegrationPanelProps) {
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected' | 'Connecting'>('Disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [editingTemplateContent, setEditingTemplateContent] = useState('');
  const [isNewRule, setIsNewRule] = useState(false);
  const [newRuleId, setNewRuleId] = useState('');
  const [savingModal, setSavingModal] = useState(false);

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

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [rulesRes, templatesRes] = await Promise.all([
        supabase.from('reglas_automatizacion').select('*').order('id', { ascending: true }),
        supabase.from('plantillas_notificacion').select('*')
      ]);
      if (rulesRes.data) setRules(rulesRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    loadData();
    const statusInterval = setInterval(() => fetchStatus(false), 5000);
    return () => clearInterval(statusInterval);
  }, []);

  const handleLogout = async () => {
    if (!confirm('¿Seguro que deseas desvincular el dispositivo de WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
      setConnectionStatus('Disconnected');
      setQrCode(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Helper to map old hardcoded rule IDs to template IDs
  const getTemplateIdForRule = (ruleId: string) => {
    if (ruleId === 'enviar_cotizacion_auto') return 'cotizacion';
    if (ruleId === 'avisar_auto_listo') return 'auto_listo';
    if (ruleId === 'recordatorio_rotacion_6m') return 'recordatorio_rotacion';
    return ruleId; // For custom rules, template ID == rule ID
  };

  const handleOpenRule = (rule?: AutomationRule) => {
    if (rule) {
      const tId = getTemplateIdForRule(rule.id);
      const matchedTemplate = templates.find(t => t.id === tId);
      
      setEditingRule({ ...rule });
      setEditingTemplateContent(matchedTemplate?.contenido || '');
      setIsNewRule(false);
    } else {
      setEditingRule({ id: '', nombre: '', activa: true });
      setEditingTemplateContent('Hola {{cliente}}, ');
      setIsNewRule(true);
      setNewRuleId(`regla_${Date.now()}`);
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingRule) return;
    setSavingModal(true);
    try {
      const finalRuleId = isNewRule ? newRuleId : editingRule.id;
      const tId = getTemplateIdForRule(finalRuleId);

      // Save Rule
      const rulePayload = { id: finalRuleId, nombre: editingRule.nombre, activa: editingRule.activa };
      const { error: ruleErr } = await supabase.from('reglas_automatizacion').upsert(rulePayload);
      if (ruleErr) throw ruleErr;

      // Save Template
      const templatePayload = { id: tId, nombre: `Plantilla para ${editingRule.nombre}`, contenido: editingTemplateContent };
      const { error: tempErr } = await supabase.from('plantillas_notificacion').upsert(templatePayload);
      if (tempErr) throw tempErr;

      // Ensure API is updated about rule toggle if needed (mocked here if your API needs it)
      if (!isNewRule) {
        fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_rule', ruleId: finalRuleId, active: editingRule.activa })
        }).catch(console.error);
      }

      await loadData();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error guardando la automatización');
    } finally {
      setSavingModal(false);
    }
  };

  const handleToggleRuleQuick = async (rule: AutomationRule, active: boolean) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, activa: active } : r));
    try {
      await supabase.from('reglas_automatizacion').update({ activa: active }).eq('id', rule.id);
      fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_rule', ruleId: rule.id, active })
      }).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Configuración de WhatsApp</h2>
            <p className="text-sm text-zinc-500">Gestiona la conexión y tus flujos de automatización.</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenRule()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Nueva Regla
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Izquierdo: Dispositivo */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col shadow-sm h-full">
          <div className="pb-3 mb-4 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Settings2 size={16} className="text-zinc-400" /> Dispositivo Vinculado
            </span>
            <button onClick={() => fetchStatus(true)} className="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer">
              <RefreshCw size={16} className={loadingStatus ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl mb-4">
            <span className="text-xs text-zinc-500 font-medium">Estado del Canal:</span>
            {connectionStatus === 'Connected' ? (
              <span className="text-[10px] bg-green-500 text-white font-bold px-2 py-1 rounded flex items-center gap-1">
                <Wifi size={12} /> CONECTADO
              </span>
            ) : connectionStatus === 'Connecting' ? (
              <span className="text-[10px] bg-zinc-800 text-white font-bold px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                <RefreshCw size={12} className="animate-spin" /> CONECTANDO
              </span>
            ) : (
              <span className="text-[10px] bg-zinc-200 text-zinc-500 font-bold px-2 py-1 rounded flex items-center gap-1">
                <WifiOff size={12} /> DESCONECTADO
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
            {connectionStatus === 'Connected' ? (
              <div className="text-center py-6 px-4 flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                  <Check size={24} />
                </div>
                <p className="text-sm font-bold text-zinc-900">Canal Vinculado Exitosamente</p>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  Cova está enviando mensajes en segundo plano desde tu número.
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-6 text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-zinc-200 hover:border-red-200 px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  Desvincular Dispositivo
                </button>
              </div>
            ) : qrCode ? (
              <div className="text-center py-4">
                <div className="bg-white p-3 border border-zinc-200 rounded-xl inline-block shadow-sm mb-4">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 pointer-events-none select-none" />
                </div>
                <p className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">Vincular Dispositivo Web</p>
                <p className="text-xs text-zinc-500 leading-normal max-w-[220px] mx-auto">Abre WhatsApp en tu celular y escanea este código en "Dispositivos Vinculados".</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-zinc-300 animate-spin mx-auto mb-3" />
                <p className="text-xs text-zinc-400 font-mono">Generando QR de sesión...</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Lista de Automatizaciones */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm min-h-[500px]">
          <div className="pb-3 mb-4 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-purple-500" /> Tus Automatizaciones
            </span>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {rules.map((rule) => {
                const tId = getTemplateIdForRule(rule.id);
                const matchedTemplate = templates.find(t => t.id === tId);

                return (
                  <div key={rule.id} className="border border-zinc-200 rounded-xl p-4 hover:border-purple-300 transition-all flex flex-col gap-3 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${rule.activa ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-zinc-300'}`}></div>
                        <h4 className="text-sm font-bold text-zinc-900">{rule.nombre}</h4>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={rule.activa} 
                            onChange={(e) => handleToggleRuleQuick(rule, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 relative overflow-hidden group-hover:bg-purple-50/30 transition-colors">
                      <MessageSquare size={14} className="absolute top-3 left-3 text-zinc-300" />
                      <p className="text-xs text-zinc-500 pl-6 line-clamp-2 leading-relaxed">
                        {matchedTemplate?.contenido || 'Sin plantilla configurada.'}
                      </p>
                    </div>

                    <div className="flex justify-end mt-1">
                      <button onClick={() => handleOpenRule(rule)} className="text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer">
                        Editar Configuración
                      </button>
                    </div>
                  </div>
                );
              })}
              {rules.length === 0 && (
                <div className="text-center py-12 text-zinc-500 text-sm">No tienes reglas configuradas.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL UNIFICADO */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Zap size={18} className="text-purple-500" />
                {isNewRule ? 'Nueva Automatización' : 'Editar Automatización'}
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-6">
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nombre del Evento (Trigger)</label>
                <input 
                  type="text" 
                  value={editingRule.nombre} 
                  onChange={e => setEditingRule({...editingRule, nombre: e.target.value})} 
                  placeholder="Ej. Enviar cupón a los 10 días"
                  className="w-full border border-zinc-200 rounded-lg p-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-purple-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div>
                  <span className="text-sm font-bold text-zinc-900 block">Estado de la Regla</span>
                  <span className="text-xs text-zinc-500">¿Debe ejecutarse este envío automático?</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={editingRule.activa} 
                    onChange={e => setEditingRule({...editingRule, activa: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Mensaje de WhatsApp a Enviar</label>
                <textarea
                  value={editingTemplateContent}
                  onChange={(e) => setEditingTemplateContent(e.target.value)}
                  className="w-full min-h-[140px] bg-white border border-zinc-200 rounded-lg p-3 text-sm text-zinc-900 focus:outline-none focus:border-purple-500 font-sans resize-none"
                  placeholder="Hola {{cliente}}..."
                />
              </div>

              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3">
                <span className="font-bold uppercase font-sans text-[10px] text-purple-600 mb-1 block">Variables Dinámicas:</span>
                <p className="text-xs text-purple-800 font-mono leading-relaxed">
                  {"{{cliente}}"} • {"{{vehiculo}}"} • {"{{total}}"} • {"{{kilometraje}}"} • {"{{enlace}}"}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveModal}
                  disabled={savingModal || !editingRule.nombre.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingModal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar Automatización
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
