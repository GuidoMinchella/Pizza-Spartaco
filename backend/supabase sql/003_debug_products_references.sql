-- Script di debug: individua riferimenti residui alla tabella non più esistente
-- public.products e forza il reload della cache schema di PostgREST (Supabase).
--
-- NOTE:
-- - Questo script NON modifica oggetti (solo letture) e alla fine invia un NOTIFY
--   per ricaricare la cache schema.
-- - Eseguilo nel Supabase SQL Editor del tuo progetto.

-- 1) Stato tabelle principali
select 'table_presence' as section, 'public.dishes' as object, to_regclass('public.dishes') is not null as exists;
select 'table_presence' as section, 'public.products' as object, to_regclass('public.products') is not null as exists;

-- 2) Visite che referenziano "products"
select 'views' as section, schemaname, viewname, definition
from pg_catalog.pg_views
where definition ilike '%products%'
order by schemaname, viewname;

-- 3) Funzioni/Procedure che referenziano "products"
select 'functions' as section, n.nspname as schema, p.proname as name, p.prokind, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prokind in ('f','p')
  and pg_get_functiondef(p.oid) ilike '%products%'
order by n.nspname, p.proname;

-- 4) Policy RLS che referenziano "products"
select 'policies' as section, schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'products')
   or coalesce(qual, '') ilike '%products%'
   or coalesce(with_check, '') ilike '%products%'
order by schemaname, tablename, policyname;

-- 5) Trigger che nel loro definition/tgname contengono "products"
select 'triggers' as section, n.nspname as schema, c.relname as table, t.tgname as trigger, pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where pg_get_triggerdef(t.oid) ilike '%products%'
   or t.tgname ilike '%products%'
order by n.nspname, c.relname, t.tgname;

-- 6) Materialized views con riferimenti a "products"
select 'matviews' as section, schemaname, matviewname, definition
from pg_matviews
where definition ilike '%products%'
order by schemaname, matviewname;

-- 7) Indici legati a "products" o che la menzionano
select 'indexes' as section, schemaname, tablename, indexname, indexdef
from pg_indexes
where tablename = 'products' or indexdef ilike '%products%'
order by schemaname, tablename, indexname;

-- 8) Vincoli che menzionano "products" (es. FOREIGN KEY obsoleti)
select 'constraints' as section, n.nspname as schema, c.relname as table, con.conname as constraint, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where pg_get_constraintdef(con.oid) ilike '%products%'
order by n.nspname, c.relname, con.conname;

-- 9) Dipendenze dirette sull'OGGETTO regclass di public.products (safe anche se non esiste)
select 'dependencies' as section, d.classid, d.objid, d.refclassid, d.refobjid, n.nspname as ref_schema, c.relname as ref_relname
from pg_depend d
left join pg_class c on c.oid = d.refobjid
left join pg_namespace n on n.oid = c.relnamespace
where to_regclass('public.products') is not null
  and d.refobjid = to_regclass('public.products');

-- 10) (Facoltativo) Funzioni che usano array_agg e menzionano products (per diagnosticare l'errore visto)
select 'functions_using_array_agg' as section, n.nspname as schema, p.proname as name, p.prokind, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prokind in ('f','p')
  and pg_get_functiondef(p.oid) ilike '%array_agg%'
  and pg_get_functiondef(p.oid) ilike '%products%'
order by n.nspname, p.proname;

-- 11) Mostra la presenza dell'aggregato built-in array_agg (solo informativo)
select 'array_agg_builtin' as section, n.nspname as schema, p.proname as name, p.prokind
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where lower(p.proname) = 'array_agg'
order by n.nspname, p.prokind;

-- 12) Forza reload schema PostgREST (Supabase)
notify pgrst, 'reload schema';

-- Fine script di debug