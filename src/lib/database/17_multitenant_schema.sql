-- 17_multitenant_schema.sql
-- Migración a Arquitectura SaaS (Multi-Tenant Lógico)

-- 1. Limpiar datos de prueba (TRUNCATE) para evitar violaciones de foreign keys al añadir columnas NOT NULL
TRUNCATE TABLE 
  mensajes_omnicanal, 
  conversaciones_omnicanal, 
  plantillas_notificacion, 
  reglas_automatizacion, 
  pagos_orden, 
  detalles_cotizacion, 
  cotizaciones, 
  orden_servicio_servicios, 
  ordenes_servicio, 
  vehiculos, 
  clientes, 
  empleados, 
  inventario_llantas_base, 
  servicios_taller, 
  configuracion_pagos, 
  configuracion_empresa 
CASCADE;

-- 2. Adaptar la tabla de Empresas
ALTER TABLE configuracion_empresa RENAME TO empresas;
DROP INDEX IF EXISTS unq_configuracion_empresa;

-- 3. Crear tabla de Perfiles de Usuario
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT,
  rol TEXT DEFAULT 'Administrador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Función Auxiliar de Seguridad (Contexto del Tenant actual)
CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.perfiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Añadir columna empresa_id a TODAS las tablas con un valor DEFAULT que lee del usuario
-- Esto evita tener que reescribir todos los .insert() en el frontend
DO $$
DECLARE
    t TEXT;
    tablas TEXT[] := ARRAY[
        'clientes', 'vehiculos', 'ordenes_servicio', 'empleados', 'inventario_llantas_base', 
        'servicios_taller', 'configuracion_pagos', 'conversaciones_omnicanal', 
        'reglas_automatizacion', 'plantillas_notificacion', 'orden_servicio_servicios', 
        'cotizaciones', 'detalles_cotizacion', 'pagos_orden', 'mensajes_omnicanal'
    ];
BEGIN
    FOREACH t IN ARRAY tablas
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ADD COLUMN empresa_id UUID NOT NULL DEFAULT public.user_empresa_id() REFERENCES empresas(id) ON DELETE CASCADE;';
    END LOOP;
END $$;

-- Recrear la vista de inventario para que incluya empresa_id
DROP VIEW IF EXISTS inventario_llantas;
CREATE VIEW inventario_llantas WITH (security_invoker = true) AS
SELECT id, marca, modelo_llanta, ancho, perfil, rin, indice_carga_velocidad, tipo_terreno, stock_actual, stock_minimo, precio_venta, 
    CASE
        WHEN ((EXISTS ( SELECT 1 FROM empleados WHERE ((empleados.id = auth.uid()) AND (empleados.rol = 'Administrador'::text)))) OR (auth.uid() IS NULL)) THEN costo_adquisicion
        ELSE NULL::numeric
    END AS costo_adquisicion,
    empresa_id
FROM inventario_llantas_base;

-- 6. Configurar RLS (Row Level Security)
-- Eliminar politicas viejas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END $$;

-- Asegurar que RLS esté activo
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- Nuevas Politicas de Aislamiento
CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON perfiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Usuarios pueden ver su empresa" ON empresas FOR SELECT USING (id = public.user_empresa_id());
CREATE POLICY "Usuarios pueden actualizar su empresa" ON empresas FOR UPDATE USING (id = public.user_empresa_id());

DO $$
DECLARE
    t TEXT;
    tablas TEXT[] := ARRAY[
        'clientes', 'vehiculos', 'ordenes_servicio', 'empleados', 'inventario_llantas_base', 
        'servicios_taller', 'configuracion_pagos', 'conversaciones_omnicanal', 
        'reglas_automatizacion', 'plantillas_notificacion', 'orden_servicio_servicios', 
        'cotizaciones', 'detalles_cotizacion', 'pagos_orden', 'mensajes_omnicanal'
    ];
BEGIN
    FOREACH t IN ARRAY tablas
    LOOP
        -- Política que aisla la lectura, edición, inserción y borrado SOLO al tenant del usuario
        EXECUTE 'CREATE POLICY "Aislamiento SaaS ' || quote_ident(t) || '" ON public.' || quote_ident(t) || ' FOR ALL TO authenticated USING (empresa_id = public.user_empresa_id()) WITH CHECK (empresa_id = public.user_empresa_id());';
    END LOOP;
END $$;

-- 7. Función RPC para que los usuarios se registren (Sign Up) y creen su Empresa automáticamente
CREATE OR REPLACE FUNCTION crear_empresa_y_perfil(p_nombre_empresa TEXT, p_nombre_usuario TEXT)
RETURNS void AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Verificar si el usuario ya tiene empresa
  IF EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una empresa';
  END IF;

  -- Insertar la empresa
  INSERT INTO empresas (nombre_comercial) VALUES (p_nombre_empresa) RETURNING id INTO v_empresa_id;
  
  -- Insertar el perfil del usuario actual con ese empresa_id
  INSERT INTO perfiles (id, empresa_id, nombre, rol) VALUES (auth.uid(), v_empresa_id, p_nombre_usuario, 'Administrador');
  
  -- Insertar configuración de pagos por defecto para esta empresa
  INSERT INTO configuracion_pagos (empresa_id, proveedor, comision_porcentaje, activo) VALUES 
    (v_empresa_id, 'Efectivo', 0.00, true),
    (v_empresa_id, 'Transferencia', 0.00, true),
    (v_empresa_id, 'Mercado Pago', 3.50, true),
    (v_empresa_id, 'Stripe', 3.50, true),
    (v_empresa_id, 'KueskiPay', 5.50, true),
    (v_empresa_id, 'Atrato', 5.50, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
