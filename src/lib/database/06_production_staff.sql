-- 06_production_staff.sql
-- Fase 5: Gestión de Personal, Roles y Control de Acceso - Llantera Cova

-- 1. CREAR TABLA DE EMPLEADOS
CREATE TABLE IF NOT EXISTS empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('Administrador', 'Vendedor', 'Mecánico')),
    activo BOOLEAN DEFAULT true NOT NULL
);

-- Habilitar RLS en empleados
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;

-- Crear política de RLS para empleados
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON empleados FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 2. INSERTAR EMPLEADOS SEMILLA (CON IDS PREDECIBLES PARA INTEGRIDAD)
-- Vendedores
INSERT INTO empleados (id, nombre, rol, activo) VALUES
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380e51', 'Sofía', 'Vendedor', true),
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380e52', 'caja_mostrador', 'Vendedor', true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Mecánicos
INSERT INTO empleados (id, nombre, rol, activo) VALUES
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380e53', 'Carlos', 'Mecánico', true),
('b001bc99-9c0b-4ef8-bb6d-6bb9bd380e54', 'Martín', 'Mecánico', true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;


-- 3. MODIFICAR TABLA: ORDENES DE SERVICIO (VINCULAR MECÁNICO)
-- Añadir columna mecanico_id de forma temporal como anulable
ALTER TABLE ordenes_servicio ADD COLUMN IF NOT EXISTS mecanico_id UUID REFERENCES empleados(id);

-- Actualizar registros de órdenes actuales para apuntar al mecánico Carlos
UPDATE ordenes_servicio SET mecanico_id = 'b001bc99-9c0b-4ef8-bb6d-6bb9bd380e53' WHERE mecanico_id IS NULL;

-- Cambiar columna a NOT NULL
ALTER TABLE ordenes_servicio ALTER COLUMN mecanico_id SET NOT NULL;


-- 4. MODIFICAR TABLA: COTIZACIONES (VINCULAR VENDEDOR)
-- Añadir columna vendedor_id de forma temporal como anulable
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES empleados(id);

-- Actualizar registros de cotizaciones actuales para apuntar a la vendedora Sofía
UPDATE cotizaciones SET vendedor_id = 'b001bc99-9c0b-4ef8-bb6d-6bb9bd380e51' WHERE vendedor_id IS NULL;

-- Cambiar columna a NOT NULL
ALTER TABLE cotizaciones ALTER COLUMN vendedor_id SET NOT NULL;


-- 5. ENMASCARAMIENTO DINÁMICO DE COSTOS EN INVENTARIO (VISTA)
-- Renombrar tabla original a inventario_llantas_base primero si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventario_llantas' AND table_type = 'BASE TABLE') THEN
        ALTER TABLE inventario_llantas RENAME TO inventario_llantas_base;
    END IF;
END $$;

-- Ahora que la tabla original está renombrada, podemos eliminar/reemplazar la vista si ya existiera de ejecuciones previas
DROP VIEW IF EXISTS inventario_llantas;

-- Crear vista dinámica de enmascaramiento
CREATE OR REPLACE VIEW inventario_llantas AS
SELECT 
    id,
    marca,
    modelo_llanta,
    ancho,
    perfil,
    rin,
    indice_carga_velocidad,
    tipo_terreno,
    stock_actual,
    stock_minimo,
    precio_venta,
    CASE 
        WHEN (
            EXISTS (
                SELECT 1 FROM empleados 
                WHERE id = auth.uid() 
                AND rol = 'Administrador'
            )
            -- Para depuraciones locales, pruebas, cron interno o cuando no hay sesión supabase activa
            OR auth.uid() IS NULL
        ) THEN costo_adquisicion
        ELSE NULL 
    END AS costo_adquisicion
FROM inventario_llantas_base;

-- Habilitar permisos DML en la vista para PostgREST
GRANT SELECT, INSERT, UPDATE, DELETE ON inventario_llantas TO authenticated, anon;
