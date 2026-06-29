-- 15_auth_rls_update.sql
-- Este script actualiza todas las tablas para remover el acceso anónimo y 
-- restringir el acceso únicamente a usuarios autenticados (sesiones válidas).

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        -- 1. Eliminar política antigua permisiva
        EXECUTE format('DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos" ON %I;', t);
        
        -- 2. Eliminar por si acaso existe la política nueva de ejecuciones parciales
        EXECUTE format('DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON %I;', t);
        
        -- 3. Crear política restrictiva (solo usuarios con sesión iniciada)
        EXECUTE format('CREATE POLICY "Permitir todo a usuarios autenticados" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
    END LOOP;
END
$$;
