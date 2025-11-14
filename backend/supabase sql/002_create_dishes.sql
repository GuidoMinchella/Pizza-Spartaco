-- Script SQL: creazione tabella public.dishes per i piatti del menù
-- Esegui questo script nel Supabase SQL Editor del tuo progetto

-- UUID e funzioni crittografiche (come in 001_create_users.sql)
create extension if not exists "pgcrypto";

-- Tabella piatti
create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  category text not null,
  price_pinsa numeric(10,2),
  price_tonda numeric(10,2),
  price_pala numeric(10,2),
  image text,
  allergens jsonb default '[]'::jsonb
);

-- Vincoli di prezzo non negativo (permessi NULL)
alter table public.dishes
  drop constraint if exists price_pinsa_nonnegative,
  drop constraint if exists price_tonda_nonnegative,
  drop constraint if exists price_pala_nonnegative;

alter table public.dishes
  add constraint price_pinsa_nonnegative check (price_pinsa is null or price_pinsa >= 0),
  add constraint price_tonda_nonnegative check (price_tonda is null or price_tonda >= 0),
  add constraint price_pala_nonnegative check (price_pala is null or price_pala >= 0);

-- Abilita RLS per sicurezza (definiremo le policy in seguito)
alter table public.dishes enable row level security;

-- Indici utili per ricerche
create index if not exists dishes_category_idx on public.dishes (category);
create index if not exists dishes_name_idx on public.dishes (name);

-- Commenti utili
comment on table public.dishes is 'Piatti del menù';
comment on column public.dishes.name is 'Nome del piatto';
comment on column public.dishes.description is 'Descrizione del piatto';
comment on column public.dishes.category is 'Categoria (es. Pinsa, Tonda, Pala, Antipasti, etc.)';
comment on column public.dishes.price_pinsa is 'Prezzo Pinsa';
comment on column public.dishes.price_tonda is 'Prezzo Tonda';
comment on column public.dishes.price_pala is 'Prezzo Pala';
comment on column public.dishes.image is 'URL o path immagine';
comment on column public.dishes.allergens is 'Array JSON di codici allergeni (es. glutine, latte, uova, soia, pesce, crostacei, molluschi, arachidi, fruttaaguscio, sedano, semidisesamo, senape, solfiti, lupini)';

-- Vincolo: almeno uno tra price_pinsa/price_tonda/price_pala deve essere valorizzato
alter table public.dishes drop constraint if exists dishes_at_least_one_price_present;
alter table public.dishes
  add constraint dishes_at_least_one_price_present
  check (
    (price_pinsa is not null) or (price_tonda is not null) or (price_pala is not null)
  );

-- Vincolo di unicità su (name, category) per idempotenza dei seed
alter table public.dishes drop constraint if exists dishes_name_category_unique;
alter table public.dishes
  add constraint dishes_name_category_unique unique (name, category);

-- Policy RLS: lettura pubblica (il menù è pubblico)
-- Nota: il backend usa la service role e bypassa RLS; questa policy permette anche letture con chiave ANON
drop policy if exists dishes_read_public on public.dishes;
create policy dishes_read_public
  on public.dishes for select
  using (true);

-- (Facoltativo) Grant espliciti di SELECT ai ruoli predefiniti Supabase
grant usage on schema public to anon, authenticated;
grant select on public.dishes to anon, authenticated;

-- Seed iniziali coerenti con le categorie usate nel sito
-- NOTA: usa ON CONFLICT (name, category) DO NOTHING per evitare duplicati se rieseguito
insert into public.dishes (name, description, category, price_pinsa, price_tonda, price_pala, image, allergens)
values
  ('Margherita Spartaco', 'Pomodoro San Marzano DOP, mozzarella di bufala campana, basilico fresco', 'classiche', 3.50, 12.00, 22.00, '/menu1.jpg', '["glutine","latte"]'),
  ('Diavola Infernale', 'Pomodoro, mozzarella fior di latte, salame piccante calabrese, peperoncino fresco', 'classiche', 4.00, 14.00, 26.00, '/menu1.jpg', '["glutine","latte"]'),
  ('Quattro Formaggi', 'Mozzarella, gorgonzola dolce, parmigiano reggiano 24 mesi, taleggio DOP', 'classiche', 4.50, 15.00, 28.00, '/menu1.jpg', '["glutine","latte"]'),
  ('Mortadella e Pistacchio', 'Crema di pistacchio di Bronte, mortadella di Bologna IGP, stracciatella pugliese', 'gourmet', 5.00, 17.00, 32.00, '/menu1.jpg', '["glutine","latte","fruttaaguscio"]'),
  ('Patate e Rosmarino', 'Base bianca, patate rosse a fette sottili, rosmarino fresco, olio EVO', 'bianche', 3.50, 12.00, 22.00, '/menu1.jpg', '["glutine"]'),
  ('Verdure Grigliate', 'Melanzane, zucchine, peperoni, cipolla rossa, pomodorini, rucola fresca', 'veg', 4.00, 13.50, 25.00, '/menu1.jpg', '["glutine"]'),
  ('Nutella e Nocciole', 'Impasto dolce, crema di nocciole Nutella, nocciole tostate, zucchero a velo', 'dolci', 3.50, 11.00, 20.00, '/menu1.jpg', '["glutine","fruttaaguscio","latte","uova"]'),
  ('Coca-Cola', 'Bottiglia da 33cl', 'bevande', 2.50, null, null, '/menu1.jpg', '[]'),
  ('Acqua Naturale', 'Bottiglia da 50cl', 'bevande', 1.50, null, null, '/menu1.jpg', '[]')
on conflict (name, category) do nothing;

-- Forza reload schema PostgREST (Supabase)
notify pgrst, 'reload schema';