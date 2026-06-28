"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Target, CarFront, Banknote, Activity } from "lucide-react";

interface Metrics {
  totalClients: number;
  activeLeads: number;
  vehiclesInWorkshop: number;
  potentialRevenue: number;
}

interface SourceData {
  name: string;
  count: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalClients: 0,
    activeLeads: 0,
    vehiclesInWorkshop: 0,
    potentialRevenue: 0
  });
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        // 1. Total Clientes y Fuentes
        const { data: clients, error: errC } = await supabase
          .from('clientes')
          .select('id, fuente_adquisicion, nombre, creado_en')
          .order('creado_en', { ascending: false });

        let tClients = 0;
        let sources: Record<string, number> = {};
        
        if (clients && !errC) {
          tClients = clients.length;
          setRecentClients(clients.slice(0, 5));
          
          clients.forEach((c: any) => {
            const f = c.fuente_adquisicion || 'Local';
            sources[f] = (sources[f] || 0) + 1;
          });
        }

        const chartData = Object.keys(sources).map(k => ({
          name: k,
          count: sources[k]
        })).sort((a, b) => b.count - a.count);

        // 2. Leads Abiertos e Ingresos Potenciales
        const { data: opps } = await supabase
          .from('oportunidades_venta')
          .select('monto_estimado')
          .neq('estatus', 'Ganado')
          .neq('estatus', 'Perdido');

        let aLeads = 0;
        let pRev = 0;
        if (opps) {
          aLeads = opps.length;
          pRev = opps.reduce((acc: number, o: any) => acc + (Number(o.monto_estimado) || 0), 0);
        }

        // 3. Vehiculos en Taller
        const { count: vCount } = await supabase
          .from('ordenes_servicio')
          .select('*', { count: 'exact', head: true })
          .neq('estatus', 'entregado');

        setMetrics({
          totalClients: tClients,
          activeLeads: aLeads,
          vehiclesInWorkshop: vCount || 0,
          potentialRevenue: pRev
        });

        setSourceData(chartData);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-zinc-500 font-medium">Cargando métricas del sistema...</p>
      </div>
    );
  }

  const kpis = [
    { title: "Clientes Registrados", value: metrics.totalClients, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Vehículos en Taller", value: metrics.vehiclesInWorkshop, icon: CarFront, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Oportunidades Abiertas", value: metrics.activeLeads, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Pipeline (Ingresos)", value: `$${metrics.potentialRevenue.toLocaleString('es-MX')}`, icon: Banknote, color: "text-purple-600", bg: "bg-purple-50" }
  ];

  return (
    <div className="w-full h-full p-4 md:p-8 flex flex-col gap-6 md:gap-8 overflow-y-auto no-scrollbar max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
          <Activity className="text-blue-600" />
          Dashboard Operativo
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Vista global del rendimiento del taller y embudo de ventas.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
              <kpi.icon size={24} className={kpi.color} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{kpi.title}</p>
              <h3 className="text-2xl font-black text-zinc-900 leading-none mt-1">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Source Chart */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-6">Canales de Adquisición</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 lg:col-span-1">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-6">Últimos Clientes</h3>
          <div className="flex flex-col gap-4">
            {recentClients.length > 0 ? (
              recentClients.map(client => (
                <div key={client.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {client.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 truncate max-w-[150px]">{client.nombre}</p>
                      <p className="text-xs text-zinc-500 font-medium">{new Date(client.creado_en).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold px-2 py-1 bg-zinc-100 text-zinc-600 rounded uppercase tracking-wider">
                    {client.fuente_adquisicion || 'LOCAL'}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 italic">No hay actividad reciente.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
