"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard, Order } from "./KanbanCard";
import { useMemo } from "react";

interface KanbanColumnProps {
  id: string;
  title: string;
  orders: Order[];
  onCardClick?: (orderId: string) => void;
}

export function KanbanColumn({ id, title, orders, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: "Column",
    },
  });

  const orderIds = useMemo(() => orders.map((o) => o.id), [orders]);

  return (
    <div className="flex flex-col bg-zinc-100/40 rounded-2xl h-full max-h-[calc(100vh-210px)] overflow-hidden">
      {/* Column Header */}
      <div className="px-4 py-3.5 flex items-center justify-between shrink-0">
        <h3 className="text-[12px] font-semibold text-zinc-600 uppercase tracking-wide">{title}</h3>
        <span className="bg-zinc-200/50 text-zinc-500 text-[11px] font-semibold px-2 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>
      
      {/* Scrollable Cards Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2.5 pt-0 flex flex-col gap-2.5 overflow-y-auto dense-scrollbar transition-colors ${
          isOver ? "bg-slate-100/60" : ""
        }`}
      >
        <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
          {orders.map((order) => (
            <KanbanCard key={order.id} order={order} onClick={onCardClick} />
          ))}
        </SortableContext>
        
        <div className="min-h-[20px] shrink-0" />
      </div>
    </div>
  );
}
