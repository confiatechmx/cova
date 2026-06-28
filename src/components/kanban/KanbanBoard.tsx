"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard, Order } from "./KanbanCard";
import { ChevronDown, Filter, Search, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Modal } from "../ui/Modal";
import { OrderForm } from "./OrderForm";
import { OrderDetailsModal } from "./OrderDetailsModal";

const defaultColumns = [
  { id: "Citas del Día", title: "Citas del Día" },
  { id: "En Inspección", title: "En Inspección" },
  { id: "En Rampa", title: "En Rampa (Trabajando)" },
  { id: "Listo para Entrega", title: "Listo para Entrega" },
];

function SkeletonCard() {
  return (
    <div className="panel-card p-3 flex flex-col gap-2 relative animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-2 h-2 rounded-full bg-zinc-200" />
          <div className="h-4 bg-zinc-200 rounded w-24" />
        </div>
        <div className="h-4 bg-zinc-200 rounded w-16" />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <div className="w-3 h-3 rounded-full bg-zinc-200" />
        <div className="h-3 bg-zinc-200 rounded w-20" />
      </div>
      <div className="flex justify-between items-end mt-2">
        <div className="h-4 bg-zinc-200 rounded w-16" />
        <div className="h-3 bg-zinc-200 rounded w-12" />
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const [columns] = useState(defaultColumns);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [initialColumn, setInitialColumn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
        .from('ordenes_servicio')
        .select(`
          id,
          estado,
          prioridad,
          fecha_ingreso,
          notas_recepcion,
          vehiculos (
            marca,
            modelo,
            placas,
            clientes (
              nombre
            )
          )
        `);
      
      if (error) {
        console.error('Error fetching orders:', error);
      } else if (data) {
        const formattedOrders: Order[] = data.map((d: any) => ({
          id: d.id,
          columnId: d.estado,
          carModel: `${d.vehiculos.marca} ${d.vehiculos.modelo}`,
          plates: d.vehiculos.placas,
          customerName: d.vehiculos.clientes.nombre,
          priority: d.prioridad || "normal",
          services: d.notas_recepcion ? ["Servicio Programado"] : [],
          createdAt: new Date(d.fecha_ingreso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        }));
        setOrders(formattedOrders);
      }
      setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find((o) => o.id === active.id);
    if (order) {
      setActiveOrder(order);
      setInitialColumn(order.columnId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Order";
    const isOverTask = over.data.current?.type === "Order";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setOrders((orders) => {
        const activeIndex = orders.findIndex((t) => t.id === activeId);
        const overIndex = orders.findIndex((t) => t.id === overId);

        if (orders[activeIndex].columnId !== orders[overIndex].columnId) {
          const newOrders = [...orders];
          newOrders[activeIndex].columnId = newOrders[overIndex].columnId;
          return arrayMove(newOrders, activeIndex, overIndex);
        }
        return arrayMove(orders, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setOrders((orders) => {
        const activeIndex = orders.findIndex((t) => t.id === activeId);
        const newOrders = [...orders];
        newOrders[activeIndex].columnId = overId as string;
        return arrayMove(newOrders, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null);
    const { active } = event;
    const order = orders.find((o) => o.id === active.id);
    
    // Optistic update check and DB persistence
    if (order && initialColumn !== null && order.columnId !== initialColumn) {
       supabase.from('ordenes_servicio')
         .update({ estado: order.columnId })
         .eq('id', order.id)
         .then(({ error }) => {
             if (error) {
               console.error("Error updating order state in Supabase:", error);
               // Here you could revert the optimistic update if needed
             }
         });
    }
    setInitialColumn(null);
  };

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    const matchName = order.customerName.toLowerCase().includes(query);
    const matchCar = order.carModel.toLowerCase().includes(query);
    const matchPlates = order.plates.toLowerCase().includes(query);
    return matchName || matchCar || matchPlates;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header and Filters Row */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-4 gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Tablero de Operaciones</h1>
            <p className="text-sm font-light text-zinc-500 mt-1">Gestiona el flujo de trabajo y las órdenes del día.</p>
          </div>
          <button 
            onClick={() => setIsOrderModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva Orden
          </button>
        </div>

        {/* Toolbar / Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-zinc-400" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar placa, cliente o auto..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-zinc-200/80 rounded-md bg-zinc-50/50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-blue-500 sm:text-sm transition-all"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors">
            <span className="text-zinc-400 font-normal">Estatus:</span> Todos
            <ChevronDown size={14} className="ml-1 opacity-50" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors">
            Servicios (Todos)
            <ChevronDown size={14} className="ml-1 opacity-50" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors">
            <span className="text-zinc-400 font-normal">Ver:</span> Hoy
            <ChevronDown size={14} className="ml-1 opacity-50" />
          </button>
          
          <div className="ml-auto">
            <button className="flex items-center justify-center p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
              <Filter size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="flex-1 w-full pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 w-full h-full overflow-x-auto snap-x snap-mandatory pb-4 dense-scrollbar">
            {columns.map((col) => (
              <div key={col.id} className="h-full flex flex-col relative min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center md:snap-align-none">
                {loading && (
                  <div className="absolute top-12 left-0 right-0 bottom-0 z-20 flex flex-col gap-2.5 p-2.5 overflow-hidden">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                <KanbanColumn
                  id={col.id}
                  title={col.title}
                  orders={filteredOrders.filter((o) => o.columnId === col.id)}
                  onCardClick={(id) => setSelectedOrderId(id)}
                />
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeOrder ? <KanbanCard order={activeOrder} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal for New Order */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Crear Nueva Orden de Servicio"
        description="Selecciona un cliente y su vehículo para ingresarlo al taller."
      >
        <OrderForm 
          onSuccess={() => {
            setIsOrderModalOpen(false);
            fetchOrders();
          }}
          onCancel={() => setIsOrderModalOpen(false)}
        />
      </Modal>

      {/* Modal for Order Details (Expediente) */}
      <Modal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        title="Expediente de Servicio"
        description="Detalle completo de la orden, cliente y vehículo."
      >
        {selectedOrderId && (
          <OrderDetailsModal 
            orderId={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
            onUpdate={fetchOrders}
          />
        )}
      </Modal>
    </div>
  );
}
