"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  
  useEffect(() => {
    if (isOpen) setIsRendered(true);
  }, [isOpen]);
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isRendered && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-zinc-900/40"
        onClick={onClose}
      />
      
      <div 
        className={`relative w-full max-w-2xl bg-zinc-50 shadow-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        onTransitionEnd={() => { if (!isOpen) setIsRendered(false); }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
            {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-2 rounded-lg transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto dense-scrollbar bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}
