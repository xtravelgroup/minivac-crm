-- ============================================================
-- TABLA LEAD_HISTORIAL
-- Registra todos los eventos de un lead
-- ============================================================

create table if not exists public.lead_historial (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  tipo        text not null,   -- 'status' | 'destino' | 'pago' | 'nota' | 'datos'
  descripcion text not null,
  detalle     jsonb,           -- datos adicionales del evento
  usuario_id  uuid,            -- auth_id del usuario que hizo el cambio
  usuario_nombre text,
  created_at  timestamptz not null default now()
);

create index if not exists lead_historial_lead_id_idx on public.lead_historial(lead_id);
create index if not exists lead_historial_created_at_idx on public.lead_historial(created_at desc);

alter table public.lead_historial enable row level security;
create policy "historial_select" on public.lead_historial for select to authenticated using (true);
create policy "historial_insert" on public.lead_historial for insert to authenticated with check (true);
