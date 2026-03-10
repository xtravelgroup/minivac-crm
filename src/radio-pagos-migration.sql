-- ============================================================
-- MIGRACION: radio_pagos — Travel X Group CRM
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Tabla de pagos a emisoras
create table if not exists public.radio_pagos (
  id            uuid primary key default uuid_generate_v4(),
  emisora_id    uuid not null references public.emisoras(id) on delete cascade,
  fecha         date not null default current_date,
  monto         numeric(10,2) not null,
  metodo        text not null default 'transferencia'
                  check (metodo in ('transferencia','cheque','efectivo','tarjeta','otro')),
  referencia    text,                      -- numero de cheque / confirmacion
  notas         text,
  created_by    uuid references public.usuarios(id),
  created_at    timestamptz not null default now()
);

-- Tabla puente: que spots cubre cada pago
create table if not exists public.radio_pago_spots (
  pago_id   uuid not null references public.radio_pagos(id) on delete cascade,
  spot_id   uuid not null references public.radio_spots(id) on delete cascade,
  primary key (pago_id, spot_id)
);

-- Indices
create index if not exists idx_radio_pagos_emisora on public.radio_pagos(emisora_id);
create index if not exists idx_radio_pagos_fecha   on public.radio_pagos(fecha);
create index if not exists idx_rps_pago_id         on public.radio_pago_spots(pago_id);
create index if not exists idx_rps_spot_id         on public.radio_pago_spots(spot_id);

-- RLS
alter table public.radio_pagos       enable row level security;
alter table public.radio_pago_spots  enable row level security;

-- radio_pagos: leer admin/director/supervisor/contador
create policy "radio_pagos_select" on public.radio_pagos
  for select to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.auth_id = auth.uid()
      and u.rol in ('admin','director','supervisor','contador')
      and u.activo = true
    )
  );

-- radio_pagos: insertar admin/director/supervisor
create policy "radio_pagos_insert" on public.radio_pagos
  for insert to authenticated
  with check (
    exists (
      select 1 from public.usuarios u
      where u.auth_id = auth.uid()
      and u.rol in ('admin','director','supervisor')
      and u.activo = true
    )
  );

-- radio_pagos: eliminar solo admin/director
create policy "radio_pagos_delete" on public.radio_pagos
  for delete to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.auth_id = auth.uid()
      and u.rol in ('admin','director')
      and u.activo = true
    )
  );

-- radio_pago_spots: mismas reglas
create policy "radio_pago_spots_select" on public.radio_pago_spots
  for select to authenticated using (true);

create policy "radio_pago_spots_insert" on public.radio_pago_spots
  for insert to authenticated
  with check (
    exists (
      select 1 from public.usuarios u
      where u.auth_id = auth.uid()
      and u.rol in ('admin','director','supervisor')
      and u.activo = true
    )
  );

create policy "radio_pago_spots_delete" on public.radio_pago_spots
  for delete to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.auth_id = auth.uid()
      and u.rol in ('admin','director')
      and u.activo = true
    )
  );

-- ============================================================
-- VERIFICACION
-- ============================================================
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name like 'radio%';
