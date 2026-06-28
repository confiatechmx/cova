-- 10_payments_schema.sql
-- Módulo de Caja y Pagos

ALTER TABLE ordenes_servicio ADD COLUMN IF NOT EXISTS estatus_pago TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estatus_pago IN ('Pendiente', 'Parcial', 'Pagado'));

CREATE TABLE IF NOT EXISTS pagos_orden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_servicio_id UUID REFERENCES ordenes_servicio(id) ON DELETE CASCADE NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
    referencia TEXT,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE pagos_orden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON pagos_orden FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
