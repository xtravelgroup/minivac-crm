-- Agregar columnas para Zoho Payments (B1 flow)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS zoho_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS zoho_customer_id        TEXT,
  ADD COLUMN IF NOT EXISTS tarjeta_last4           TEXT,
  ADD COLUMN IF NOT EXISTS tarjeta_brand           TEXT;

-- Ya no necesitamos guardar datos de tarjeta en crudo
-- (se limpian automaticamente pero dejamos las columnas por compatibilidad)
