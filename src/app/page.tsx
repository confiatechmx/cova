'use client';

import React, { useState, useRef, useEffect } from 'react';
import TireSearch, { Tire } from '@/components/TireSearch';
import QuoteBuilder, { QuoteItem } from '@/components/QuoteBuilder';
import RecepcionTracker from '@/components/RecepcionTracker';
import TallerBoard, { TallerBoardRef } from '@/components/TallerBoard';
import CrmDashboard from '@/components/CrmDashboard';
import InventarioDashboard from '@/components/InventarioDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import PosHistoryDashboard from '@/components/PosHistoryDashboard';
import { useRoleAccess, UserRole } from '@/hooks/useRoleAccess';
import { ShieldAlert, Compass, Calendar, ExternalLink, Eye, EyeOff, ShoppingCart, History, Wrench, MessageSquare, Package, Settings, Menu } from 'lucide-react';

export default function Home() {
  const { role, user, changeRoleForDemo, isAdmin, isSales, isMechanic } = useRoleAccess();
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [currentTab, setCurrentTab] = useState<'sales' | 'history' | 'workshop' | 'crm' | 'inventory' | 'admin'>('sales');

  // Ref to taller board to trigger updates when a new vehicle is registered
  const tallerBoardRef = useRef<TallerBoardRef>(null);

  // Sync tab on role change to avoid vendedor/mecanico viewing restricted tabs
  useEffect(() => {
    if (isMechanic) {
      setCurrentTab('workshop');
    } else if (isSales && (currentTab === 'inventory' || currentTab === 'admin')) {
      setCurrentTab('sales');
    }
  }, [role, isMechanic, isSales]);

  // Add a tire from Search Matrix to Quote
  const handleAddTire = (tire: Tire) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.tire.id === tire.id);
      
      if (existing) {
        // Limit quantity to available stock
        if (existing.cantidad < tire.stock_actual) {
          return prev.map((item) =>
            item.tire.id === tire.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          );
        }
        return prev;
      } else {
        return [...prev, { tire, cantidad: 1, precioUnitario: tire.precio_venta }];
      }
    });
  };

  // Remove item from Quote
  const handleRemoveItem = (tireId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.tire.id !== tireId));
  };

  // Update item quantity in Quote
  const handleUpdateQuantity = (tireId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (item.tire.id === tireId) {
            const newQty = item.cantidad + delta;
            if (newQty > item.tire.stock_actual) {
              return { ...item, cantidad: item.tire.stock_actual };
            }
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const handleClearQuote = () => {
    setSelectedItems([]);
  };

  // Current date in Culiacán / Mexican standard format
  const currentDateFormatted = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const activeTab = isMechanic ? 'workshop' : currentTab;

  return (
    <div className="min-h-screen bg-ceramic text-charcoal flex flex-col antialiased">
      {/* Top Status Bar */}
      <div className="bg-white border-b border-hairline py-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 text-[10px] text-charcoal-light/70 font-mono tracking-tight select-none">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <span className="flex items-center gap-1.5 font-semibold text-charcoal">
            <Compass className="w-3.5 h-3.5 text-charcoal" />
            <span>Cova • Culiacán</span>
          </span>
          <span className="hidden sm:inline border-r border-hairline h-3"></span>
          <span className="inline sm:hidden lg:inline text-neutral-400 truncate max-w-[120px]">Usuario: <strong className="text-charcoal font-sans">{user.nombre}</strong></span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto hide-scrollbar">
          {/* Demo Role Selector */}
          <div className="flex items-center gap-1 bg-neutral-100 border border-hairline rounded px-2 py-0.5 shadow-sm">
            <span className="text-[9px] font-sans font-semibold text-neutral-400">Rol Demo:</span>
            <select
              value={role}
              onChange={(e) => changeRoleForDemo(e.target.value as UserRole)}
              className="bg-transparent border-none text-[9px] font-sans font-bold text-cova-blue focus:outline-none cursor-pointer"
            >
              <option value="Administrador">Administrador (Acceso Total)</option>
              <option value="Vendedor">Vendedor (Mostrador)</option>
              <option value="Mecánico">Mecánico (Patio)</option>
            </select>
          </div>

          <span className="hidden sm:flex items-center gap-1 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span className="capitalize">{currentDateFormatted}</span>
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 uppercase text-[9px] flex-shrink-0">
            Online
          </span>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-5 flex flex-col gap-4 pb-20 md:pb-5">
        {/* Header Brand Block (Hidden for Mechanic) */}
        {!isMechanic && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-hairline pb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-charcoal flex items-center gap-2">
                <span>Módulo Core Operativo</span>
                <span className="text-[10px] bg-charcoal text-white font-mono font-semibold px-2 py-0.5 rounded tracking-widest uppercase">
                  v3.5.0
                </span>
              </h1>
              <p className="text-xs text-charcoal-light mt-0.5">
                Panel unificado de cotización, recepción de vehículos y control del flujo de taller en patio.
              </p>
            </div>

            {/* Controls: Admin toggle & Info bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Margins Toggle Switch (Only active in Sales tab and for Admin) */}
              {activeTab === 'sales' && isAdmin && (
                <button
                  onClick={() => setAdminMode(!adminMode)}
                  className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all duration-200 select-none cursor-pointer ${
                    adminMode
                      ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm'
                      : 'bg-white border-hairline text-charcoal hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  {adminMode ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
                      <span>Ocultar Márgenes</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-charcoal-light" />
                      <span>Ver Métricas de Margen</span>
                    </>
                  )}
                </button>
              )}

              {/* Quick Info Badge */}
              <div className="flex items-center gap-2 bg-neutral-100/50 border border-hairline rounded p-2 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="text-[11px] text-charcoal-light font-medium">
                  Optimizado para tablets y celulares en patio operativo.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Navigation Tabs (Hidden for Mechanic & Mobile) */}
        {!isMechanic && (
          <div className="hidden md:flex overflow-x-auto hide-scrollbar snap-x border-b border-hairline mb-2 bg-white rounded p-1 shadow-sm select-none">
            <button
              onClick={() => setCurrentTab('sales')}
              className={`whitespace-nowrap flex-shrink-0 snap-start py-2.5 px-6 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
                activeTab === 'sales'
                  ? 'border-cova-blue text-cova-blue font-bold'
                  : 'border-transparent text-neutral-400 hover:text-charcoal'
              }`}
            >
              Ventas y Cotización
            </button>
            <button
              onClick={() => setCurrentTab('history')}
              className={`whitespace-nowrap flex-shrink-0 snap-start py-2.5 px-6 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
                activeTab === 'history'
                  ? 'border-cova-blue text-cova-blue font-bold'
                  : 'border-transparent text-neutral-400 hover:text-charcoal'
              }`}
            >
              Historial de Ventas
            </button>
            <button
              onClick={() => setCurrentTab('workshop')}
              className={`whitespace-nowrap flex-shrink-0 snap-start py-2.5 px-6 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
                activeTab === 'workshop'
                  ? 'border-cova-blue text-cova-blue font-bold'
                  : 'border-transparent text-neutral-400 hover:text-charcoal'
              }`}
            >
              Control de Taller
            </button>
            <button
              onClick={() => setCurrentTab('crm')}
              className={`whitespace-nowrap flex-shrink-0 snap-start py-2.5 px-6 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
                activeTab === 'crm'
                  ? 'border-cova-blue text-cova-blue font-bold'
                  : 'border-transparent text-neutral-400 hover:text-charcoal'
              }`}
            >
              CRM y WhatsApp
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setCurrentTab('inventory')}
                  className={`whitespace-nowrap flex-shrink-0 snap-start py-2.5 px-6 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
                    activeTab === 'inventory'
                      ? 'border-cova-blue text-cova-blue font-bold'
                      : 'border-transparent text-neutral-400 hover:text-charcoal'
                  }`}
                >
                  Catálogo e Inventario
                </button>
                <button
                  onClick={() => setCurrentTab('admin')}
                  className={`whitespace-nowrap flex-shrink-0 snap-start py-2.5 px-6 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 leading-none cursor-pointer ${
                    activeTab === 'admin'
                      ? 'border-cova-blue text-cova-blue font-bold'
                      : 'border-transparent text-neutral-400 hover:text-charcoal'
                  }`}
                >
                  Administración
                </button>
              </>
            )}
          </div>
        )}

        {/* Mobile Bottom Navigation Bar */}
        {!isMechanic && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-hairline flex items-center justify-between px-2 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto hide-scrollbar">
            <div className="flex items-center w-full min-w-max justify-around">
              <button
                onClick={() => setCurrentTab('sales')}
                className={`flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors ${
                  activeTab === 'sales' ? 'text-cova-blue' : 'text-neutral-400 hover:text-charcoal'
                }`}
              >
                <ShoppingCart className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-bold tracking-tight">Ventas</span>
              </button>
              
              <button
                onClick={() => setCurrentTab('history')}
                className={`flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors ${
                  activeTab === 'history' ? 'text-cova-blue' : 'text-neutral-400 hover:text-charcoal'
                }`}
              >
                <History className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-bold tracking-tight">Historial</span>
              </button>

              <button
                onClick={() => setCurrentTab('workshop')}
                className={`flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors ${
                  activeTab === 'workshop' ? 'text-cova-blue' : 'text-neutral-400 hover:text-charcoal'
                }`}
              >
                <Wrench className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-bold tracking-tight">Taller</span>
              </button>

              <button
                onClick={() => setCurrentTab('crm')}
                className={`flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors ${
                  activeTab === 'crm' ? 'text-cova-blue' : 'text-neutral-400 hover:text-charcoal'
                }`}
              >
                <MessageSquare className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-bold tracking-tight">CRM</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setCurrentTab('inventory')}
                    className={`flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors ${
                      activeTab === 'inventory' ? 'text-cova-blue' : 'text-neutral-400 hover:text-charcoal'
                    }`}
                  >
                    <Package className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-bold tracking-tight">Catálogo</span>
                  </button>

                  <button
                    onClick={() => setCurrentTab('admin')}
                    className={`flex flex-col items-center justify-center py-3 px-3 min-w-[64px] transition-colors ${
                      activeTab === 'admin' ? 'text-cova-blue' : 'text-neutral-400 hover:text-charcoal'
                    }`}
                  >
                    <Settings className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-bold tracking-tight">Admin</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Conditionally rendered tab grids */}
        {isMechanic ? (
          <div className="flex flex-col gap-5 flex-1">
            <div className="panel-card p-5 bg-white flex flex-col shadow-sm">
              <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    Tablero Kanban de Control de Patio (Mecánico: {user.nombre})
                  </h3>
                  <p className="text-[11px] text-charcoal-light mt-0.5 font-mono">
                    Vista operativa de trabajo asignada exclusivamente
                  </p>
                </div>
              </div>
              <TallerBoard ref={tallerBoardRef} />
            </div>
          </div>
        ) : activeTab === 'sales' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
            {/* Advanced Specification Search (Matrix) - Takes 7/12 cols */}
            <div className="lg:col-span-7 h-full flex flex-col">
              <TireSearch onAddTire={handleAddTire} adminMode={adminMode && isAdmin} />
            </div>

            {/* Express Quote Builder - Takes 5/12 cols */}
            <div className="lg:col-span-5 h-full flex flex-col">
              <QuoteBuilder
                selectedItems={selectedItems}
                onRemoveItem={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
                onClearQuote={handleClearQuote}
                vendedorId={user.id}
              />
            </div>
          </div>
        ) : activeTab === 'history' ? (
          <PosHistoryDashboard />
        ) : activeTab === 'workshop' ? (
          <div className="flex flex-col gap-5 flex-1">
            {/* Intake Reception Form */}
            <RecepcionTracker onOrderCreated={() => tallerBoardRef.current?.refreshBoard()} />

            {/* Visual Kanban Board panel */}
            <div className="panel-card p-5 bg-white flex flex-col">
              <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    Tablero Kanban de Control de Patio
                  </h3>
                  <p className="text-[11px] text-charcoal-light mt-0.5">
                    Arrastre visual del flujo operativo de servicio
                  </p>
                </div>
              </div>
              <TallerBoard ref={tallerBoardRef} />
            </div>
          </div>
        ) : activeTab === 'crm' ? (
          <CrmDashboard />
        ) : activeTab === 'inventory' ? (
          <InventarioDashboard />
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Footer minimal signature */}
      <footer className="border-t border-hairline bg-white/70 py-4 px-4 text-center mt-auto text-[10px] text-charcoal-light/60 font-mono select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Llantera Cova. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1 hover:text-charcoal cursor-pointer transition-colors">
            <span>Soporte Técnico de Sistemas</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </span>
        </div>
      </footer>
    </div>
  );
}

