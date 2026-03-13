-- Agregar columna pagos_historial a leads para guardar abonos posteriores
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS pagos_historial jsonb default '[]';
