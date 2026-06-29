-- 12_settings_schema.sql
-- Tablas para autogestión de la empresa y pagos

CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    rfc TEXT,
    direccion TEXT,
    tasa_iva DECIMAL(5,2) DEFAULT 16.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Para asegurar que solo haya 1 fila de configuración global
CREATE UNIQUE INDEX IF NOT EXISTS unq_configuracion_empresa ON configuracion_empresa((1));

CREATE TABLE IF NOT EXISTS configuracion_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor TEXT NOT NULL UNIQUE,
    comision_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON configuracion_empresa FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE configuracion_pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados y anonimos" ON configuracion_pagos FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Insertar datos por defecto
INSERT INTO configuracion_empresa (nombre_comercial, rfc, direccion, tasa_iva) 
VALUES ('AutoService Cova', 'XAXX010101000', 'Av. Principal 123, Ciudad', 16.00)
ON CONFLICT DO NOTHING;

INSERT INTO configuracion_pagos (proveedor, comision_porcentaje, activo) VALUES 
('Efectivo', 0.00, true),
('Transferencia', 0.00, true),
('Mercado Pago', 3.50, true),
('Stripe', 3.50, true),
('KueskiPay', 5.50, true),
('Atrato', 5.50, true)
ON CONFLICT (proveedor) DO NOTHING;
