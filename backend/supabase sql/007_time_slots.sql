-- Creazione tabella time_slots e seed degli orari standard
-- Esegui questo script nel Supabase SQL Editor del tuo progetto.

create table if not exists public.time_slots (
  slot text primary key,
  enabled boolean not null default true
);

-- (Opzionale) Abilita RLS e consenti SELECT pubblica sugli orari abilitati
alter table public.time_slots enable row level security;
drop policy if exists time_slots_read_public on public.time_slots;
create policy time_slots_read_public
  on public.time_slots for select
  using (enabled = true);

-- Seed orari standard ogni 20 minuti dalle 19:00 alle 22:00
insert into public.time_slots(slot) values
  ('19:00'),
  ('19:20'),
  ('19:40'),
  ('20:00'),
  ('20:20'),
  ('20:40'),
  ('21:00'),
  ('21:20'),
  ('21:40'),
  ('22:00')
on conflict (slot) do nothing;

-- Vincoli di unicità sugli slot per data (ordine per giorno + orario)
-- Aggiungiamo una colonna order_date per semplificare i controlli di disponibilità
alter table public.orders
  add column if not exists order_date date not null default current_date;

-- Backfill: imposta order_date = date(created_at) per le righe esistenti
update public.orders
  set order_date = created_at::date
  where created_at is not null;

-- Deduplica eventuali duplicati esistenti prima di creare gli indici unici
-- Manteniamo la prima occorrenza (più vecchia) e azzeriamo le successive
with delivery_dups as (
  select id
  from (
    select id,
           row_number() over (
             partition by order_date, delivery_time
             order by created_at asc nulls last, id asc
           ) as rn
    from public.orders
    where mode = 'delivery' and delivery_time is not null
  ) t
  where rn > 1
)
update public.orders
  set delivery_time = null
  where id in (select id from delivery_dups);

with pickup_dups as (
  select id
  from (
    select id,
           row_number() over (
             partition by order_date, pickup_time
             order by created_at asc nulls last, id asc
           ) as rn
    from public.orders
    where mode = 'pickup' and pickup_time is not null
  ) t
  where rn > 1
)
update public.orders
  set pickup_time = null
  where id in (select id from pickup_dups);

-- Deduplica globale: stessa coppia (order_date, slot) tra consegna e asporto
with global_dups as (
  select id
  from (
    select id,
           coalesce(delivery_time, pickup_time) as slot_time,
           row_number() over (
             partition by order_date, coalesce(delivery_time, pickup_time)
             order by created_at asc nulls last, id asc
           ) as rn
    from public.orders
    where coalesce(delivery_time, pickup_time) is not null
  ) t
  where rn > 1
)
update public.orders
  set delivery_time = null
  where id in (select id from global_dups) and delivery_time is not null;

-- Ripeti il CTE per il secondo UPDATE: i CTE sono limitati allo statement
with global_dups as (
  select id
  from (
    select id,
           coalesce(delivery_time, pickup_time) as slot_time,
           row_number() over (
             partition by order_date, coalesce(delivery_time, pickup_time)
             order by created_at asc nulls last, id asc
           ) as rn
    from public.orders
    where coalesce(delivery_time, pickup_time) is not null
  ) t
  where rn > 1
)
update public.orders
  set pickup_time = null
  where id in (select id from global_dups) and pickup_time is not null;

-- Unicità: una consegna per (order_date, delivery_time)
create unique index if not exists orders_unique_delivery_slot_date_idx
  on public.orders(order_date, delivery_time)
  where mode = 'delivery' and delivery_time is not null;

-- Unicità: un ritiro per (order_date, pickup_time)
create unique index if not exists orders_unique_pickup_slot_date_idx
  on public.orders(order_date, pickup_time)
  where mode = 'pickup' and pickup_time is not null;

-- Unicità GLOBALE: uno slot per giorno indipendentemente dalla modalità
create unique index if not exists orders_unique_global_slot_date_idx
  on public.orders(order_date, coalesce(delivery_time, pickup_time))
  where coalesce(delivery_time, pickup_time) is not null;

-- Forza reload schema PostgREST (Supabase)
notify pgrst, 'reload schema';