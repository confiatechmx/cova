-- 07_pos_schema.sql
-- Fase 6: Módulo POS e Integridad de Ventas - Llantera Cova

-- 1. ACTUALIZAR CONSTRICCIÓN DE ESTATUS EN COTIZACIONES
-- Eliminar restricción antigua
ALTER TABLE cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_estatus_check;

-- Recrear restricción incluyendo el estado 'Pagada'
ALTER TABLE cotizaciones ADD CONSTRAINT cotizaciones_estatus_check CHECK (estatus IN ('Borrador', 'Enviada', 'Aceptada', 'Pagada'));
