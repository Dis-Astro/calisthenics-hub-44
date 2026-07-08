-- Archive old subscriptions without destroying linked payment history.

ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'archiviato';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'chiuso';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'terminato';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS archived_at DATE,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Payments are historical records. Deleting a subscription must not cascade-delete them.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_subscription_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES public.subscriptions(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_end_date
ON public.subscriptions(status, end_date);
