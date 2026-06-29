-- 13_crm_extended.sql
-- Add extended fields to clients and vehicles

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS rfc TEXT,
ADD COLUMN IF NOT EXISTS fuente_adquisicion TEXT,
ADD COLUMN IF NOT EXISTS notas_internas TEXT;

ALTER TABLE vehiculos
ADD COLUMN IF NOT EXISTS vin TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS kilometraje TEXT;
