-- 02_refinement_schema.sql
-- Refinamientos del Módulo Core Operativo (Fase 1) - Llantera Cova

-- 1. AGREGAR COLUMNA DE COSTO DE ADQUISICIÓN AL INVENTARIO
ALTER TABLE inventario_llantas ADD COLUMN IF NOT EXISTS costo_adquisicion NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (costo_adquisicion >= 0);

-- Actualizar costos de adquisición para los neumáticos semilla
UPDATE inventario_llantas SET costo_adquisicion = 1650.00 WHERE id = '10eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';
UPDATE inventario_llantas SET costo_adquisicion = 1480.00 WHERE id = '20eebc99-9c0b-4ef8-bb6d-6bb9bd380b02';
UPDATE inventario_llantas SET costo_adquisicion = 1150.00 WHERE id = '30eebc99-9c0b-4ef8-bb6d-6bb9bd380b03';
UPDATE inventario_llantas SET costo_adquisicion = 3300.00 WHERE id = '40eebc99-9c0b-4ef8-bb6d-6bb9bd380b04';
UPDATE inventario_llantas SET costo_adquisicion = 2100.00 WHERE id = '50eebc99-9c0b-4ef8-bb6d-6bb9bd380b05';
UPDATE inventario_llantas SET costo_adquisicion = 1980.00 WHERE id = '60eebc99-9c0b-4ef8-bb6d-6bb9bd380b06';

-- 2. AGREGAR COLUMNAS DE ESPECIFICACIONES OEM A LOS VEHÍCULOS
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS presion_delantera_psi INTEGER DEFAULT 32;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS presion_trasera_psi INTEGER DEFAULT 32;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS medida_oem TEXT DEFAULT '205/55 R16';

-- Actualizar especificaciones OEM de vehículos semilla
UPDATE vehiculos SET presion_delantera_psi = 33, presion_trasera_psi = 33, medida_oem = '185/65 R15' WHERE id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
UPDATE vehiculos SET presion_delantera_psi = 30, presion_trasera_psi = 30, medida_oem = '185/60 R15' WHERE id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
UPDATE vehiculos SET presion_delantera_psi = 29, presion_trasera_psi = 36, medida_oem = '265/65 R17' WHERE id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';

-- 3. CREAR TABLA DE HISTORIAL DE SERVICIOS CLINICOS
CREATE TABLE IF NOT EXISTS historial_servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT NOT NULL,
    costo NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

-- Habilitar RLS para la tabla de historial
ALTER TABLE historial_servicios ENABLE ROW LEVEL SECURITY;

-- Crear política de RLS
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON historial_servicios FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Insertar historial de servicios semilla
INSERT INTO historial_servicios (id, vehiculo_id, fecha, descripcion, costo) VALUES
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '2026-03-10', 'Alineación, Balanceo y Rotación de neumáticos', 1200.00),
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '2025-09-15', 'Servicio de cambio de balatas delanteras', 1800.00),
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', '2026-01-20', 'Cambio de 2 amortiguadores delanteros y alineación', 4200.00),
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', '2025-06-12', 'Parche de sección en llanta trasera izquierda', 350.00),
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', '2026-04-05', 'Instalación de 4 llantas nuevas Goodyear Wrangler y balanceo', 20560.00),
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380c06', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', '2025-10-18', 'Engrasado de suspensión y reapriete general', 850.00)
ON CONFLICT (id) DO NOTHING;
