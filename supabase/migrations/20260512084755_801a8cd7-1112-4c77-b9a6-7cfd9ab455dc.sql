-- Tighten profiles SELECT: remove broad is_staff clause so coaches only see their assigned clients
DROP POLICY IF EXISTS "Profiles: chiunque autenticato può vedere" ON public.profiles;
CREATE POLICY "Profiles: visibilità ristretta"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR coach_manages_client(auth.uid(), user_id)
);

-- Remove redundant anonymous-block policies (RLS already denies by default)
DROP POLICY IF EXISTS "Subscriptions: nega accesso anonimo" ON public.subscriptions;
DROP POLICY IF EXISTS "Appointments: nega accesso anonimo" ON public.appointments;
DROP POLICY IF EXISTS "Expenses: nega accesso anonimo" ON public.expenses;