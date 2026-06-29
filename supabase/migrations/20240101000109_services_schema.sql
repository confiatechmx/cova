-- 09_services_schema.sql
-- Fase 8: Módulo CRUD de Servicios Dinámicos - Llantera Cova

CREATE TABLE IF NOT EXISTS servicios_taller (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  aplica_promo_llantas BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed de servicios iniciales
INSERT INTO servicios_taller (nombre, descripcion, precio, aplica_promo_llantas, activo)
VALUES
  ('Alineación y Balanceo Premium', 'Servicio de alineación por computadora y balanceo dinámico.', 1200.00, true, true),
  ('Nitrógeno Automotriz', 'Llenado de 4 llantas con nitrógeno para mayor estabilidad térmica.', 250.00, false, true),
  ('Servicio de Frenos (Balatas)', 'Revisión y cambio de balatas en un eje.', 1800.00, false, true);
