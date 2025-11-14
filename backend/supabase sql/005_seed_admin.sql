-- SEED opzionale: crea/aggiorna l'utente admin (sostituisci email e password!)
-- ATTENZIONE: modifica i valori tra apici prima di eseguire questo script.
-- Esecuzione: incolla nel Supabase SQL Editor e lancia.

create extension if not exists "pgcrypto";

-- Sostituisci con i tuoi dati
do $$
declare
  v_email text := lower(trim('admin@example.com')); -- <--- CAMBIA
  v_first text := 'Admin';                           -- <--- opzionale
  v_last  text := 'User';                            -- <--- opzionale
  v_pass  text := 'ChangeMeSubito!';                 -- <--- CAMBIA: password forte
begin
  insert into public.users (first_name, last_name, email, password_hash, is_admin)
  values (v_first, v_last, v_email, crypt(v_pass, gen_salt('bf')), true)
  on conflict (email)
  do update set first_name = excluded.first_name,
                last_name = excluded.last_name,
                password_hash = excluded.password_hash,
                is_admin = true;
end $$;

-- Verifica (case-insensitive)
select email, is_admin, created_at from public.users where lower(email) = lower('admin@example.com'); -- <--- aggiorna email qui