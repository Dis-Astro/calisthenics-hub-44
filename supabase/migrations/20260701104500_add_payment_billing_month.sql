-- Track the month covered by each subscription payment.
-- payment_date remains the cash-in date; billing_month is the month being paid.

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS billing_month DATE;

UPDATE public.payments
SET billing_month = date_trunc('month', payment_date)::date
WHERE billing_month IS NULL;

ALTER TABLE public.payments
ALTER COLUMN billing_month SET DEFAULT date_trunc('month', CURRENT_DATE)::date;

ALTER TABLE public.payments
ALTER COLUMN billing_month SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_billing_month_is_month_start'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
    ADD CONSTRAINT payments_billing_month_is_month_start
    CHECK (billing_month = date_trunc('month', billing_month)::date);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_payment_billing_month()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.billing_month IS NULL THEN
    NEW.billing_month := date_trunc('month', COALESCE(NEW.payment_date, CURRENT_DATE))::date;
  ELSE
    NEW.billing_month := date_trunc('month', NEW.billing_month)::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_payment_billing_month_trigger ON public.payments;
CREATE TRIGGER normalize_payment_billing_month_trigger
BEFORE INSERT OR UPDATE OF billing_month, payment_date
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.normalize_payment_billing_month();

CREATE INDEX IF NOT EXISTS idx_payments_billing_month
ON public.payments (billing_month);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_billing_month
ON public.payments (subscription_id, billing_month);

COMMENT ON COLUMN public.payments.billing_month IS
'First day of the month covered by the payment. payment_date is the cash-in date.';

CREATE OR REPLACE FUNCTION public.register_subscription_payment(
  p_subscription_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_billing_month DATE,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS TABLE(payment_id UUID, new_end_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_plan public.membership_plans%ROWTYPE;
  v_billing_month DATE;
  v_due_month DATE;
  v_payment_id UUID;
  v_new_end_date DATE;
  v_paid_for_month NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_billing(auth.uid()) THEN
    RAISE EXCEPTION 'Non autorizzato a registrare pagamenti';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Importo non valido';
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Abbonamento non trovato';
  END IF;

  IF v_subscription.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Cliente non coerente con l''abbonamento selezionato';
  END IF;

  SELECT *
  INTO v_plan
  FROM public.membership_plans
  WHERE id = v_subscription.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Piano abbonamento non trovato';
  END IF;

  v_billing_month := date_trunc('month', COALESCE(p_billing_month, CURRENT_DATE))::date;
  v_due_month := date_trunc('month', v_subscription.end_date)::date;

  IF v_billing_month > v_due_month AND NOT EXISTS (
    SELECT 1
    FROM public.payments
    WHERE subscription_id = v_subscription.id
      AND billing_month = v_due_month
      AND status = 'completato'
  ) THEN
    RAISE EXCEPTION 'Prima salda il mese arretrato %', to_char(v_due_month, 'MM/YYYY');
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid_for_month
  FROM public.payments
  WHERE subscription_id = v_subscription.id
    AND billing_month = v_billing_month
    AND status = 'completato';

  IF v_paid_for_month >= v_plan.price THEN
    RAISE EXCEPTION 'Questo mese risulta gia'' pagato';
  END IF;

  INSERT INTO public.payments (
    subscription_id,
    user_id,
    amount,
    method,
    payment_date,
    billing_month,
    status,
    notes,
    recorded_by
  )
  VALUES (
    v_subscription.id,
    v_subscription.user_id,
    p_amount,
    COALESCE(NULLIF(p_method, ''), 'contanti'),
    CURRENT_DATE,
    v_billing_month,
    'completato',
    p_notes,
    p_recorded_by
  )
  RETURNING id INTO v_payment_id;

  v_new_end_date := v_subscription.end_date;

  IF v_billing_month >= v_due_month AND (v_paid_for_month + p_amount) >= v_plan.price THEN
    v_new_end_date := (v_subscription.end_date + make_interval(months => v_plan.duration_months))::date;

    UPDATE public.subscriptions
    SET end_date = v_new_end_date,
        status = 'attivo',
        updated_at = now()
    WHERE id = v_subscription.id;
  END IF;

  RETURN QUERY SELECT v_payment_id, v_new_end_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_subscription_payment(
  UUID,
  UUID,
  NUMERIC,
  TEXT,
  DATE,
  TEXT,
  UUID
) TO authenticated;
