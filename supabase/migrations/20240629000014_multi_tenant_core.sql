-- 20240629000014_multi_tenant_core.sql
-- Fase 1: Implementación del Núcleo Multi-tenant, Roles y Sucursales

-- 1. ESTRUCTURAS BASE PARA SAAS
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    estatus TEXT DEFAULT 'activo' CHECK (estatus IN ('activo', 'suspendido')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Perfiles ligados a Supabase Auth (auth.users)
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('SuperAdmin', 'Admin', 'Recepcionista', 'Mecanico')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. LIMPIEZA DE DATOS DE PROTOTIPADO (FASE 0)
-- Para poder inyectar la columna NOT NULL tenant_id sin errores, limpiamos los datos falsos del MVP.
TRUNCATE TABLE clientes CASCADE;
TRUNCATE TABLE vehiculos CASCADE;
TRUNCATE TABLE inventario_llantas CASCADE;
TRUNCATE TABLE cotizaciones CASCADE;
TRUNCATE TABLE detalles_cotizacion CASCADE;
TRUNCATE TABLE ordenes_servicio CASCADE;
TRUNCATE TABLE checklist_danos CASCADE;
TRUNCATE TABLE citas CASCADE;
TRUNCATE TABLE reglas_automatizacion CASCADE;
TRUNCATE TABLE plantillas_notificacion CASCADE;
TRUNCATE TABLE cola_notificaciones CASCADE;

-- 3. INYECCIÓN DE LA COLUMNA TENANT_ID A TODAS LAS TABLAS EXISTENTES
ALTER TABLE clientes ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE vehiculos ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE inventario_llantas ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE cotizaciones ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE detalles_cotizacion ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE ordenes_servicio ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE checklist_danos ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE citas ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE reglas_automatizacion ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE plantillas_notificacion ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE cola_notificaciones ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;

-- (Opcional) historial_servicios si existe, aunque puede ser borrado si se rediseña
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historial_servicios') THEN
        TRUNCATE TABLE historial_servicios CASCADE;
        ALTER TABLE historial_servicios ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL;
    END IF;
END $$;

-- 4. SEGURIDAD: FUNCIÓN DE BÚSQUEDA DE TENANT Y RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Función segura que obtiene el tenant_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM public.perfiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Políticas para las tablas Base
CREATE POLICY "Usuarios ven su propio tenant" ON tenants FOR SELECT USING (id = get_auth_tenant_id());
CREATE POLICY "Usuarios ven sucursales de su tenant" ON sucursales FOR ALL USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Usuarios ven perfiles de su tenant" ON perfiles FOR ALL USING (tenant_id = get_auth_tenant_id());

-- Borrar políticas inseguras del prototipo inicial (si existen)
DO $$
DECLARE
    tbl_name text;
    pol_record record;
BEGIN
    FOR tbl_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        FOR pol_record IN 
            SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl_name AND policyname = 'Permitir todo a usuarios autenticados y anonimos'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS "%s" ON %I', pol_record.policyname, tbl_name);
        END LOOP;
    END LOOP;
END $$;

-- Aplicar nuevas políticas estrictas a las tablas operativas
CREATE POLICY "Aislamiento estricto por tenant" ON clientes FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON vehiculos FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON inventario_llantas FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON cotizaciones FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON detalles_cotizacion FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON ordenes_servicio FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON checklist_danos FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON citas FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON reglas_automatizacion FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON plantillas_notificacion FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
CREATE POLICY "Aislamiento estricto por tenant" ON cola_notificaciones FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historial_servicios') THEN
        CREATE POLICY "Aislamiento estricto por tenant" ON historial_servicios FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
    END IF;
END $$;
