-- Migrazione: aggiunge colonne per lo stato di stampa ordini
-- printed_at: data/ora di stampa
-- printed_by: identificativo stampante/operatore
-- print_attempts: numero tentativi di stampa

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS printed_at timestamptz,
  ADD COLUMN IF NOT EXISTS printed_by text,
  ADD COLUMN IF NOT EXISTS print_attempts int NOT NULL DEFAULT 0;