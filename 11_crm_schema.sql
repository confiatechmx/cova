-- 11_crm_schema.sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    fecha_cita TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Confirmada', 'Llegó', 'Cancelada', 'No Asistió')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anonimos" ON citas;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON citas FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
