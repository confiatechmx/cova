"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import WhatsAppIntegrationPanel from "../../../components/WhatsAppIntegrationPanel";
import { Loader2, Settings, Building2, Landmark, CheckCircle2, Users, Plus, Pencil, Shield, UserCog, Wrench, PlugZap, MessageSquare, Receipt, Calculator, Smartphone } from "lucide-react";

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tab: General & Pagos
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [empresa, setEmpresa] = useState<any>(null);
  const [pagosConfig, setPagosConfig] = useState<any[]>([]);

  // Tab: Personal (Equipo)
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nombre: "", rol: "Mecánico", telefono: "", activo: true });
  const [savingEmpleado, setSavingEmpleado] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Load Config
      const { data: empData } = await supabase.from('empresas').select('*').limit(1).single();
      if (empData) setEmpresa(empData);

      const { data: pagosData } = await supabase.from('configuracion_pagos').select('*').order('proveedor');
      if (pagosData) setPagosConfig(pagosData);

      // Load Staff
      const { data: empList } = await supabase.from('empleados').select('*').order('rol').order('nombre');
      if (empList) setEmpleados(empList);

      setLoading(false);
    }
    loadData();
  }, []);

  // --- Handlers: General & Pagos ---
  const handleEmpresaChange = (field: string, value: string | number) => {
    setEmpresa({ ...empresa, [field]: value });
  };

  const handlePagoChange = (id: string, field: string, value: string | number | boolean) => {
    setPagosConfig(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveMessage("");

    if (empresa) {
      await supabase.from('empresas').update({
        nombre_comercial: empresa.nombre_comercial,
        rfc: empresa.rfc,
        direccion: empresa.direccion,
        tasa_iva: empresa.tasa_iva
      }).eq('id', empresa.id);
    }

    if (pagosConfig.length > 0) {
      for (const p of pagosConfig) {
        await supabase.from('configuracion_pagos').update({
          comision_porcentaje: p.comision_porcentaje,
          activo: p.activo
        }).eq('id', p.id);
      }
    }

    setSaving(false);
    setSaveMessage("Configuración guardada correctamente.");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  // --- Handlers: Personal ---
  const loadEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('*').order('rol').order('nombre');
    if (data) setEmpleados(data);
  };

  const handleOpenModal = (empleado?: any) => {
    if (empleado) {
      setEditingId(empleado.id);
      setFormData({ nombre: empleado.nombre, rol: empleado.rol, telefono: empleado.telefono || "", activo: empleado.activo });
    } else {
      setEditingId(null);
      setFormData({ nombre: "", rol: "Mecánico", telefono: "", activo: true });
    }
    setIsModalOpen(true);
  };

  const handleSaveEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmpleado(true);
    
    if (editingId) {
      await supabase.from('empleados').update(formData).eq('id', editingId);
    } else {
      await supabase.from('empleados').insert(formData);
    }
    
    await loadEmpleados();
    setIsModalOpen(false);
    setSavingEmpleado(false);
  };

  const getRoleIcon = (rol: string) => {
    switch (rol) {
      case 'Administrador': return <Shield size={16} className="text-purple-600" />;
      case 'Asesor': return <UserCog size={16} className="text-blue-600" />;
      case 'Mecánico': return <Wrench size={16} className="text-amber-600" />;
      default: return <Users size={16} className="text-zinc-400" />;
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  const inputClasses = "w-full border border-zinc-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all bg-white";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24 md:pb-0 relative">
      
      {/* Header & Tabs */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <header className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-100 text-zinc-600 rounded-xl flex items-center justify-center">
              <Settings size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Configuración del Sistema</h1>
              <p className="text-sm text-zinc-500 font-medium">Ajustes globales, personal y comisiones de pago</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab !== 'Personal' && saveMessage && <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} /> {saveMessage}</span>}
            
            {activeTab === 'Personal' ? (
              <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                <Plus size={16} /> Nuevo Empleado
              </button>
            ) : (
              <button onClick={handleSaveConfig} disabled={saving} className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Guardar Cambios"}
              </button>
            )}
          </div>
        </header>

        <nav className="flex items-center px-6 gap-6">
          <button onClick={() => setActiveTab("General")} className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "General" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}>
            Perfil del Negocio
          </button>
          <button onClick={() => setActiveTab("Personal")} className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "Personal" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}>
            Gestión de Personal
          </button>
          <button onClick={() => setActiveTab("Pagos")} className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "Pagos" ? "border-emerald-600 text-emerald-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}>
            Pasarelas de Pago
          </button>
          <button onClick={() => setActiveTab("Integraciones")} className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "Integraciones" ? "border-purple-600 text-purple-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}>
            Integraciones
          </button>
        </nav>
      </div>

      <main className="flex-1 p-6 overflow-x-hidden">
        
        {/* TAB: GENERAL */}
        {activeTab === "General" && (
          <div className="max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-zinc-400" />
              Datos Generales de la Empresa
            </h2>
            
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 flex flex-col gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nombre Comercial</label>
                <input type="text" value={empresa?.nombre_comercial || ""} onChange={(e) => handleEmpresaChange('nombre_comercial', e.target.value)} className={inputClasses} placeholder="Ej. AutoService Cova"/>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">RFC</label>
                  <input type="text" value={empresa?.rfc || ""} onChange={(e) => handleEmpresaChange('rfc', e.target.value)} className={inputClasses} placeholder="XAXX010101000"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">% IVA Aplicable</label>
                  <div className="flex items-center">
                    <input type="number" value={empresa?.tasa_iva || 0} onChange={(e) => handleEmpresaChange('tasa_iva', parseFloat(e.target.value))} className={`${inputClasses} rounded-r-none border-r-0`}/>
                    <span className="bg-zinc-50 border border-zinc-200 border-l-0 rounded-r-lg p-2.5 text-zinc-500 text-sm font-bold">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Dirección de la Sucursal</label>
                <textarea value={empresa?.direccion || ""} onChange={(e) => handleEmpresaChange('direccion', e.target.value)} className={inputClasses} rows={3} placeholder="Calle, Número, Colonia, Ciudad..."/>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PAGOS */}
        {activeTab === "Pagos" && (
          <div className="max-w-3xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Landmark size={16} className="text-emerald-500" />
              Pasarelas de Pago y Comisiones
            </h2>
            
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-emerald-50/50 border-b border-zinc-100">
                <p className="text-xs text-zinc-600 font-medium">Activa o desactiva los métodos de pago que aceptas en el Expediente Operativo y define la comisión que te cobra cada proveedor. Esto se descontará de tus ingresos netos en Caja.</p>
              </div>
              <div className="divide-y divide-zinc-100">
                {pagosConfig.map(p => (
                  <div key={p.id} className="p-5 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={p.activo}
                        onChange={(e) => handlePagoChange(p.id, 'activo', e.target.checked)}
                        className="w-5 h-5 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className={`font-bold ${p.activo ? 'text-zinc-900' : 'text-zinc-400 line-through'}`}>{p.proveedor}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Comisión cobrada</span>
                      <div className="flex items-center w-28">
                        <input 
                          type="number" 
                          step="0.1"
                          value={p.comision_porcentaje} 
                          disabled={!p.activo}
                          onChange={(e) => handlePagoChange(p.id, 'comision_porcentaje', parseFloat(e.target.value))}
                          className={`w-full border border-zinc-200 rounded-l-lg p-2 text-base focus:outline-none focus:border-emerald-500 font-mono font-bold text-right ${!p.activo ? 'bg-zinc-100 text-zinc-400' : 'bg-white text-zinc-900'}`}
                        />
                        <span className={`border border-l-0 border-zinc-200 rounded-r-lg p-2 text-sm font-bold ${!p.activo ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-50 text-zinc-500'}`}>%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PERSONAL */}
        {activeTab === "Personal" && (
          <div className="max-w-5xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              Gestión de Staff y Empleados ({empleados.length})
            </h2>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/80 border-b border-zinc-100 text-xs uppercase font-bold text-zinc-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Nombre Completo</th>
                    <th className="px-6 py-4">Rol / Puesto</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4 text-center">Estatus</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {empleados.map(emp => (
                    <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`font-bold ${emp.activo ? 'text-zinc-900' : 'text-zinc-400'}`}>{emp.nombre}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 ${!emp.activo && 'opacity-50'}`}>
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${emp.rol === 'Administrador' ? 'bg-purple-100' : emp.rol === 'Asesor' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                            {getRoleIcon(emp.rol)}
                          </div>
                          <span className="text-sm font-semibold text-zinc-700">{emp.rol}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${emp.activo ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {emp.telefono || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${emp.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {emp.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenModal(emp)} className="text-zinc-400 hover:text-blue-600 transition-colors p-2">
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {empleados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                        No hay empleados registrados en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: INTEGRACIONES */}
        {activeTab === "Integraciones" && (
          <div className="max-w-5xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2 mb-2">
              <PlugZap size={16} className="text-purple-500" />
              Directorio de Integraciones
            </h2>

            {!activeIntegration ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                
                {/* WhatsApp */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg mb-1">WhatsApp Business</h3>
                  <p className="text-sm text-zinc-500 mb-6 flex-1">Envía notificaciones automáticas y cotizaciones directo al celular de tu cliente.</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-1 rounded">Instalado</span>
                    <button onClick={() => setActiveIntegration('whatsapp')} className="text-sm font-bold text-green-600 hover:text-green-800">Gestionar</button>
                  </div>
                </div>

                {/* Facturama / SAT */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Receipt size={24} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg mb-1">Facturación Electrónica</h3>
                  <p className="text-sm text-zinc-500 mb-6 flex-1">Emite facturas CFDI 4.0 con un solo clic desde el expediente de la orden de servicio.</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 px-2 py-1 rounded">Próximamente</span>
                    <button disabled className="text-sm font-bold text-zinc-400">Ver Detalles</button>
                  </div>
                </div>

                {/* QuickBooks */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calculator size={24} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg mb-1">QuickBooks / Xero</h3>
                  <p className="text-sm text-zinc-500 mb-6 flex-1">Sincroniza tus ingresos y cortes de caja diarios automáticamente con tu software contable.</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 px-2 py-1 rounded">Próximamente</span>
                    <button disabled className="text-sm font-bold text-zinc-400">Ver Detalles</button>
                  </div>
                </div>

                {/* Mercado Pago Point Smart */}
                <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Smartphone size={24} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg mb-1">Terminales Inteligentes</h3>
                  <p className="text-sm text-zinc-500 mb-6 flex-1">Conecta Cova directamente con tu terminal física para cobrar sin teclear el monto manual.</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-1 rounded">Fase Beta</span>
                    <button className="text-sm font-bold text-blue-600 hover:text-blue-800">Conectar API</button>
                  </div>
                </div>

              </div>
            ) : (
              activeIntegration === 'whatsapp' && (
                <div className="mt-2">
                  <WhatsAppIntegrationPanel onBack={() => setActiveIntegration(null)} />
                </div>
              )
            )}
          </div>
        )}

      </main>

      {/* Modal CRUD Empleados */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-lg font-bold text-zinc-900">{editingId ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
            </div>
            <form onSubmit={handleSaveEmpleado} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className={inputClasses} placeholder="Juan Pérez"/>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Rol en el Taller</label>
                  <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} className={`${inputClasses} font-medium`}>
                    <option value="Mecánico">Mecánico</option>
                    <option value="Asesor">Asesor</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className={inputClasses} placeholder="10 dígitos"/>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="activo" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 cursor-pointer"/>
                <label htmlFor="activo" className="text-sm font-semibold text-zinc-700 cursor-pointer">Empleado Activo en el Sistema</label>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingEmpleado} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                  {savingEmpleado ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
