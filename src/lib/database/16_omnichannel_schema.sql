-- 16_omnichannel_schema.sql
-- Fase 6: Arquitectura Omnicanal (WhatsApp, Meta, TikTok)

CREATE TABLE IF NOT EXISTS conversaciones_omnicanal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    canal TEXT NOT NULL CHECK (canal IN ('WhatsApp_Baileys', 'WhatsApp_Cloud', 'Facebook', 'Instagram', 'TikTok')),
    identificador_externo TEXT NOT NULL, -- Ej: Número de teléfono, IG Scoped ID, FB Scoped ID
    estado TEXT NOT NULL DEFAULT 'Abierto' CHECK (estado IN ('Abierto', 'Cerrado', 'Esperando_Usuario')),
    ultimo_mensaje_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(canal, identificador_externo)
);

CREATE TABLE IF NOT EXISTS mensajes_omnicanal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversacion_id UUID REFERENCES conversaciones_omnicanal(id) ON DELETE CASCADE NOT NULL,
    sentido TEXT NOT NULL CHECK (sentido IN ('Entrante', 'Saliente')),
    tipo TEXT NOT NULL DEFAULT 'Texto' CHECK (tipo IN ('Texto', 'Imagen', 'Audio', 'Lead', 'Plantilla')),
    contenido TEXT NOT NULL,
    metadatos JSONB DEFAULT '{}'::jsonb, -- Para URLs de imágenes, datos de leads, etc.
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE conversaciones_omnicanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_omnicanal ENABLE ROW LEVEL SECURITY;

-- Políticas (Solo usuarios autenticados)
CREATE POLICY "Permitir todo a usuarios autenticados" ON conversaciones_omnicanal FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a usuarios autenticados" ON mensajes_omnicanal FOR ALL TO authenticated USING (true) WITH CHECK (true);
