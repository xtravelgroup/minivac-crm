-- Agregar columnas necesarias a reservaciones para el módulo CS
alter table public.reservaciones
  add column if not exists lead_id        uuid references public.leads(id) on delete cascade,
  add column if not exists destino_nombre text,
  add column if not exists adultos        int default 2,
  add column if not exists ninos          int default 0,
  add column if not exists agente_nombre  text,
  add column if not exists historial      jsonb default '[]';

-- Índice para buscar reservas por lead
create index if not exists idx_reservaciones_lead_id on public.reservaciones(lead_id);

-- RLS: permitir acceso a reservaciones
alter table public.reservaciones enable row level security;

drop policy if exists "reservaciones_all" on public.reservaciones;
create policy "reservaciones_all" on public.reservaciones
  for all using (true) with check (true);
