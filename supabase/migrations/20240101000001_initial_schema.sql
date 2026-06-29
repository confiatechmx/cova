-- 01_initial_schema.sql
-- Migración inicial para el Módulo Core Operativo - Llantera Cova (Culiacán, Sinaloa)

-- 1. CREACIÓN DE TABLAS

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    telefono TEXT, -- Número para integración de WhatsApp (ej. +52 667 XXXXXXX)
    correo TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: vehiculos
CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anio INTEGER NOT NULL,
    placas TEXT UNIQUE NOT NULL,
    vin TEXT,
    kilometraje_actual INTEGER NOT NULL DEFAULT 0 CHECK (kilometraje_actual >= 0)
);

-- Tabla: inventario_llantas
CREATE TABLE IF NOT EXISTS inventario_llantas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca TEXT NOT NULL,
    modelo_llanta TEXT NOT NULL,
    ancho INTEGER NOT NULL, -- Ej. 205
    perfil INTEGER NOT NULL, -- Ej. 55
    rin INTEGER NOT NULL, -- Ej. 16
    indice_carga_velocidad TEXT NOT NULL, -- Ej. 91V
    tipo_terreno TEXT NOT NULL CHECK (tipo_terreno IN ('AT', 'MT', 'HT', 'All Season', 'Passenger')),
    stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (precio_venta >= 0)
);

-- Tabla: cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE RESTRICT NOT NULL,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE RESTRICT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    estatus TEXT NOT NULL DEFAULT 'Borrador' CHECK (estatus IN ('Borrador', 'Enviada', 'Aceptada'))
);

-- Tabla: detalles_cotizacion
CREATE TABLE IF NOT EXISTS detalles_cotizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE CASCADE NOT NULL,
    llanta_id UUID REFERENCES inventario_llantas(id) ON DELETE RESTRICT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)
);

-- 2. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_llantas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_cotizacion ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE RLS (Acceso completo para usuarios autenticados de Llantera Cova)
-- Nota: También permitimos acceso de lectura/escritura a 'anon' para propósitos de demostración y prototipado rápido en la fase 1,
-- pero restringido a usuarios autenticados en producción real.
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON clientes FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON vehiculos FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON inventario_llantas FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON cotizaciones FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON detalles_cotizacion FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 4. INSERTAR SEMILLA DE DATOS DE PRUEBA REALISTAS (MÉXICO)

-- Clientes
INSERT INTO clientes (id, nombre, telefono, correo) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Juan Pérez', '+52 667 123 4567', 'juan.perez@email.com'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'María López', '+52 667 987 6543', 'maria.lopez@email.com'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Carlos Mendoza', '+52 667 444 5566', 'carlos.mendoza@email.com')
ON CONFLICT (id) DO NOTHING;

-- Vehículos
INSERT INTO vehiculos (id, cliente_id, marca, modelo, anio, placas, vin, kilometraje_actual) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nissan', 'Versa', 2020, 'VJS-456-A', '3N1CN8AP1LL123456', 45000),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Chevrolet', 'Aveo', 2018, 'VMY-789-B', 'KL1TD54E5JB654321', 72000),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Toyota', 'Hilux', 2021, 'VNZ-123-C', 'MR0FR22G9M8987654', 35000)
ON CONFLICT (id) DO NOTHING;

-- Inventario de Llantas (Medidas comunes y marcas reconocidas en México)
INSERT INTO inventario_llantas (id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, stock_actual, stock_minimo, precio_venta) VALUES
('10eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'Michelin', 'Primacy 4', 205, 55, 16, '91V', 'HT', 12, 4, 2450.00),
('20eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'Bridgestone', 'Turanza ER300', 205, 55, 16, '91V', 'HT', 3, 4, 2150.00), -- Alerta de stock bajo (3 < 4)
('30eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'Continental', 'PowerContact 2', 185, 60, 15, '84H', 'HT', 16, 6, 1680.00),
('40eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'Goodyear', 'Wrangler Duratrac', 265, 70, 17, '121S', 'MT', 8, 2, 4890.00),
('50eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'Firestone', 'Destination A/T', 225, 75, 16, '115S', 'AT', 2, 4, 3100.00), -- Alerta de stock bajo (2 < 4)
('60eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', 'Pirelli', 'Scorpion ATR', 235, 70, 16, '106T', 'AT', 10, 4, 2950.00)
ON CONFLICT (id) DO NOTHING;
