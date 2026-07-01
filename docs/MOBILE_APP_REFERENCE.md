# Mobile App Reference

Questo documento fotografa le funzioni principali della webapp e i riferimenti utili per creare app mobile senza cambiare, per ora, il database Supabase.

## Stack attuale

- Frontend web: React + Vite + TypeScript
- UI: Tailwind CSS, shadcn/Radix, lucide-react
- Backend: Supabase Auth, Postgres, Storage, Edge Functions
- Deploy web: Cloudflare, build `npm run build`, output `dist`

## Ruoli e aree

- `admin`: dashboard, utenti, dettagli cliente, abbonamenti, calendario, orari palestra, corsi, esercizi, piani, segnalazioni, andamento struttura, spese, editor schede.
- `segretaria`: dashboard segreteria per clienti, abbonamenti, pagamenti e piani.
- `coach`: dashboard coach, clienti assegnati, schede, calendario, feedback/segnalazioni.
- `cliente_palestra` e `cliente_corso`: dashboard palestra.
- `cliente_coaching`: dashboard coaching, scheda, archivio, progressi, appuntamenti, segnalazioni, documenti.

Route principali: vedi `src/App.tsx`.

## Tabelle Supabase principali

- Identita e ruoli: `profiles`, `coach_assignments`
- Billing: `subscriptions`, `payments`, `membership_plans`, `lesson_packages`, `lesson_usage_log`
- Calendario: `appointments`, `courses`, `course_sessions`, `course_participants`, `gym_hours`
- Coaching: `workout_plans`, `workout_plan_exercises`, `workout_completions`, `coach_test_notes`
- Libreria esercizi: `exercises`, `exercise_videos`
- Supporto/documenti: `error_reports`, `client_documents`, `client_notes`
- Amministrazione: `expenses`

Tipi generati: `src/integrations/supabase/types.ts`.

## Edge Functions

- `create-user`: creazione utenti e bootstrap primo admin.
- `reset-user-password`: reset password da admin.
- `update-user-email`: cambio email da admin.

Chiamate frontend:

- `src/pages/admin/UserManagement.tsx`
- `src/components/admin/PasswordResetDialog.tsx`

## Cosa riusare per mobile

- Client Supabase: `src/integrations/supabase/client.ts` come riferimento, adattando storage sessione per mobile.
- Tipi database: `src/integrations/supabase/types.ts`.
- Logica ruoli/auth: `src/hooks/useAuth.tsx`.
- Mappa funzionale/route: `src/App.tsx`.
- Query per area: pagine in `src/pages/admin`, `src/pages/coach`, `src/pages/cliente`, `src/pages/segretaria`.

## Scelte consigliate

- App nativa: Expo React Native. Riusa Supabase, tipi, logica ruoli e query, ma ricostruisce UI e navigazione con componenti native.
- App rapida wrapper: Capacitor. Riusa quasi tutta la webapp, ma offre meno esperienza nativa.
- Step intermedio: PWA installabile, utile prima delle app store.

## Attenzioni per mobile

- Supabase Auth su mobile deve usare storage sicuro/asinc (`SecureStore` o equivalente), non `localStorage`.
- Le route web vanno tradotte in stack/tab navigation.
- Le schermate con tabelle larghe, calendario e schede admin richiedono layout mobile dedicati.
- Storage video/documenti va testato su rete mobile e con upload grandi.
- Le policy RLS e le Edge Function sono il confine di sicurezza: non duplicare controlli solo lato client.
