-- Helper function for segretaria role
CREATE OR REPLACE FUNCTION public.is_segretaria(user_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = user_uuid AND role = 'segretaria'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_billing(user_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = user_uuid AND role IN ('admin', 'segretaria')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_segretaria(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_billing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_segretaria(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_billing(uuid) TO authenticated;

-- PROFILES: segretaria vede tutti i profili (per gestire abbonamenti)
DROP POLICY IF EXISTS "Profiles: visibilità ristretta" ON public.profiles;
CREATE POLICY "Profiles: visibilità ristretta"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR is_segretaria(auth.uid())
  OR coach_manages_client(auth.uid(), user_id)
);

-- SUBSCRIPTIONS: segretaria può gestire (insert/update/delete)
DROP POLICY IF EXISTS "Subscriptions: admin può gestire tutti" ON public.subscriptions;
CREATE POLICY "Subscriptions: billing può gestire"
ON public.subscriptions FOR ALL TO authenticated
USING (can_manage_billing(auth.uid()))
WITH CHECK (can_manage_billing(auth.uid()));

DROP POLICY IF EXISTS "Subscriptions: solo utenti autenticati possono vedere" ON public.subscriptions;
CREATE POLICY "Subscriptions: visualizza propri o gestiti"
ON public.subscriptions FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR can_manage_billing(auth.uid())
  OR coach_manages_client(auth.uid(), user_id)
);

-- PAYMENTS: segretaria può gestire
DROP POLICY IF EXISTS "Payments: admin può gestire" ON public.payments;
CREATE POLICY "Payments: billing può gestire"
ON public.payments FOR ALL TO authenticated
USING (can_manage_billing(auth.uid()))
WITH CHECK (can_manage_billing(auth.uid()));

DROP POLICY IF EXISTS "Payments: visualizza propri o gestiti" ON public.payments;
CREATE POLICY "Payments: visualizza propri o gestiti"
ON public.payments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR can_manage_billing(auth.uid()));

-- MEMBERSHIP_PLANS: la segretaria li vede ma NON li gestisce (resta admin-only ALL)
-- Già coperto da "Plans: tutti possono vedere piani attivi" (SELECT) e ALL solo admin.

-- LESSON_PACKAGES: la segretaria può vedere e gestire (servono per pacchetti pagati)
DROP POLICY IF EXISTS "Packages: admin può gestire" ON public.lesson_packages;
CREATE POLICY "Packages: billing può gestire"
ON public.lesson_packages FOR ALL TO authenticated
USING (can_manage_billing(auth.uid()))
WITH CHECK (can_manage_billing(auth.uid()));

DROP POLICY IF EXISTS "Packages: staff e proprietario possono vedere" ON public.lesson_packages;
CREATE POLICY "Packages: staff/billing e proprietario possono vedere"
ON public.lesson_packages FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_staff(auth.uid()) OR can_manage_billing(auth.uid()));