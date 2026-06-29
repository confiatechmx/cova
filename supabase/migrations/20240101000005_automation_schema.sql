-- 05_automation_schema.sql
-- Expansión de Fase 3: Reglas de Automatización - Llantera Cova

-- 1. CREAR TABLA DE CONFIGURACIÓN DE REGLAS DE NEGOCIO
CREATE TABLE IF NOT EXISTS reglas_automatizacion (
    id TEXT PRIMARY KEY, -- Ej. enviar_cotizacion_auto, avisar_auto_listo, recordatorio_rotacion_6m
    nombre TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- Habilitar RLS en reglas
ALTER TABLE reglas_automatizacion ENABLE ROW LEVEL SECURITY;

-- Crear política de RLS
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON reglas_automatizacion FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 2. INSERTAR REGLAS INICIALES (TODAS ACTIVAS POR DEFECTO)
INSERT INTO reglas_automatizacion (id, nombre, activa) VALUES
('enviar_cotizacion_auto', 'Enviar Cotización automática al crear en mostrador', TRUE),
('avisar_auto_listo', 'Avisar por WhatsApp cuando el coche pase a ''Listo para Entrega''', TRUE),
('recordatorio_rotacion_6m', 'Disparar Recordatorio de Rotación y Alineación a los 6 meses', TRUE)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- 3. AÑADIR BANDERA DE PREVENCIÓN DE ENVÍOS DUPLICADOS EN COTIZACIONES
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. INSERTAR LA NUEVA PLANTILLA PARA RECORDATORIO DE ROTACIÓN (6 MESES)
INSERT INTO plantillas_notificacion (id, nombre, contenido) VALUES
('recordatorio_rotacion', 'Recordatorio de Rotación (6 meses)', 'Hola {{cliente}}, han pasado 6 meses desde tu servicio o cambio de llantas en tu {{vehiculo}}. Te recordamos pasar a Cova para tu servicio de rotación, alineación y balanceo. ¡Te esperamos!')
ON CONFLICT (id) DO UPDATE SET contenido = EXCLUDED.contenido;
