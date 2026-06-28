-- Hacer la columna de placas opcional (NULL)
ALTER TABLE vehiculos ALTER COLUMN placas DROP NOT NULL;
