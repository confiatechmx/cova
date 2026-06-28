-- 11_payment_intents_schema.sql
-- Evolución de Pagos a Payment Intents

ALTER TABLE pagos_orden RENAME COLUMN monto TO monto_total;
ALTER TABLE pagos_orden RENAME COLUMN metodo_pago TO proveedor_pago;
ALTER TABLE pagos_orden RENAME COLUMN referencia TO external_transaction_id;

ALTER TABLE pagos_orden DROP CONSTRAINT IF EXISTS pagos_orden_metodo_pago_check;
ALTER TABLE pagos_orden DROP CONSTRAINT IF EXISTS pagos_orden_proveedor_pago_check;

ALTER TABLE pagos_orden ADD CONSTRAINT pagos_orden_proveedor_pago_check CHECK (proveedor_pago IN ('Efectivo', 'Mercado Pago', 'Stripe', 'KueskiPay', 'Atrato', 'Transferencia'));

ALTER TABLE pagos_orden ADD COLUMN IF NOT EXISTS estatus TEXT NOT NULL DEFAULT 'Aprobado' CHECK (estatus IN ('Pendiente', 'Procesando', 'Aprobado', 'Rechazado', 'Reembolsado'));

ALTER TABLE pagos_orden ADD COLUMN IF NOT EXISTS comision_pasarela DECIMAL(10,2) DEFAULT 0.00;
