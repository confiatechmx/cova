"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CircleDashed, Wrench, Settings, User } from "lucide-react";

export type OrderPriority = "low" | "normal" | "high" | "urgent";

export interface Order {
  id: string;
  columnId: string;
  carModel: string;
  plates: string;
  customerName: string;
  priority: OrderPriority;
  services: string[];
  createdAt: string;
}

interface KanbanCardProps {
  order: Order;
  onClick?: (orderId: string) => void;
}

const priorityDots: Record<OrderPriority, string> = {
  low: "bg-zinc-300",
  normal: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

function getServiceIcon(service: string) {
  const iconProps = { size: 10, strokeWidth: 2, className: "mr-1 text-zinc-400" };
  const lower = service.toLowerCase();
  if (lower.includes("llanta") || lower.includes("balanceo")) return <CircleDashed {...iconProps} />;
  if (lower.includes("alineación") || lower.includes("suspensión") || lower.includes("freno")) return <Wrench {...iconProps} />;
  return <Settings {...iconProps} />;
}

export function KanbanCard({ order, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
    data: {
      type: "Order",
      order,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="panel-card opacity-50 h-[100px] border-2 border-dashed border-blue-400 bg-blue-50/40 rounded-xl"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="panel-card flex flex-col relative group hover:shadow-sm"
    >
      <div 
        className="p-3 flex flex-col gap-2 cursor-pointer"
        onClick={() => onClick && onClick(order.id)}
      >
      {/* Top line: Model + Dot (Left) / Plates + Grip (Right) */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5 flex-1 pr-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDots[order.priority]}`} />
          <h4 className="font-semibold text-zinc-900 leading-tight tracking-tight text-sm truncate">{order.carModel}</h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase tracking-wider bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded font-mono">
            {order.plates}
          </span>
          <div
            {...attributes}
            {...listeners}
            className="text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing transition-colors p-1 -m-1"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} strokeWidth={2} />
          </div>
        </div>
      </div>
      
      {/* Customer Name */}
      <div className="flex items-center gap-1 text-zinc-500">
        <User size={12} strokeWidth={2} className="text-zinc-400" />
        <span className="text-xs font-medium">{order.customerName}</span>
      </div>
      
      {/* Services and Date (Footer) */}
      <div className="flex justify-between items-end mt-1">
        <div className="flex flex-wrap gap-1">
          {order.services.map((service, index) => (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-50 text-zinc-600 border border-zinc-200/60"
            >
              {getServiceIcon(service)}
              {service}
            </span>
          ))}
        </div>
        {order.createdAt && (
          <span className="text-[10px] text-zinc-400 font-medium shrink-0 ml-2">
            {order.createdAt}
          </span>
        )}
      </div>
      </div>
    </div>
  );
}
