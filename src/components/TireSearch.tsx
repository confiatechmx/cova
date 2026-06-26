'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, AlertTriangle, RotateCcw, SlidersHorizontal, Plus } from 'lucide-react';

export interface Tire {
  id: string;
  marca: string;
  modelo_llanta: string;
  ancho: number;
  perfil: number;
  rin: number;
  indice_carga_velocidad: string;
  tipo_terreno: string;
  stock_actual: number;
  stock_minimo: number;
  precio_venta: number;
  costo_adquisicion: number;
}

interface TireSearchProps {
  onAddTire?: (tire: Tire) => void;
  adminMode?: boolean;
}

// Mock data fallback in case database connection fails or env variables are not resolved
const MOCK_TIRES: Tire[] = [
  {
    id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    marca: 'Michelin',
    modelo_llanta: 'Primacy 4',
    ancho: 205,
    perfil: 55,
    rin: 16,
    indice_carga_velocidad: '91V',
    tipo_terreno: 'HT',
    stock_actual: 12,
    stock_minimo: 4,
    precio_venta: 2450.00,
    costo_adquisicion: 1650.00
  },
  {
    id: '20eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
    marca: 'Bridgestone',
    modelo_llanta: 'Turanza ER300',
    ancho: 205,
    perfil: 55,
    rin: 16,
    indice_carga_velocidad: '91V',
    tipo_terreno: 'HT',
    stock_actual: 3,
    stock_minimo: 4,
    precio_venta: 2150.00,
    costo_adquisicion: 1480.00
  },
  {
    id: '30eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
    marca: 'Continental',
    modelo_llanta: 'PowerContact 2',
    ancho: 185,
    perfil: 60,
    rin: 15,
    indice_carga_velocidad: '84H',
    tipo_terreno: 'HT',
    stock_actual: 16,
    stock_minimo: 6,
    precio_venta: 1680.00,
    costo_adquisicion: 1150.00
  },
  {
    id: '40eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
    marca: 'Goodyear',
    modelo_llanta: 'Wrangler Duratrac',
    ancho: 265,
    perfil: 70,
    rin: 17,
    indice_carga_velocidad: '121S',
    tipo_terreno: 'MT',
    stock_actual: 8,
    stock_minimo: 2,
    precio_venta: 4890.00,
    costo_adquisicion: 3300.00
  },
  {
    id: '50eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
    marca: 'Firestone',
    modelo_llanta: 'Destination A/T',
    ancho: 225,
    perfil: 75,
    rin: 16,
    indice_carga_velocidad: '115S',
    tipo_terreno: 'AT',
    stock_actual: 2,
    stock_minimo: 4,
    precio_venta: 3100.00,
    costo_adquisicion: 2100.00
  },
  {
    id: '60eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
    marca: 'Pirelli',
    modelo_llanta: 'Scorpion ATR',
    ancho: 235,
    perfil: 70,
    rin: 16,
    indice_carga_velocidad: '106T',
    tipo_terreno: 'AT',
    stock_actual: 10,
    stock_minimo: 4,
    precio_venta: 2950.00,
    costo_adquisicion: 1980.00
  }
];

