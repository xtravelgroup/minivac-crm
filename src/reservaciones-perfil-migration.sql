alter table public.reservaciones
  add column if not exists ingresos_anuales   text,
  add column if not exists profesion_titular  text,
  add column if not exists profesion_coprop   text;
