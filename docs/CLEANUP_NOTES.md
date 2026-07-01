# Cleanup Notes

## Interventi applicati

- Routing convertito a lazy loading con `React.lazy` e `Suspense`.
- Loader condiviso in `src/components/PageLoader.tsx`.
- Query React configurate con retry leggero, stale time e no refetch automatico al focus.
- Route mancanti collegate: `/admin/esercizi` e `/coaching/segnala`.
- Navigazione aggiornata per libreria esercizi admin e segnalazioni cliente.
- Supabase client con controllo esplicito delle env richieste.
- Auth context semplificato, memoizzato e tipato con i tipi Supabase generati.
- CSS globale corretto per ordine `@import`/Tailwind.
- Rimosso CSS starter Vite non usato.
- Toolchain aggiornata a Vite 8, Vitest 4 e `@vitejs/plugin-react`.
- `lovable-tagger` rimosso dal progetto locale.
- Aggiunti script `typecheck` e `check`.
- `package-lock.json` aggiunto per build Cloudflare ripetibili con npm.
- `hero-calisthenics.jpg` ricompresso mantenendo 1536x1024, da circa 2.3 MB a circa 255 KB.
- Commenti scheda coaching bloccati alla durata reale della scheda: settimane future chiuse, settimane gia' aperte compilabili, schede vecchie in sola lettura dopo tolleranza.
- Report feedback admin/coach filtrati per non mostrare completamenti con numero settimana oltre la durata della scheda.
- Pacchetti lezioni private resi idempotenti sul calendario: niente doppio scalo per lo stesso appuntamento e ripristino lezione su cancellazione/cambio cliente.
- Abbonamenti: aggiunta vista mensile per incassi, scadenze e azioni rapide.
- Nomi cliente resi link diretti alla scheda cliente nelle aree admin principali.

## Verifiche

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm audit`
- Browser locale su `http://127.0.0.1:5173`: bundle caricato, route protette verificate in redirect login senza errori console.

## Debito tecnico rimasto

- ESLint passa ma segnala warning legacy su `any` e dipendenze hook: vanno risolti per area funzionale, non con una conversione massiva.
- Alcuni componenti shadcn esportano varianti/helper oltre al componente e generano warning Fast Refresh; non impattano la build.
- Le schermate piu grandi da tipare per prime sono `WorkoutPlanEditor`, calendario admin, report coach/admin e componenti coaching.

## Ottimizzazioni future consigliate

- Spostare le query Supabase ricorrenti in hook dedicati per area (`useWorkoutPlans`, `useAppointments`, `useReports`).
- Introdurre test su auth redirect e route protette.
- Separare la logica condivisa web/mobile in un package o cartella `src/domain`.
- Valutare PWA/Capacitor/Expo in base al livello di esperienza nativa richiesto.
