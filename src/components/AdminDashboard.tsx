'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ServicesCRUD from './ServicesCRUD';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  Loader2, 
  Save, 
  Plus, 
  X,
  UserCheck,
  UserX
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface Empleado {
  id: string;
  nombre: string;
  rol: 'Administrador' | 'Vendedor' | 'Mecánico' | string;
  activo: boolean;
}

interface OrderStats {
  mecanico_id: string;
  nombre_mecanico: string;
  total_servicios: number;
  en_proceso: number;
  listos: number;
}

interface SalesStats {
  vendedor_id: string;
  nombre_vendedor: string;
  total_cotizado: number;
  ventas_cerradas: number;
  monto_total: number;
}

export default function AdminDashboard() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    rol: 'Mecánico',
    activo: true
  });

  // Analytics states
  const [mecanicoStats, setMecanicoStats] = useState<OrderStats[]>([]);
  const [vendedorStats, setVendedorStats] = useState<SalesStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Sub-tabs
  const [activeAdminTab, setActiveAdminTab] = useState<'personal' | 'servicios'>('personal');

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      setEmpleados(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingStats(true);
      
      // 1. Fetch employees to map names
      const { data: empData, error: empErr } = await supabase
        .from('empleados')
        .select('id, nombre, rol');
      if (empErr) throw empErr;
      const employees = empData || [];

      // 2. Fetch orders to calculate mechanic stats
      const { data: ordData, error: ordErr } = await supabase
        .from('ordenes_servicio')
        .select('mecanico_id, estado');
      if (ordErr) throw ordErr;
      const orders = ordData || [];

      // 3. Fetch quotes to calculate vendor stats
      const { data: qteData, error: qteErr } = await supabase
        .from('cotizaciones')
        .select('vendedor_id, total, estatus');
      if (qteErr) throw qteErr;
      const quotes = qteData || [];

      // Calculate Mechanic Stats
      const mStats: OrderStats[] = employees
        .filter(e => e.rol === 'Mecánico')
        .map(e => {
          const mechOrders = orders.filter(o => o.mecanico_id === e.id);
          return {
            mecanico_id: e.id,
            nombre_mecanico: e.nombre,
            total_servicios: mechOrders.length,
            en_proceso: mechOrders.filter(o => o.estado === 'En Proceso').length,
            listos: mechOrders.filter(o => o.estado === 'Listo para Entrega').length
          };
        });
      setMecanicoStats(mStats);

      // Calculate Vendor Stats
      const vStats: SalesStats[] = employees
        .filter(e => e.rol === 'Vendedor')
        .map(e => {
          const vendQuotes = quotes.filter(q => q.vendedor_id === e.id);
          const closedQuotes = vendQuotes.filter(q => q.estatus === 'Aceptada');
          const sumTotal = closedQuotes.reduce((sum, q) => sum + parseFloat(q.total || '0'), 0);
          return {
            vendedor_id: e.id,
            nombre_vendedor: e.nombre,
            total_cotizado: vendQuotes.length,
            ventas_cerradas: closedQuotes.length,
            monto_total: sumTotal
          };
        });
      setVendedorStats(vStats);

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchEmpleados();
    fetchAnalytics();
  }, []);

  const handleOpenAddModal = () => {
    setEditingEmpleado(null);
    setFormData({
      nombre: '',
      rol: 'Mecánico',
      activo: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Empleado) => {
    setEditingEmpleado(emp);
    setFormData({
      nombre: emp.nombre,
      rol: emp.rol,
      activo: emp.activo
    });
    setIsModalOpen(true);
  };

  const handleSaveEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingEmpleado) {
        // Update
        const { error } = await supabase
          .from('empleados')
          .update(formData)
          .eq('id', editingEmpleado.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('empleados')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      await fetchEmpleados();
      await fetchAnalytics();
    } catch (err) {
      console.error('Error saving employee:', err);
      alert('Error al guardar el registro del empleado.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp: Empleado) => {
    try {
      const nextActive = !emp.activo;
      // Optimistic update
      setEmpleados(prev => prev.map(e => e.id === emp.id ? { ...e, activo: nextActive } : e));
      
      const { error } = await supabase
        .from('empleados')
        .update({ activo: nextActive })
        .eq('id', emp.id);
        
      if (error) throw error;
      await fetchAnalytics(); // Refresh stats too
    } catch (err) {
      console.error('Error toggling active state:', err);
      // Rollback
      setEmpleados(prev => prev.map(e => e.id === emp.id ? { ...e, activo: emp.activo } : e));
      alert('Error al modificar el estado del empleado.');
    }
  };

  return (
    <div className="flex flex-col gap-5 flex-1 w-full">
      {/* Sub-tabs Admin */}
      <div className="flex border-b border-hairline bg-white rounded p-1 shadow-sm select-none w-fit">
        <button
          onClick={() => setActiveAdminTab('personal')}
          className={`py-2 px-6 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
            activeAdminTab === 'personal'
              ? 'border-cova-blue text-cova-blue'
              : 'border-transparent text-neutral-400 hover:text-charcoal'
          }`}
        >
          Personal y Analíticas
        </button>
        <button
          onClick={() => setActiveAdminTab('servicios')}
          className={`py-2 px-6 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
            activeAdminTab === 'servicios'
              ? 'border-cova-blue text-cova-blue'
              : 'border-transparent text-neutral-400 hover:text-charcoal'
          }`}
        >
          Catálogo de Servicios
        </button>
      </div>

      {activeAdminTab === 'personal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start font-sans">
          {/* Panel Izquierdo: CRUD Personal */}
      <div className="lg:col-span-7 panel-card p-5 bg-white flex flex-col shadow-sm">
        <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cova-blue" />
            <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Control de Personal y Plantilla
            </span>
          </div>
          
          <button
            onClick={handleOpenAddModal}
            className="text-[10px] bg-cova-blue text-ceramic font-bold hover:shadow-md px-3 py-1.5 rounded flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5 text-white" />
            <span>Agregar Empleado</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-charcoal-light animate-pulse font-medium">
            Cargando empleados registrados...
          </div>
        ) : (
          <div className="overflow-auto border border-hairline rounded bg-neutral-50/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-hairline text-neutral-500 font-mono text-[9px] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-4 font-semibold">Empleado</th>
                  <th className="py-2.5 px-3 font-semibold">Rol Asignado</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Estado</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {empleados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-charcoal">
                      {emp.nombre}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                        emp.rol === 'Administrador' 
                          ? 'bg-cova-blue/10 text-cova-blue' 
                          : emp.rol === 'Vendedor'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {emp.rol}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center">
                        {/* Custom Role Switch */}
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={emp.activo} 
                            onChange={() => handleToggleActive(emp)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cova-blue"></div>
                        </label>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="p-1 text-neutral-400 hover:text-charcoal hover:bg-neutral-100 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                        title="Editar Datos"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel Derecho: Analytics Bento */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Bento Stats 1: Desempeño Mecánicos */}
        <div className="panel-card p-5 bg-white flex flex-col shadow-sm">
          <div className="pb-2.5 mb-3.5 border-b-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Desempeño Operativo (Mecánicos)
              </span>
            </div>
            <span className="text-[9px] bg-amber-50 text-amber-700 font-mono font-bold px-1.5 py-0.5 rounded border border-amber-100">
              Patio
            </span>
          </div>

          {loadingStats ? (
            <div className="py-8 text-center text-xs text-charcoal-light animate-pulse font-medium">
              Calculando estadísticas de taller...
            </div>
          ) : mecanicoStats.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 font-sans">
              No hay mecánicos registrados
            </div>
          ) : (
            <div className="h-64 mt-2 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mecanicoStats}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre_mecanico" type="category" width={80} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                  <Bar dataKey="en_proceso" name="En Proceso" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={24} />
                  <Bar dataKey="listos" name="Listos" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bento Stats 2: Desempeño Vendedores */}
        <div className="panel-card p-5 bg-white flex flex-col shadow-sm">
          <div className="pb-2.5 mb-3.5 border-b-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Desempeño Comercial (Ventas)
              </span>
            </div>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-100">
              Mostrador
            </span>
          </div>

          {loadingStats ? (
            <div className="py-8 text-center text-xs text-charcoal-light animate-pulse font-medium">
              Calculando volumen transaccional...
            </div>
          ) : vendedorStats.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 font-sans">
              No hay vendedores registrados
            </div>
          ) : (
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vendedorStats}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="nombre_vendedor" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${val.toLocaleString()}`} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    formatter={(value: number) => [`$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Monto Vendido']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                  />
                  <Bar dataKey="monto_total" name="Monto Vendido" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Modal CRUD: Empleado Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-hairline rounded-lg w-full max-w-sm p-5 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-charcoal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider font-mono">
                {editingEmpleado ? 'Modificar Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <p className="text-[10px] text-charcoal-light mt-1">
                {editingEmpleado ? 'Modifique los campos y salve para actualizar la base de datos' : 'Ingrese los datos correspondientes para dar de alta en la plantilla'}
              </p>
            </div>

            <form onSubmit={handleSaveEmpleado} className="flex flex-col gap-4">
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Nombre de Empleado
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej. Carlos Martínez"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-sans"
                />
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Rol de Trabajo
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value }))}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 appearance-none cursor-pointer pr-8 font-sans"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Vendedor">Vendedor (Mostrador)</option>
                  <option value="Mecánico">Mecánico (Patio)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-50 border border-hairline rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-semibold text-ceramic bg-cova-blue border border-cova-blue hover:shadow-md rounded cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>{editingEmpleado ? 'Actualizar' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      ) : (
        <ServicesCRUD />
      )}
    </div>
  );
}