export default function TireSearch({ onAddTire, adminMode = false }: TireSearchProps) {
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [widthFilter, setWidthFilter] = useState('Todos');
  const [profileFilter, setProfileFilter] = useState('Todos');
  const [rimFilter, setRimFilter] = useState('Todos');
  const [terrainFilter, setTerrainFilter] = useState('Todos');
  
  // Available filter options extracted from dataset
  const [widthOptions, setWidthOptions] = useState<number[]>([]);
  const [profileOptions, setProfileOptions] = useState<number[]>([]);
  const [rimOptions, setRimOptions] = useState<number[]>([]);

  const fetchTires = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: sbError } = await supabase
        .from('inventario_llantas')
        .select('*')
        .order('marca', { ascending: true });

      if (sbError) throw sbError;

      if (data && data.length > 0) {
        setTires(data as Tire[]);
      } else {
        // Use Mock data fallback if DB has no records
        setTires(MOCK_TIRES);
      }
    } catch (err: any) {
      console.error('Error fetching tires from Supabase, using mock fallback:', err.message);
      // Fallback
      setTires(MOCK_TIRES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTires();
  }, []);

  // Update dynamic filter dropdown options based on current tire list
  useEffect(() => {
    if (tires.length > 0) {
      const widths = Array.from(new Set(tires.map(t => t.ancho))).sort((a, b) => a - b);
      const profiles = Array.from(new Set(tires.map(t => t.perfil))).sort((a, b) => a - b);
      const rims = Array.from(new Set(tires.map(t => t.rin))).sort((a, b) => a - b);

      setWidthOptions(widths);
      setProfileOptions(profiles);
      setWidthOptions(widths);
      setProfileOptions(profiles);
      setRimOptions(rims);
    }
  }, [tires]);

  const resetFilters = () => {
    setSearchQuery('');
    setWidthFilter('Todos');
    setProfileFilter('Todos');
    setRimFilter('Todos');
    setTerrainFilter('Todos');
  };

  // Filtering Logic
  const filteredTires = tires.filter((tire) => {
    const matchesSearch = 
      tire.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tire.modelo_llanta.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesWidth = widthFilter === 'Todos' || tire.ancho.toString() === widthFilter;
    const matchesProfile = profileFilter === 'Todos' || tire.perfil.toString() === profileFilter;
    const matchesRim = rimFilter === 'Todos' || tire.rin.toString() === rimFilter;
    const matchesTerrain = terrainFilter === 'Todos' || tire.tipo_terreno === terrainFilter;

    return matchesSearch && matchesWidth && matchesProfile && matchesRim && matchesTerrain;
  });

  return (
    <div className="panel-card p-5 flex flex-col h-full">
      {/* Header section with minimal layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b-hairline gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-charcoal flex items-center gap-2">
            <span>Matriz de Especificaciones y Stock</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-charcoal/5 font-mono text-charcoal/60">
              {filteredTires.length} de {tires.length} llantas
            </span>
          </h2>
          <p className="text-xs text-charcoal-light mt-0.5">
            Buscador y control de inventario en tiempo real
          </p>
        </div>

        <button
          onClick={resetFilters}
          className="self-start md:self-auto text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-hairline bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-colors text-charcoal-light font-medium"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Limpiar filtros</span>
        </button>
      </div>

      {/* Dynamic Specification Filter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-4">
        {/* Search Query */}
        <div className="col-span-2 md:col-span-1 relative">
          <label className="absolute left-2.5 top-1.5 text-[9px] font-medium text-charcoal-light/60 uppercase tracking-wider">
            Buscar
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Marca, modelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-hairline rounded pt-4 pb-1 pl-2.5 pr-8 text-xs text-charcoal placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 bottom-2 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Width Filter */}
        <div className="relative">
          <label className="absolute left-2.5 top-1.5 text-[9px] font-medium text-charcoal-light/60 uppercase tracking-wider">
            Ancho
          </label>
          <select
            value={widthFilter}
            onChange={(e) => setWidthFilter(e.target.value)}
            className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            {widthOptions.map((w) => (
              <option key={w} value={w}>
                {w} mm
              </option>
            ))}
          </select>
        </div>

        {/* Profile Filter */}
        <div className="relative">
          <label className="absolute left-2.5 top-1.5 text-[9px] font-medium text-charcoal-light/60 uppercase tracking-wider">
            Perfil
          </label>
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            {profileOptions.map((p) => (
              <option key={p} value={p}>
                {p} %
              </option>
            ))}
          </select>
        </div>

        {/* Rin Filter */}
        <div className="relative">
          <label className="absolute left-2.5 top-1.5 text-[9px] font-medium text-charcoal-light/60 uppercase tracking-wider">
            Rin
          </label>
          <select
            value={rimFilter}
            onChange={(e) => setRimFilter(e.target.value)}
            className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            {rimOptions.map((r) => (
              <option key={r} value={r}>
                R{r}
              </option>
            ))}
          </select>
        </div>

        {/* Terrain Filter */}
        <div className="relative col-span-2 md:col-span-1">
          <label className="absolute left-2.5 top-1.5 text-[9px] font-medium text-charcoal-light/60 uppercase tracking-wider">
            Terreno
          </label>
          <select
            value={terrainFilter}
            onChange={(e) => setTerrainFilter(e.target.value)}
            className="w-full bg-white border border-hairline rounded pt-4 pb-1 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="HT">HT (Highway Terrain)</option>
            <option value="AT">AT (All Terrain)</option>
            <option value="MT">MT (Mud Terrain)</option>
          </select>
        </div>
      </div>

      {/* Tire Specification Grid Table */}
      <div className="flex-1 overflow-auto border border-hairline rounded dense-scrollbar min-h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center py-12">
            <span className="text-xs text-charcoal-light animate-pulse font-medium">Cargando inventario...</span>
          </div>
        ) : filteredTires.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center">
            <SlidersHorizontal className="w-8 h-8 text-neutral-300 mb-2.5" />
            <p className="text-xs font-semibold text-charcoal">Sin coincidencias</p>
            <p className="text-[11px] text-charcoal-light mt-1 max-w-[280px]">
              No encontramos llantas con las especificaciones seleccionadas en el inventario actual.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto w-full border border-hairline rounded-md">
              <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="bg-neutral-50/75 border-b-hairline sticky top-0 backdrop-blur-[2px] z-10">
                <th className="py-2.5 px-3 text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider">Especificación</th>
                <th className="py-2.5 px-3 text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider">Detalles</th>
                <th className="py-2.5 px-3 text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider text-right">Stock</th>
                <th className="py-2.5 px-3 text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider text-right">P. Venta</th>
                <th className="py-2.5 px-3 text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredTires.map((tire) => {
                const isLowStock = tire.stock_actual <= tire.stock_minimo;
                const marginAmount = tire.precio_venta - tire.costo_adquisicion;
                const marginPercent = tire.precio_venta > 0 ? (marginAmount / tire.precio_venta) * 100 : 0;
                
                return (
                  <tr 
                    key={tire.id} 
                    className="hover:bg-neutral-50/50 transition-colors"
                  >
                    {/* Specification Measure */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-charcoal text-xs">
                        {tire.ancho}/{tire.perfil} R{tire.rin}
                      </div>
                      <div className="text-[10px] font-mono text-charcoal-light/75 mt-0.5">
                        {tire.indice_carga_velocidad} • {tire.tipo_terreno}
                      </div>
                    </td>

                    {/* Brand and Model */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-charcoal text-xs">
                        {tire.marca}
                      </div>
                      <div className="text-[10px] text-charcoal-light mt-0.5">
                        {tire.modelo_llanta}
                      </div>
                    </td>

                    {/* Stock status with brand-aligned priority indicators */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-xs font-semibold text-charcoal">
                          {tire.stock_actual} pza{tire.stock_actual !== 1 ? 's' : ''}
                        </span>
                        
                        {isLowStock && (
                          <span className="text-[9px] text-charcoal font-semibold flex items-center gap-1 mt-1 bg-[#F1F3F5] border border-hairline px-1.5 py-0.5 rounded leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-cova-blue flex-shrink-0 animate-pulse"></span>
                            <span>Mín: {tire.stock_minimo}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pricing + Admin Margins */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-xs font-semibold text-charcoal">
                          ${tire.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-charcoal-light/60 font-medium">MXN</span>
                        
                        {adminMode && tire.costo_adquisicion > 0 && (
                          <div className="text-[9px] font-mono text-right mt-1.5 p-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded leading-normal max-w-[140px] shadow-sm animate-fade-in">
                            <span className="block text-neutral-500 text-[8px]">Adquisición: ${tire.costo_adquisicion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            <span className="block font-semibold">Margen: ${marginAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ({marginPercent.toFixed(0)}%)</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Quick Add Action for quote */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onAddTire && onAddTire(tire)}
                        disabled={tire.stock_actual === 0}
                        className={`inline-flex items-center justify-center p-1.5 rounded border transition-all ${
                          tire.stock_actual === 0
                            ? 'bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed'
                            : 'bg-white border-hairline hover:border-neutral-400 hover:bg-neutral-50 text-charcoal'
                        }`}
                        title={tire.stock_actual === 0 ? "Agotado" : "Agregar a Cotización"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filteredTires.map((tire) => {
                const isLowStock = tire.stock_actual <= tire.stock_minimo;
                const marginAmount = tire.precio_venta - tire.costo_adquisicion;
                const marginPercent = tire.precio_venta > 0 ? (marginAmount / tire.precio_venta) * 100 : 0;
                
                return (
                  <div key={tire.id} className="border border-hairline rounded bg-white p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start border-b border-hairline pb-2">
                      <div>
                        <div className="font-bold text-charcoal text-[13px]">
                          {tire.marca}
                        </div>
                        <div className="text-[11px] text-charcoal-light mt-0.5">
                          {tire.modelo_llanta}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-[13px] font-bold text-charcoal">
                          ${tire.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {isLowStock && (
                          <span className="text-[9px] text-charcoal font-bold flex items-center gap-1 bg-[#F1F3F5] border border-hairline px-1.5 py-0.5 rounded leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-cova-blue flex-shrink-0 animate-pulse"></span>
                            <span>Mín: {tire.stock_minimo}</span>
                          </span>
                        )}
                        <span className="font-mono text-[11px] font-bold text-charcoal mt-0.5">
                          {tire.stock_actual} pza{tire.stock_actual !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1">
                      <div>
                        <div className="font-semibold text-charcoal text-[11px]">
                          {tire.ancho}/{tire.perfil} R{tire.rin}
                        </div>
                        <div className="text-[10px] font-mono text-charcoal-light/75">
                          {tire.indice_carga_velocidad} • {tire.tipo_terreno}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => onAddTire && onAddTire(tire)}
                        disabled={tire.stock_actual === 0}
                        className={`inline-flex items-center justify-center p-2 rounded border transition-all ${
                          tire.stock_actual === 0
                            ? 'bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed'
                            : 'bg-cova-blue border-cova-blue text-white hover:bg-opacity-90 shadow-sm'
                        }`}
                        title={tire.stock_actual === 0 ? "Agotado" : "Agregar a Cotización"}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {adminMode && tire.costo_adquisicion > 0 && (
                      <div className="mt-2 text-[10px] font-mono p-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded leading-normal flex justify-between">
                        <span>Adquisición: ${tire.costo_adquisicion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        <span className="font-bold">Margen: ${marginAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ({marginPercent.toFixed(0)}%)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
