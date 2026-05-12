
-- ============================================
-- SECURITY HARDENING MIGRATION
-- ============================================

-- 1) PUBLIC BUCKET LISTING: rimuovi policy che permette LIST sui files
-- I file rimangono accessibili via URL pubblico (bucket public=true)
DROP POLICY IF EXISTS "Videos pubblici per lettura" ON storage.objects;

-- 2) SECURITY DEFINER FUNCTIONS: revoca EXECUTE da public/anon
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coach(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.coach_manages_client(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_client_data(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_manages_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_client_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- 3) PRIVILEGE ESCALATION: impedisci modifica del ruolo da parte non-admin
DROP POLICY IF EXISTS "Profiles: admin o proprietario può aggiornare" ON public.profiles;
CREATE POLICY "Profiles: admin o proprietario può aggiornare"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()))
WITH CHECK (
  public.is_admin(auth.uid())
  OR (auth.uid() = user_id AND role = public.get_user_role(auth.uid()))
);

-- 4) workout_completions: porta i policy da {public} a {authenticated}
DROP POLICY IF EXISTS "Completions: staff può aggiornare" ON public.workout_completions;
DROP POLICY IF EXISTS "Completions: staff può eliminare" ON public.workout_completions;

CREATE POLICY "Completions: staff può aggiornare"
ON public.workout_completions
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Completions: staff può eliminare"
ON public.workout_completions
FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

-- 5) STORAGE: permetti al proprietario di eliminare i propri documenti
CREATE POLICY "Client documents: owner può eliminare propri files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 6) client_documents INSERT: blocca spoofing user_id
DROP POLICY IF EXISTS "Documents: staff può inserire" ON public.client_documents;
CREATE POLICY "Documents: staff o proprietario può inserire"
ON public.client_documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_staff(auth.uid())
  OR (auth.uid() = user_id AND uploaded_by = auth.uid())
);

-- 7) client_documents UPDATE: policy esplicita (staff o proprietario)
CREATE POLICY "Documents: staff o proprietario può aggiornare"
ON public.client_documents
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()) OR auth.uid() = user_id)
WITH CHECK (public.is_staff(auth.uid()) OR auth.uid() = user_id);

-- 8) workout_plans INSERT: richiedi assegnazione coach o admin
DROP POLICY IF EXISTS "Workouts: coach/admin può creare" ON public.workout_plans;
CREATE POLICY "Workouts: coach assegnato o admin può creare"
ON public.workout_plans
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR (
    public.is_staff(auth.uid())
    AND auth.uid() = coach_id
    AND public.coach_manages_client(auth.uid(), client_id)
  )
);

-- 9) error_reports UPDATE: aggiungi WITH CHECK per impedire al cliente
-- di modificare client_id/coach_id
DROP POLICY IF EXISTS "Errors: coach/admin può aggiornare" ON public.error_reports;
CREATE POLICY "Errors: coach/admin/cliente può aggiornare"
ON public.error_reports
FOR UPDATE
TO authenticated
USING ((auth.uid() = coach_id) OR public.is_admin(auth.uid()) OR (auth.uid() = client_id))
WITH CHECK (
  public.is_admin(auth.uid())
  OR auth.uid() = coach_id
  OR (
    auth.uid() = client_id
    AND client_id = (SELECT er.client_id FROM public.error_reports er WHERE er.id = error_reports.id)
    AND coach_id = (SELECT er.coach_id FROM public.error_reports er WHERE er.id = error_reports.id)
  )
);
