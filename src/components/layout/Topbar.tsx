import { Search, Bell, ChevronDown, Building2 } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between px-6 bg-white border-b border-slate-200 w-full transition-all">
      <div className="flex items-center gap-6 flex-1">
        {/* Tenant Selector */}
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
          <div className="bg-primary p-1.5 rounded-md text-white shadow-sm">
            <Building2 size={16} strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-none">Matriz Monterrey</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">AutoListo Premium</span>
          </div>
          <ChevronDown size={14} strokeWidth={2} className="text-slate-400 ml-1" />
        </div>

        {/* Global Search */}
        <div className="relative group max-w-md w-full hidden lg:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} strokeWidth={2} className="text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar orden, cliente o placa..." 
            className="block w-full pl-9 pr-12 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-foreground placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <kbd className="inline-flex items-center text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-foreground rounded-full hover:bg-slate-50 transition-colors">
          <Bell size={20} strokeWidth={2} />
          <span className="absolute top-1.5 right-2 block h-2 w-2 rounded-full bg-destructive ring-2 ring-white" />
        </button>
        
        {/* Profile Widget */}
        <div className="flex items-center gap-3 pl-5 border-l border-slate-200 cursor-pointer group">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-foreground leading-none">Eduardo C.</span>
            <span className="text-xs text-muted-foreground mt-1">Admin</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold border border-primary/20 transition-transform group-hover:scale-105">
            EC
          </div>
        </div>
      </div>
    </header>
  );
}
