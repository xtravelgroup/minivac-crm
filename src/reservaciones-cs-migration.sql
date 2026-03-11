-- Migración: agregar columnas para reservaciones desde CS
alter table public.reservaciones
  add column if not exists lead_id        uuid references public.leads(id) on delete cascade,
  add column if not exists destino_nombre text,
  add column if not exists adultos        int default 2,
  add column if not exists ninos          int default 0,
  add column if not exists agente_nombre  text,
  add column if not exists historial      jsonb default '[]';

-- Hacer cliente_id opcional (antes era NOT NULL)
alter table public.reservaciones
  alter column cliente_id drop not null;

-- Hacer destino_id opcional (antes era NOT NULL con FK)
alter table public.reservaciones
  alter column destino_id drop not null;

-- Index para buscar por lead_id
create index if not exists idx_reservaciones_lead_id on public.reservaciones(lead_id);
