-- Agregar columnas faltantes a la tabla leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ciudad       text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estado_us    text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zip          text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS spot_id      uuid references public.radio_spots(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS bloqueado    boolean default false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS bloqueado_nota text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS destinos     jsonb default '[]';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notas        jsonb default '[]';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tarjeta_captura_ts timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zoho_payment_method_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zoho_customer_id       text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tarjeta_last4          text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tarjeta_brand          text;
