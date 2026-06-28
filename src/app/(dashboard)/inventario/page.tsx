"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Modal } from "../../../components/ui/Modal";
import { TireForm } from "../../../components/inventario/TireForm";

interface Tire {
  id: string;
  sku: string;
  brand: string;
  model: string;
  dimensions: string;
  stock: number;
  price: number;
}

function getStockBadge(stock: number) {
  if (stock > 10) {
    return <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200/60 min-w-[32px]">{stock}</span>;
  }
  if (stock > 0 && stock <= 5) {
    return <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 min-w-[32px]">{stock}</span>;
  }
  if (stock === 0) {
    return <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60 min-w-[32px]">0</span>;
  }
  return <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 min-w-[32px]">{stock}</span>;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-100 last:border-0 animate-pulse">
      <td className="px-5 py-3 align-middle"><div className="h-5 bg-zinc-200 rounded w-28" /></td>
      <td className="px-5 py-3 align-middle">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 bg-zinc-200 rounded w-48" />
          <div className="h-3 bg-zinc-200 rounded w-20" />
        </div>
      </td>
      <td className="px-5 py-3 align-middle"><div className="h-4 bg-zinc-200 rounded w-20" /></td>
      <td className="px-5 py-3 align-middle flex justify-center"><div className="h-5 bg-zinc-200 rounded-full w-8" /></td>
      <td className="px-5 py-3 align-middle"><div className="h-4 bg-zinc-200 rounded w-16 ml-auto" /></td>
    </tr>
  );
}

export default function InventarioPage() {
  const [inventory, setInventory] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  async function fetchInventory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventario_llantas')
      .select('*')
      .order('marca', { ascending: true });
    
    if (error) {
      console.error('Error fetching inventory:', error);
    } else if (data) {
      const formatted: Tire[] = data.map((d: any) => ({
        id: d.id,
        // Generar un SKU legible dinámicamente
        sku: `${d.marca.substring(0,3).toUpperCase()}-${d.modelo_llanta.substring(0,3).toUpperCase().replace(/\s/g, '')}-${d.ancho}${d.perfil}${d.rin}`,
        brand: d.marca,
        model: d.modelo_llanta,
        dimensions: `${d.ancho}/${d.perfil} R${d.rin}`,
        stock: d.stock_actual,
        price: d.precio_venta,
      }));
      setInventory(formatted);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredInventory = inventory.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchSearch = item.sku.toLowerCase().includes(query) || item.model.toLowerCase().includes(query) || item.brand.toLowerCase().includes(query) || item.dimensions.toLowerCase().includes(query);
    const matchBrand = selectedBrand ? item.brand === selectedBrand : true;
    return matchSearch && matchBrand;
  });

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4 sm:gap-0 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Inventario de Llantas</h1>
          <p className="text-sm font-light text-zinc-500 mt-1">Gestiona el catálogo, existencias y precios de tus neumáticos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          Agregar Llanta
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="panel-card p-3 mb-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shrink-0 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto overflow-x-auto dense-scrollbar pb-1 sm:pb-0">
          {/* Search */}
          <div className="relative w-full sm:w-72 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-zinc-400" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por modelo o SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-zinc-200/80 rounded-md bg-zinc-50/50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-blue-500 sm:text-sm transition-all"
            />
          </div>
          
          {/* Dimensions Dropdowns */}
          <div className="flex items-center gap-2 border-l-0 sm:border-l border-zinc-100 pl-0 sm:pl-4 shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200/80 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors">
              Ancho <ChevronDown size={14} className="opacity-50" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200/80 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors">
              Perfil <ChevronDown size={14} className="opacity-50" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200/80 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors">
              Rin <ChevronDown size={14} className="opacity-50" />
            </button>
          </div>
        </div>
        
        {/* Brand Quick Filters */}
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 dense-scrollbar">
          <span className="text-xs font-medium text-zinc-400 mr-1">Marcas:</span>
          {["Michelin", "Bridgestone", "Continental"].map(brand => (
            <button 
              key={brand}
              onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                selectedBrand === brand 
                  ? "bg-blue-600 text-white" 
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table Container */}
      <div className="panel-card overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 dense-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-50/90 backdrop-blur-sm z-10 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase">SKU / Código</th>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase">Descripción / Medida</th>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase">Marca</th>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase text-center">Stock</th>
                <th className="px-5 py-3 text-[11px] tracking-wider text-zinc-400 font-semibold uppercase text-right">Precio Público</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors group">
                    <td className="px-5 py-3 align-middle">
                      <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-100/50 px-1.5 py-0.5 rounded border border-zinc-200/50">
                        {item.sku}
                      </span>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 text-sm tracking-tight">{item.brand} {item.model}</span>
                        <span className="text-[11px] font-medium text-zinc-500 mt-0.5">{item.dimensions}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <span className="text-xs font-medium text-zinc-600">{item.brand}</span>
                    </td>
                    <td className="px-5 py-3 align-middle text-center">
                      {getStockBadge(item.stock)}
                    </td>
                    <td className="px-5 py-3 align-middle text-right">
                      <span className="font-mono text-sm font-semibold text-zinc-900">
                        ${item.price.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-500 text-sm">
                    No se encontraron llantas en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for New Tire */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agregar Nueva Llanta"
        description="Registra un nuevo neumático en el catálogo de inventario."
      >
        <TireForm 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchInventory();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
