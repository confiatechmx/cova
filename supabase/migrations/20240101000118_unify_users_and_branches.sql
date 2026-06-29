-- 20240101000118_unify_users_and_branches.sql
-- Fase 2: Saneamiento de Deuda Técnica (Usuarios únicos y Arquitectura Multi-Sucursal)

-- 1. CREACIÓN DE SUCURSALES
CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver las sucursales de su empresa" 
ON sucursales FOR SELECT 
USING (empresa_id = public.user_empresa_id());

CREATE POLICY "Usuarios pueden administrar sucursales de su empresa" 
ON sucursales FOR ALL TO authenticated 
USING (empresa_id = public.user_empresa_id()) 
WITH CHECK (empresa_id = public.user_empresa_id());

-- 2. ENLACE DE ENTIDADES OPERATIVAS A SUCURSALES (Opcional por ahora para no romper datos)
ALTER TABLE ordenes_servicio ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);
ALTER TABLE pagos_orden ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);
ALTER TABLE inventario_llantas_base ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);

-- 3. EXPANSIÓN Y PROTECCIÓN DE PERFILES (USUARIOS REALES)
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE perfiles ADD CONSTRAINT perfiles_rol_check 
CHECK (rol IN ('Administrador', 'Vendedor', 'Mecánico', 'Recepcionista', 'SuperAdmin'));

-- 4. REFACTORIZACIÓN DE VISTA (Desvincular de Empleados)
DROP VIEW IF EXISTS inventario_llantas;

CREATE VIEW inventario_llantas WITH (security_invoker = true) AS
SELECT id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, stock_actual, stock_minimo, precio_venta, 
    CASE
        WHEN (
            (EXISTS ( SELECT 1 FROM perfiles WHERE ((perfiles.id = auth.uid()) AND (perfiles.rol = 'Administrador'::text)))) 
            OR (auth.uid() IS NULL)
        ) THEN costo_adquisicion
        ELSE NULL::numeric
    END AS costo_adquisicion,
    empresa_id,
    sucursal_id
FROM inventario_llantas_base;

-- Restaurar permisos a la vista
GRANT SELECT, INSERT, UPDATE, DELETE ON inventario_llantas TO authenticated, anon;


-- 5. REDIRECCIÓN DE CLAVES FORÁNEAS (Apuntar al sistema de Auth en lugar de Empleados huérfanos)
-- Para cotizaciones (vendedor)
ALTER TABLE cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_vendedor_id_fkey;
ALTER TABLE cotizaciones ADD CONSTRAINT cotizaciones_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES perfiles(id);

-- Para ordenes_servicio (mecanico)
ALTER TABLE ordenes_servicio DROP CONSTRAINT IF EXISTS ordenes_servicio_mecanico_id_fkey;
ALTER TABLE ordenes_servicio ADD CONSTRAINT ordenes_servicio_mecanico_id_fkey FOREIGN KEY (mecanico_id) REFERENCES perfiles(id);

-- Para inventario_movimientos o cualquier otra tabla que usara empleado_id (si las hay, aunque en el script 06 solo vinculamos cotizaciones y ordenes)

-- 6. ELIMINACIÓN DEFINITIVA DE LA TABLA FANTASMA DE EMPLEADOS
-- Dado que la tabla "empleados" tiene datos dummy ('b001bc99...') que no existen en auth.users,
-- y que choca estructuralmente con "perfiles", la eliminamos por completo.
DROP TABLE IF EXISTS empleados CASCADE;
