"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, Package2, Contact, Aperture, Wrench, Landmark, Settings, MessageSquare, Target, Menu, X } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      <aside className="fixed bottom-0 left-0 w-full h-[72px] flex flex-row items-center justify-between bg-white border-t border-zinc-200/60 px-4 py-2 z-50 md:top-0 md:left-0 md:h-full md:w-[72px] md:flex-col md:border-r md:border-t-0 md:py-6 md:px-0 safe-area-bottom">
      
      {/* Logo/Brand (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col items-center justify-center w-full mb-6">
        <Link href="/" className="text-blue-600 p-2 rounded-xl bg-blue-50/80 ring-1 ring-blue-100/50 group transition-all hover:bg-blue-100">
          <Aperture size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
        </Link>
      </div>
        
      {/* Navigation */}
      <nav className="flex flex-row md:flex-col gap-1 md:gap-3 w-full items-center justify-around md:justify-start flex-1 md:overflow-visible overflow-y-auto no-scrollbar">
        
        {/* Mobile Mix (Top 4 + Menu) */}
        <div className="flex md:hidden flex-row gap-2 w-full justify-around px-2 py-1 items-center">
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
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors w-[48px] h-[48px] ${
                  isActive ? "bg-blue-50/50 text-blue-600 shadow-sm border border-blue-100/50" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Icon {...iconProps} className={`${isActive ? "text-blue-600" : "text-zinc-400"}`} />
              </Link>
            );
          })}
          {/* Menu Hamburger */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition-colors w-[48px] h-[48px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
          >
            <Menu {...iconProps} className="text-zinc-400" />
          </button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-col gap-2 w-full items-center">
          
          {/* Production Group */}
          {productionItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <div key={item.label} className="relative group w-full flex justify-center">
                <Link 
                  href={item.href} 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                    isActive ? "bg-blue-50/50 text-blue-600 shadow-sm border border-blue-100/50" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <Icon {...iconProps} className={`${isActive ? "text-blue-600" : "text-zinc-400 group-hover:scale-110 transition-transform duration-300"}`} />
                </Link>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-lg">
                  {item.label}
                  <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-zinc-900 rotate-45"></div>
                </div>
              </div>
            );
          })}

          <div className="w-8 h-px bg-zinc-200 my-2 rounded-full opacity-50"></div>

          {/* Sales Group */}
          {salesItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <div key={item.label} className="relative group w-full flex justify-center">
                <Link 
                  href={item.href} 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                    isActive ? "bg-blue-50/50 text-blue-600 shadow-sm border border-blue-100/50" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <Icon {...iconProps} className={`${isActive ? "text-blue-600" : "text-zinc-400 group-hover:scale-110 transition-transform duration-300"}`} />
                </Link>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-lg">
                  {item.label}
                  <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-zinc-900 rotate-45"></div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>
      
      {/* Settings at bottom */}
      <div className="hidden md:flex flex-col items-center w-full mt-auto relative group">
        <Link 
          href="/configuracion" 
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
            pathname === "/configuracion" ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          <Settings {...iconProps} className={`${pathname === "/configuracion" ? "text-zinc-900" : "group-hover:scale-110 transition-transform duration-300"}`} />
        </Link>
        {/* Tooltip */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-lg">
          Configuración
          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-zinc-900 rotate-45"></div>
        </div>
      </div>
    </aside>

      {/* Mobile Bottom Sheet Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="bg-white w-full rounded-t-3xl p-6 relative animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Menú Principal</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[...salesItems, ...productionItems, { href: "/configuracion", label: "Ajustes", icon: Settings }].map(item => (
                <Link 
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-50 hover:bg-blue-50/50 rounded-2xl gap-2 transition-colors group"
                >
                  <item.icon size={24} className="text-zinc-500 group-hover:text-blue-600 transition-colors" />
                  <span className="text-[10px] font-bold text-zinc-600 group-hover:text-blue-600 uppercase tracking-wider">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
