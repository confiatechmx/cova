import { Search, Bell, ChevronDown } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-[68px] border-b border-zinc-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} strokeWidth={1.5} className="text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar orden, cliente o placa..." 
            className="block w-full pl-10 pr-14 py-2 border border-zinc-200/80 rounded-xl leading-5 bg-zinc-50/50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="inline-flex items-center text-[10px] font-sans font-medium text-zinc-400 border border-zinc-200 rounded px-2 py-0.5 bg-white shadow-sm">
              ⌘ K
            </kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button className="text-zinc-400 hover:text-zinc-700 transition-colors relative p-2 rounded-full hover:bg-zinc-50">
          <Bell size={18} strokeWidth={1.5} />
          <span className="absolute top-2 right-2.5 block h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        
        {/* Profile Widget */}
        <div className="flex items-center gap-2 cursor-pointer group hover:bg-zinc-50 p-1.5 rounded-xl transition-colors">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 text-xs font-semibold shadow-sm transition-transform group-hover:scale-105">
              AC
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <ChevronDown size={14} strokeWidth={2} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
        </div>
      </div>
    </header>
  );
}
