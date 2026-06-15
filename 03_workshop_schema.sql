-- 03_workshop_schema.sql
-- Migración para Fase 2: Control de Taller - Llantera Cova (Culiacán, Sinaloa)

-- 1. CREACIÓN DE TABLAS

-- Tabla: ordenes_servicio
CREATE TABLE IF NOT EXISTS ordenes_servicio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE NOT NULL,
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
    nivel_gasolina TEXT NOT NULL CHECK (nivel_gasolina IN ('Vacío', '1/4', '1/2', '3/4', 'Lleno')),
    kilometraje_ingreso INTEGER NOT NULL CHECK (kilometraje_ingreso >= 0),
    notas_recepcion TEXT,
    estado TEXT NOT NULL DEFAULT 'En Fila' CHECK (estado IN ('En Fila', 'En Proceso', 'Listo para Entrega')),
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: checklist_danos
CREATE TABLE IF NOT EXISTS checklist_danos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_servicio_id UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
    zona_vehiculo TEXT NOT NULL, -- Ej. facia_delantera, puerta_delantera_izq, facia_trasera
    tipo_dano TEXT NOT NULL, -- Ej. rayón, golpe, cristal, raspón
    url_foto TEXT -- URL en Supabase Storage
);

-- 2. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE ordenes_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_danos ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE RLS (Acceso completo para usuarios autenticados y anonimos de Llantera Cova)
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON ordenes_servicio FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON checklist_danos FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 4. INSERTAR DATOS SEMILLA REALISTAS (TALLER OPERANDO EN PATIO)

-- Crear un vehículo adicional para tener una variedad completa de 4 autos en el Kanban
INSERT INTO vehiculos (id, cliente_id, marca, modelo, anio, placas, vin, kilometraje_actual, presion_delantera_psi, presion_trasera_psi, medida_oem) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nissan', 'NP300', 2019, 'VMX-456-D', '3N1CN8AP1LL999999', 89000, 35, 40, '195/75 R15')
ON CONFLICT (id) DO NOTHING;

-- Insertar Ordenes de Servicio
-- Orden 1: Aveo (En Fila)
INSERT INTO ordenes_servicio (id, vehiculo_id, nivel_gasolina, kilometraje_ingreso, notas_recepcion, estado, fecha_ingreso) VALUES
('11eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', '1/4', 72050, 'Cliente reporta un rechinido constante al frenar a baja velocidad.', 'En Fila', timezone('utc'::text, now() - interval '2 hours'))
ON CONFLICT (id) DO NOTHING;

-- Orden 2: Hilux (En Proceso)
INSERT INTO ordenes_servicio (id, vehiculo_id, nivel_gasolina, kilometraje_ingreso, notas_recepcion, estado, fecha_ingreso) VALUES
('11eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', '3/4', 35080, 'Montaje de 4 llantas nuevas Goodyear Wrangler y alineación / balanceo.', 'En Proceso', timezone('utc'::text, now() - interval '4 hours'))
ON CONFLICT (id) DO NOTHING;

-- Orden 3: Versa (Listo para Entrega)
INSERT INTO ordenes_servicio (id, vehiculo_id, nivel_gasolina, kilometraje_ingreso, notas_recepcion, estado, fecha_ingreso) VALUES
('11eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '1/2', 45010, 'Alineación y Balanceo de rutina. Calibración general de llantas.', 'Listo para Entrega', timezone('utc'::text, now() - interval '1 hours'))
ON CONFLICT (id) DO NOTHING;

-- Orden 4: NP300 (En Fila)
INSERT INTO ordenes_servicio (id, vehiculo_id, nivel_gasolina, kilometraje_ingreso, notas_recepcion, estado, fecha_ingreso) VALUES
('11eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'Lleno', 89000, 'Servicio de cambio de amortiguadores delanteros y revisión de bujes de suspensión.', 'En Fila', timezone('utc'::text, now() - interval '5 hours'))
ON CONFLICT (id) DO NOTHING;

-- Insertar Checklist de Daños
INSERT INTO checklist_danos (id, orden_servicio_id, zona_vehiculo, tipo_dano, url_foto) VALUES
('22eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'Facia Delantera', 'Rayón leve inferior derecho', 'facia_delantera_aveo.jpg'),
('22eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'Puerta Trasera Derecha', 'Golpe pequeño en moldura', 'puerta_trasera_hilux.jpg')
ON CONFLICT (id) DO NOTHING;
