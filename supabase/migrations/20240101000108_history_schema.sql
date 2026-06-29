-- 08_history_schema.sql
-- Fase 7: Módulo Historial POS - Llantera Cova

-- 1. ACTUALIZAR CONSTRICCIÓN DE ESTATUS EN COTIZACIONES PARA SOPORTAR CANCELACIONES
-- Eliminar restricción antigua
ALTER TABLE cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_estatus_check;

-- Recrear restricción incluyendo el estado 'Cancelada'
ALTER TABLE cotizaciones ADD CONSTRAINT cotizaciones_estatus_check CHECK (estatus IN ('Borrador', 'Enviada', 'Aceptada', 'Pagada', 'Cancelada'));
