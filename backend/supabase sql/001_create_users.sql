-- Script SQL: creazione tabella public.users per gestione utenti lato server
-- Esegui questo script nel Supabase SQL Editor del tuo progetto

-- UUID e funzioni crittografiche
create extension if not exists "pgcrypto";

-- Tabella utenti
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  password_hash text not null,
  -- Flag ruolo amministratore (gestito dal backend o manualmente in console)
  is_admin boolean not null default false
);

-- Abilita RLS per sicurezza (il backend usa la service role e bypassa RLS)
alter table public.users enable row level security;

-- Garantisce la presenza della colonna is_admin anche se la tabella esisteva già senza
alter table public.users add column if not exists is_admin boolean;
update public.users set is_admin = false where is_admin is null;
alter table public.users alter column is_admin set default false;
alter table public.users alter column is_admin set not null;

-- Commenti utili
comment on table public.users is 'Utenti applicazione gestiti dal backend (password hash bcrypt)';
comment on column public.users.first_name is 'Nome';
comment on column public.users.last_name is 'Cognome';
comment on column public.users.email is $$Email unica dell'utente$$;
comment on column public.users.password_hash is 'Hash della password (bcrypt)';
comment on column public.users.is_admin is 'Utente amministratore applicazione (true/false)';

-- Nota: l\'indice unico su email viene creato automaticamente dal vincolo UNIQUE

-- Helper opzionale per promuovere un utente a admin SENZA hardcodare credenziali nel codice.
-- Esegui manualmente dalla console del DB:
--   select public.promote_admin('indirizzo_email_amministratore@example.com');
-- NB: la funzione non è esposta al pubblico, nessun grant a ruoli anon/autenticated.
drop function if exists public.promote_admin(text);
create or replace function public.promote_admin(p_email text)
returns void
language plpgsql
security definer
as $$
begin
  update public.users
     set is_admin = true
   where lower(email) = lower(trim(p_email));
end;
$$;

-- Proteggi l'esecuzione: niente grant a public/anon/authenticated
revoke all on function public.promote_admin(text) from public;

-- Forza reload schema PostgREST (Supabase)
notify pgrst, 'reload schema';