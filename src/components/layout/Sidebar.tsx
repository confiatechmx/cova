"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, Package2, Contact, SlidersHorizontal, Wrench } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const iconProps = { strokeWidth: 1.5, size: 18 };

  const navItems = [
    {
      href: "/tablero",
      label: "Órdenes",
      icon: Kanban,
    },
    {
      href: "/inventario",
      label: "Inventario",
      icon: Package2,
    },
    {
      href: "#",
      label: "Clientes",
      icon: Contact,
    },
  ];
  
  return (
    <aside className="fixed bottom-0 left-0 w-full h-[72px] flex flex-row items-center justify-between bg-white border-t border-zinc-200/60 px-6 py-2 z-50 md:top-0 md:left-0 md:h-full md:w-[90px] md:flex-col md:border-r md:border-t-0 md:py-6 md:px-0 safe-area-bottom">
      
      {/* Logo/Brand (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col items-center gap-1 w-full text-blue-600 mb-8">
        <Wrench size={24} strokeWidth={1.5} />
      </div>
        
      {/* Navigation */}
      <nav className="flex flex-row md:flex-col gap-1 md:gap-3 w-full items-center justify-around md:justify-start flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.label}
              href={item.href} 
              className={`flex flex-col items-center justify-center gap-1.5 p-2 md:p-2.5 rounded-lg transition-colors w-[64px] md:w-[72px] group ${
                isActive 
                  ? "bg-blue-50/50 text-blue-600" 
                  : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <Icon 
                {...iconProps} 
                className={`${isActive ? "text-blue-600" : "text-zinc-400 group-hover:scale-105 transition-transform"}`} 
              />
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? "text-blue-600" : "group-hover:text-zinc-600"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      
      {/* Settings at bottom/right */}
      <div className="flex flex-col items-center w-auto md:w-full ml-auto md:ml-0 md:mt-auto">
        <Link 
          href="#" 
          className={`flex flex-col items-center justify-center gap-1.5 p-2 md:p-2.5 rounded-lg transition-colors w-[64px] md:w-[72px] group ${
            pathname === "/ajustes" 
              ? "bg-blue-50/50 text-blue-600" 
              : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          <SlidersHorizontal 
            {...iconProps} 
            className={`${pathname === "/ajustes" ? "text-blue-600" : "text-zinc-400 group-hover:scale-105 transition-transform"}`} 
          />
          <span className={`text-[10px] font-medium tracking-wide ${pathname === "/ajustes" ? "text-blue-600" : "group-hover:text-zinc-600"}`}>
            Ajustes
          </span>
        </Link>
      </div>
    </aside>
  );
}
