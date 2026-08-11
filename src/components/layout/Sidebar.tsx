"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, Package2, Contact, Aperture, Wrench, Landmark, Settings, MessageSquare, Target, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const iconProps = { strokeWidth: 2, size: 20 };

  const productionItems = [
    { href: "/tablero", label: "Producción", icon: Kanban },
    { href: "/inventario", label: "Inventario", icon: Package2 },
    { href: "/servicios", label: "Servicios", icon: Wrench },
    { href: "/caja", label: "Caja", icon: Landmark },
  ];

  const salesItems = [
    { href: "/clientes", label: "Directorio", icon: Contact },
    { href: "/ventas", label: "Pipeline", icon: Target },
    { href: "/mensajes", label: "Inbox", icon: MessageSquare },
  ];
  
  return (
    <>
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 bg-swamp border-r border-swamp/10 transition-all duration-300 relative z-40 ${isCollapsed ? "w-16" : "w-64"}`}>
        
        {/* Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-swamp border border-white/10 text-slate-400 hover:text-white rounded-full p-1 z-50 transition-colors shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo/Brand */}
        <div className="flex items-center justify-center h-16 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-3 text-white px-4 w-full">
            <Aperture size={28} strokeWidth={2} className="text-primary shrink-0" />
            {!isCollapsed && <span className="font-bold text-lg tracking-tight truncate">AutoListo</span>}
          </Link>
        </div>
          
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 no-scrollbar flex flex-col gap-6">
          
          <div className="flex flex-col gap-1">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-slate-400/70 uppercase tracking-widest mb-2">Producción</p>}
            {productionItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.label}
                  href={item.href} 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group ${
                    isActive 
                      ? "bg-primary/20 text-primary border-l-4 border-primary" 
                      : "text-slate-400 hover:text-white hover:bg-white/10 border-l-4 border-transparent"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon {...iconProps} className="shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col gap-1">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-slate-400/70 uppercase tracking-widest mb-2">Ventas</p>}
            {salesItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.label}
                  href={item.href} 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group ${
                    isActive 
                      ? "bg-primary/20 text-primary border-l-4 border-primary" 
                      : "text-slate-400 hover:text-white hover:bg-white/10 border-l-4 border-transparent"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon {...iconProps} className="shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

        </nav>
        
        {/* Settings at bottom */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <Link 
            href="/configuracion" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group ${
              pathname === "/configuracion" 
                ? "bg-primary/20 text-primary border-l-4 border-primary" 
                : "text-slate-400 hover:text-white hover:bg-white/10 border-l-4 border-transparent"
            }`}
            title={isCollapsed ? "Configuración" : undefined}
          >
            <Settings {...iconProps} className="shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm truncate">Configuración</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile nav placeholder */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-[72px] flex items-center justify-between bg-swamp px-4 z-50 border-t border-white/10 safe-area-bottom">
        <div className="flex flex-row gap-2 w-full justify-around items-center">
          {[
            { href: "/", label: "Inicio", icon: Aperture },
            { href: "/mensajes", label: "Inbox", icon: MessageSquare },
            { href: "/tablero", label: "Taller", icon: Kanban },
            { href: "/clientes", label: "Clientes", icon: Contact },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.label}
                href={item.href} 
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                  isActive ? "text-primary" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon {...iconProps} />
              </Link>
            );
          })}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <Menu {...iconProps} />
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="bg-background w-full rounded-t-3xl p-6 relative max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground tracking-tight">Menú Principal</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[...salesItems, ...productionItems, { href: "/configuracion", label: "Ajustes", icon: Settings }].map(item => (
                <Link 
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border hover:border-primary/50 rounded-2xl gap-2 transition-colors group"
                >
                  <item.icon size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary uppercase tracking-wider">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
