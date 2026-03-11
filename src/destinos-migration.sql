-- ============================================================
-- TABLA DESTINOS MAESTRO
-- Guarda toda la configuracion del modulo de destinos
-- ============================================================

drop table if exists public.destinos_catalog cascade;

create table public.destinos_catalog (
  id          text primary key,          -- 'D01', 'D02', etc.
  nombre      text not null,
  estado      text,
  icon        text default '🏖️',
  region      text not null default 'internacional' check (region in ('nacional','internacional')),
  categoria   text,
  descripcion text,
  activo      boolean not null default true,
  -- Toda la config QC / NQ / gifts / hotels como JSONB
  qc          jsonb not null default '{}',
  nq          jsonb not null default '{"enabled":false,"nights":3,"label":"","hotels":[]}',
  included_gifts jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table public.destinos_catalog enable row level security;
create policy "destinos_select" on public.destinos_catalog for select to authenticated using (true);
create policy "destinos_all"    on public.destinos_catalog for all    to authenticated using (true);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists destinos_catalog_updated_at on public.destinos_catalog;
create trigger destinos_catalog_updated_at
  before update on public.destinos_catalog
  for each row execute function public.set_updated_at();

-- ============================================================
-- SEED — datos iniciales (mismos que el modulo tiene hoy)
-- ============================================================
insert into public.destinos_catalog (id, nombre, estado, icon, region, categoria, descripcion, activo, qc, nq, included_gifts)
values
(
  'D01','Cancun','Quintana Roo','🏖️','internacional','Premium',
  'La Zona Hotelera mas famosa de Mexico con playas de arena blanca y mar turquesa.',
  true,
  '{"nights":5,"ageMin":25,"ageMax":65,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"hotels":[{"id":"H001","name":"Grand Oasis Palm","plan":"Todo Incluido","capacity":["Parejas","Familias"],"ageMin":25,"ageMax":60,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"active":true,"amenities":["Piscina","Playa privada","Spa","Shows nocturnos","Bar swim-up"],"hotelGifts":[]},{"id":"H002","name":"Hyatt Zilara Cancun","plan":"Todo Incluido Premium","capacity":["Parejas","Solo adultos"],"ageMin":18,"ageMax":99,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"active":true,"amenities":["Playa privada","Spa","Butler service","Restaurantes multiples","Bar swim-up"],"hotelGifts":["Cena romantica de bienvenida"]},{"id":"H003","name":"Moon Palace Golf & Spa","plan":"Todo Incluido","capacity":["Familias","Grupos"],"ageMin":25,"ageMax":65,"marital":["Casado","Union libre"],"active":true,"amenities":["Golf","Piscina","Spa","Kids club","Casino"],"hotelGifts":["Credito de golf $50"]}],"gifts":{"enabled":true,"maxChoices":1,"items":[{"id":"G001","icon":"🗺️","name":"Tour a Chichen Itza","description":"Excursion de dia completo con guia","active":true},{"id":"G002","icon":"🤿","name":"Tour snorkel Isla Mujeres","description":"Recorrido en catamaran con snorkel","active":true},{"id":"G004","icon":"💳","name":"Gift Card $75 USD","description":"Canjeable en el resort","active":true}]}}',
  '{"enabled":true,"nights":4,"label":"Cancun Esencial","hotels":[{"id":"N001","name":"Crown Paradise Club","plan":"Todo Incluido","capacity":["Parejas","Familias","Grupos"],"active":true,"amenities":["Piscina","Playa privada"],"hotelGifts":[]},{"id":"N002","name":"Krystal Cancun","plan":"Todo Incluido","capacity":["Parejas","Familias"],"active":true,"amenities":["Piscina","Spa"],"hotelGifts":[]}]}',
  '["IG01","IG04","IG05"]'
),
(
  'D02','Los Cabos','Baja California Sur','🌵','internacional','Ultra Premium',
  'El Arco iconico, desierto y mar. Destino de lujo en el extremo de Baja California.',
  true,
  '{"nights":4,"ageMin":36,"ageMax":99,"marital":["Casado","Union libre"],"hotels":[{"id":"H005","name":"Marquis Los Cabos","plan":"Todo Incluido Premium","capacity":["Parejas"],"ageMin":36,"ageMax":99,"marital":["Casado","Union libre"],"active":true,"amenities":["Playa privada","Spa","Butler service","Golf","Restaurantes multiples"],"hotelGifts":["Botella de champagne al llegar","Masaje de bienvenida 30 min"]},{"id":"H006","name":"One&Only Palmilla","plan":"Solo Habitacion","capacity":["Parejas","Grupos"],"ageMin":30,"ageMax":99,"marital":["Casado","Union libre"],"active":true,"amenities":["Playa privada","Golf","Spa","Butler service"],"hotelGifts":[]}],"gifts":{"enabled":true,"maxChoices":1,"items":[{"id":"G006","icon":"🍽️","name":"Cena romantica en la playa","description":"Cena privada para dos frente al mar","active":true},{"id":"G007","icon":"⛵","name":"Tour en lancha al Arco","description":"Tour en lancha al Arco de Cabo","active":true},{"id":"G008","icon":"💳","name":"Gift Card $75 USD","description":"Canjeable en el resort","active":true}]}}',
  '{"enabled":false,"nights":3,"label":"","hotels":[]}',
  '["IG01","IG05"]'
),
(
  'D03','Riviera Maya','Quintana Roo','🌴','internacional','Familiar',
  'Cenotes, ruinas mayas y playas paradisiacas.',
  true,
  '{"nights":6,"ageMin":25,"ageMax":60,"marital":["Casado","Union libre"],"hotels":[{"id":"H007","name":"Iberostar Paraiso","plan":"Todo Incluido","capacity":["Familias","Grupos"],"ageMin":25,"ageMax":55,"marital":["Casado","Union libre"],"active":true,"amenities":["Piscina","Playa privada","Kids club","Shows nocturnos","Restaurantes multiples"],"hotelGifts":[]},{"id":"H008","name":"Grand Velas Riviera Maya","plan":"Todo Incluido Premium","capacity":["Parejas","Familias"],"ageMin":28,"ageMax":60,"marital":["Casado","Union libre"],"active":true,"amenities":["Butler service","Spa","Playa privada","Restaurantes multiples"],"hotelGifts":["Acceso ilimitado al Spa"]}],"gifts":{"enabled":true,"maxChoices":1,"items":[{"id":"G009","icon":"🏛️","name":"Tour Tulum + Cenote","description":"Ruinas de Tulum y cenote natural","active":true},{"id":"G010","icon":"🤿","name":"Snorkel en arrecife","description":"Tour de snorkel en el arrecife","active":true},{"id":"G011","icon":"💳","name":"Gift Card $75 USD","description":"Canjeable en el resort","active":true}]}}',
  '{"enabled":true,"nights":4,"label":"Riviera Maya Basico","hotels":[{"id":"N003","name":"Bahia Principe Akumal","plan":"Todo Incluido","capacity":["Familias","Parejas","Grupos"],"active":true,"amenities":["Piscina","Playa privada","Kids club"],"hotelGifts":[]},{"id":"N004","name":"Grand Bahia Principe","plan":"Todo Incluido","capacity":["Familias","Grupos"],"active":true,"amenities":["Piscina","Shows nocturnos"],"hotelGifts":[]}]}',
  '["IG01","IG05","IG07"]'
),
(
  'D04','Las Vegas','Nevada','🎰','nacional','Premium',
  'La capital del entretenimiento. Shows, casinos, gastronomia de clase mundial.',
  true,
  '{"nights":3,"ageMin":21,"ageMax":99,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"hotels":[{"id":"H020","name":"MGM Grand","plan":"Solo Habitacion","capacity":["Parejas","Grupos","Solo adultos"],"ageMin":21,"ageMax":99,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"active":true,"amenities":["Casino","Piscina","Spa","Shows nocturnos","Restaurantes multiples"],"hotelGifts":["Credito de casino $50 USD"]},{"id":"H021","name":"Bellagio","plan":"Solo Habitacion","capacity":["Parejas","Solo adultos"],"ageMin":21,"ageMax":99,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"active":true,"amenities":["Casino","Spa","Restaurantes multiples","Shows nocturnos"],"hotelGifts":["Credito de casino $75 USD"]}],"gifts":{"enabled":true,"maxChoices":1,"items":[{"id":"G020","icon":"🎰","name":"$50 credito casino","description":"Credito de $50 USD en el casino del hotel","active":true},{"id":"G021","icon":"🎭","name":"Show ticket 2 personas","description":"Entradas a show seleccionado en el Strip","active":true},{"id":"G022","icon":"💳","name":"Gift Card $100 USD","description":"Canjeable en el resort o The Strip","active":true}]}}',
  '{"enabled":false,"nights":3,"label":"","hotels":[]}',
  '["IG01","IG09"]'
),
(
  'D05','Orlando','Florida','🎡','nacional','Familiar',
  'El reino de la magia. Disney, Universal, parques acuaticos y mas.',
  true,
  '{"nights":4,"ageMin":25,"ageMax":99,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"hotels":[{"id":"H022","name":"Disney Grand Floridian","plan":"Solo Habitacion","capacity":["Familias","Parejas"],"ageMin":18,"ageMax":99,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"active":true,"amenities":["Piscina","Acceso a parque tematico","Kids club","Restaurantes multiples"],"hotelGifts":["Acceso al parque Disney 1 dia"]},{"id":"H023","name":"Universal Cabana Bay","plan":"Desayuno incluido","capacity":["Familias","Grupos"],"ageMin":18,"ageMax":99,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"active":true,"amenities":["Piscina","Acceso a parque tematico"],"hotelGifts":[]}],"gifts":{"enabled":true,"maxChoices":1,"items":[{"id":"G023","icon":"💳","name":"Gift Card $100 USD","description":"Gift card canjeable en el destino","active":true},{"id":"G024","icon":"🌊","name":"2 entradas parque de agua","description":"Entradas a Volcano Bay o similar","active":true},{"id":"G025","icon":"🎢","name":"2 entradas Disney 1 dia","description":"Entradas a parque Disney seleccionado","active":true}]}}',
  '{"enabled":false,"nights":3,"label":"","hotels":[]}',
  '["IG01","IG06"]'
),
(
  'D06','Puerto Vallarta','Jalisco','🌺','internacional','Romance',
  'El malecon y las playas del Pacifico. Ambiente romantico.',
  true,
  '{"nights":4,"ageMin":25,"ageMax":60,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"hotels":[{"id":"H010","name":"Secrets Vallarta Bay","plan":"Todo Incluido Premium","capacity":["Parejas","Solo adultos"],"ageMin":25,"ageMax":65,"marital":["Casado","Union libre","Soltero hombre","Soltera mujer"],"active":true,"amenities":["Playa privada","Spa","Bar swim-up","Restaurantes multiples","Shows nocturnos"],"hotelGifts":["Cena en la playa para dos"]},{"id":"H011","name":"Garza Blanca Resort","plan":"Solo Habitacion","capacity":["Parejas"],"ageMin":30,"ageMax":70,"marital":["Casado","Union libre"],"active":true,"amenities":["Playa privada","Spa","Golf","Butler service"],"hotelGifts":[]}],"gifts":{"enabled":true,"maxChoices":1,"items":[{"id":"G030","icon":"⛵","name":"Tour en barco Bahia Banderas","description":"Recorrido por la bahia con snorkel","active":true},{"id":"G031","icon":"💳","name":"Gift Card $50 USD","description":"Canjeable en el resort","active":true}]}}',
  '{"enabled":true,"nights":3,"label":"Vallarta Basico","hotels":[{"id":"N006","name":"Playa Los Arcos","plan":"Todo Incluido","capacity":["Parejas","Familias","Grupos"],"active":true,"amenities":["Piscina","Playa privada"],"hotelGifts":[]}]}',
  '["IG01","IG07"]'
),
(
  'D07','Huatulco','Oaxaca','⛵','internacional','Boutique',
  '9 bahias de aguas cristalinas en la costa oaxaquena.',
  true,
  '{"nights":5,"ageMin":25,"ageMax":65,"marital":["Casado","Union libre"],"hotels":[{"id":"H012","name":"Las Brisas Huatulco","plan":"Desayuno incluido","capacity":["Parejas"],"ageMin":30,"ageMax":65,"marital":["Casado","Union libre"],"active":true,"amenities":["Playa privada","Piscina","Spa","Golf"],"hotelGifts":[]},{"id":"H013","name":"Camino Real Zaashila","plan":"Solo Habitacion","capacity":["Parejas","Familias"],"ageMin":25,"ageMax":70,"marital":["Casado","Union libre"],"active":true,"amenities":["Piscina","Playa privada","Restaurantes multiples"],"hotelGifts":[]}],"gifts":{"enabled":true,"maxChoices":1,"items":[{"id":"G013","icon":"🤿","name":"Tour en catamaran bahias","description":"Recorrido por las 9 bahias con snorkel","active":true},{"id":"G014","icon":"💳","name":"Gift Card $50 USD","description":"Canjeable en el resort","active":true}]}}',
  '{"enabled":true,"nights":3,"label":"Huatulco Express","hotels":[{"id":"N005","name":"Barcelo Huatulco","plan":"Todo Incluido","capacity":["Parejas","Familias","Grupos"],"active":true,"amenities":["Piscina","Playa privada"],"hotelGifts":[]}]}',
  '["IG01","IG06"]'
)
on conflict (id) do nothing;
