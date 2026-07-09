-- Payments are historical records. Deleting a subscription must not cascade-delete them.
-- The app disables old subscriptions by setting status = 'cancellato', which already exists.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_subscription_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES public.subscriptions(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_end_date
ON public.subscriptions(status, end_date);
