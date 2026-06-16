-- 04_whatsapp_schema.sql
-- Migración para Fase 3: Integración de WhatsApp y CRM - Llantera Cova

-- 1. CREACIÓN DE TABLAS

-- Tabla: cola_notificaciones
CREATE TABLE IF NOT EXISTS cola_notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefono TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Enviado', 'Fallido')),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE
);

-- Tabla: plantillas_notificacion
CREATE TABLE IF NOT EXISTS plantillas_notificacion (
    id TEXT PRIMARY KEY, -- Ej. cotizacion, auto_listo, recordatorio
    nombre TEXT NOT NULL,
    contenido TEXT NOT NULL
);

-- 2. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE cola_notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_notificacion ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE RLS (Acceso completo para usuarios autenticados y anonimos de Llantera Cova)
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON cola_notificaciones FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON plantillas_notificacion FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 4. INSERTAR SEMILLA DE PLANTILLAS DE NEGOCIO
INSERT INTO plantillas_notificacion (id, nombre, contenido) VALUES
('cotizacion', 'Cotización Enviada', 'Hola {{cliente}}, te compartimos la cotización de tu vehículo {{vehiculo}} por un total de {{total}}. Puedes ver los detalles aquí: {{enlace}}. ¡Saludos de Llantera Cova!'),
('auto_listo', 'Vehículo Listo para Entrega', 'Hola {{cliente}}, tu vehículo {{vehiculo}} ya está listo para entrega en Llantera Cova. Kilometraje actual registrado: {{kilometraje}} km. ¡Puedes pasar por él!'),
('recordatorio', 'Recordatorio de Calibración', 'Hola {{cliente}}, te recordamos calibrar tus llantas en Llantera Cova. Presión recomendada: {{presion_delantera}} PSI delantera / {{presion_trasera}} PSI trasera. ¡Te esperamos!')
ON CONFLICT (id) DO UPDATE SET contenido = EXCLUDED.contenido;

-- 5. INSERTAR DATOS SEMILLA EN LA COLA DE MENSAJES (MOCK OPERACIONAL)
INSERT INTO cola_notificaciones (id, telefono, mensaje, estado, fecha_creacion, fecha_envio) VALUES
('33eebc99-9c0b-4ef8-bb6d-6bb9bd380001', '+52 667 123 4567', 'Hola Juan Pérez, te compartimos la cotización de tu vehículo Nissan Versa por un total de $2,450.00. ¡Saludos!', 'Enviado', timezone('utc'::text, now() - interval '1 hour'), timezone('utc'::text, now() - interval '58 minutes')),
('33eebc99-9c0b-4ef8-bb6d-6bb9bd380002', '+52 667 987 6543', 'Hola María López, tu vehículo Chevrolet Aveo ya está listo para entrega en Llantera Cova. Kilometraje actual registrado: 72,000 km. ¡Puedes pasar por él!', 'Pendiente', timezone('utc'::text, now() - interval '10 minutes'), NULL),
('33eebc99-9c0b-4ef8-bb6d-6bb9bd380003', '+52 667 444 5566', 'Hola Carlos Mendoza, te recordamos calibrar tus llantas en Llantera Cova. Presión recomendada: 29 PSI delantera / 36 PSI trasera. ¡Te esperamos!', 'Fallido', timezone('utc'::text, now() - interval '30 minutes'), NULL)
ON CONFLICT (id) DO NOTHING;
