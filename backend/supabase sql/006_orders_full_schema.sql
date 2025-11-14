-- Schema completo per la gestione ordini (orders) e articoli d'ordine (order_items)
-- Idempotente: usa CREATE IF NOT EXISTS e ALTER ADD COLUMN IF NOT EXISTS.
-- Scopo: consolidare la creazione della tabella orders con tutte le colonne necessarie,
--        inclusi sconto (discount) e totale pagato (total_paid), e la tabella order_items.

-- Estensione per gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabella ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dati utente (facoltativi)
  user_id UUID NULL,
  user_first_name TEXT NULL,
  user_last_name TEXT NULL,
  user_email TEXT NULL,

  -- Dati contatto e logistica
  phone TEXT NOT NULL,
  mode TEXT NOT NULL, -- 'delivery' | 'pickup'
  address TEXT NULL,
  cap TEXT NULL,
  staircase TEXT NULL,
  floor TEXT NULL,
  buzzer TEXT NULL,
  delivery_time TEXT NULL,
  pickup_name TEXT NULL,
  pickup_time TEXT NULL,
  notes_rider TEXT NULL,

  -- Pagamenti
  payment_method TEXT NULL, -- 'cash' | 'online' (o altro)

  -- Riepilogo economico
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Stato stampa ordini (integrazione terminale di stampa)
  printed_at TIMESTAMPTZ NULL,
  printed_by TEXT NULL,
  print_attempts INT NOT NULL DEFAULT 0
);

-- Vincoli e FK (aggiunti in modo idempotente)
-- Legame con users: se presente, imposta a NULL alla cancellazione dell'utente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Check sul mode (solo valori ammessi) - opzionale ma consigliato
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_mode_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_mode_check
      CHECK (mode IN ('delivery', 'pickup'));
  END IF;
END $$;

-- Check sul totale pagato: deve essere sempre total - discount
-- Nota: questo vincolo assicura consistenza dei dati, il backend deve rispettarlo in INSERT/UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_paid_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_total_paid_check
      CHECK ((total_paid) = (total - discount));
  END IF;
END $$;

-- Aggiunta colonne mancanti (in caso la tabella esistesse già ma fosse incompleta)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_first_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS user_last_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS user_email TEXT NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT NULL,
  ADD COLUMN IF NOT EXISTS mode TEXT NULL,
  ADD COLUMN IF NOT EXISTS address TEXT NULL,
  ADD COLUMN IF NOT EXISTS cap TEXT NULL,
  ADD COLUMN IF NOT EXISTS staircase TEXT NULL,
  ADD COLUMN IF NOT EXISTS floor TEXT NULL,
  ADD COLUMN IF NOT EXISTS buzzer TEXT NULL,
  ADD COLUMN IF NOT EXISTS delivery_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS pickup_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS pickup_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS notes_rider TEXT NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NULL,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Stato stampa ordini (integrazione terminale di stampa)
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS printed_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS print_attempts INT NOT NULL DEFAULT 0;

-- Indici utili
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_mode_idx ON public.orders(mode);
CREATE INDEX IF NOT EXISTS orders_payment_method_idx ON public.orders(payment_method);

-- Allinea dati esistenti: imposta total_paid = total dove è NULL (se presente) e default discount=0
UPDATE public.orders SET total_paid = total WHERE total_paid IS NULL;
UPDATE public.orders SET discount = 0 WHERE discount IS NULL;

-- Tabella ORDER_ITEMS (articoli dell'ordine)
CREATE TABLE IF NOT EXISTS public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID NULL,
  product_name TEXT NOT NULL,
  size TEXT NOT NULL, -- 'slice' | 'half' | 'full' o varianti
  quantity INT NOT NULL CHECK (quantity > 0),
  extras JSONB NOT NULL DEFAULT '[]'::jsonb, -- array JSON di extra (name, price)
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);

-- Allinea tipi colonne esistenti su order_items per evitare incompatibilità con FK
DO $$
DECLARE
  v_product_type TEXT;
BEGIN
  -- Se la colonna esiste ed è di tipo diverso da UUID, converti a UUID in modo sicuro
  SELECT c.data_type INTO v_product_type
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name = 'order_items'
     AND c.column_name = 'product_id';

  IF v_product_type IS NOT NULL AND v_product_type <> 'uuid' THEN
    -- Converte solo i valori compatibili con formato UUID, altrimenti li imposta NULL
    ALTER TABLE public.order_items
      ALTER COLUMN product_id TYPE uuid
      USING (
        CASE
          WHEN product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN product_id::uuid
          ELSE NULL
        END
      );
  END IF;
END $$;

-- FK verso orders (ON DELETE CASCADE per pulizia automatica)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- FK opzionale verso dishes (se la tabella esiste): in caso di cancellazione piatto, lascia NULL
DO $$
DECLARE
  v_prod_type TEXT;
  v_dish_type TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dishes'
  ) THEN
    -- Verifica i tipi delle colonne prima di aggiungere il vincolo
    SELECT c.data_type INTO v_prod_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = 'order_items'
       AND c.column_name = 'product_id';

    SELECT c.data_type INTO v_dish_type
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = 'dishes'
       AND c.column_name = 'id';

    IF v_prod_type = 'uuid' AND v_dish_type = 'uuid' THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_id_fkey'
      ) THEN
        -- Pulisci riferimenti non validi prima di aggiungere il vincolo
        UPDATE public.order_items oi
           SET product_id = NULL
         WHERE oi.product_id IS NOT NULL
           AND NOT EXISTS (
                 SELECT 1 FROM public.dishes d
                  WHERE d.id = oi.product_id
           );

        -- Aggiungi il vincolo in modalità NOT VALID per evitare errore sui dati esistenti
        ALTER TABLE public.order_items
          ADD CONSTRAINT order_items_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES public.dishes (id)
          ON DELETE SET NULL
          NOT VALID;

        -- Prova a validare subito; se fallisce, lascia il vincolo NOT VALID e segnala
        BEGIN
          ALTER TABLE public.order_items
            VALIDATE CONSTRAINT order_items_product_id_fkey;
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Convalida FK order_items_product_id_fkey non riuscita: alcune righe hanno product_id non presente in dishes (ora lasciato NOT VALID).';
        END;
      END IF;
    ELSE
      -- Evita errore: segnala che il vincolo non viene aggiunto per incompatibilità tipi
      RAISE NOTICE 'FK order_items.product_id -> dishes.id non aggiunta per incompatibilità tipi (% vs %)', v_prod_type, v_dish_type;
    END IF;
  END IF;
END $$;

-- Indice su order_id
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

-- Fine schema consolidato