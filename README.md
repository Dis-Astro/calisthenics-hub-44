# Calisthenics Webapp

Webapp gestionale per palestra/calisthenics con aree pubbliche, admin, segreteria, coach e clienti. Il backend attuale resta Supabase; il deploy statico produce `dist` per Cloudflare.

## Stack

- React 18 + TypeScript
- Vite 8
- Tailwind CSS + shadcn/Radix
- Supabase Auth, Database, Storage ed Edge Functions
- Cloudflare build da `wrangler.toml`

## Setup locale

```sh
npm install
npm run dev
```

Variabili richieste:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Comandi

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run check
```

## Deploy Cloudflare

Impostazioni consigliate per Cloudflare Pages collegato a GitHub:

- Framework preset: `Vite`
- Install command: `npm install --no-audit --no-fund`
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22.16.0` (pinzata anche in `.node-version`)

Variabili di ambiente da configurare in Cloudflare Pages, sezione
`Settings > Environment variables`, per Production e Preview:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Dopo averle aggiunte o modificate, avviare un nuovo deploy: Vite incorpora le
variabili `VITE_*` durante la build.

`wrangler.toml` espone `pages_build_output_dir = "./dist"` e le variabili
pubbliche Supabase disponibili a Pages. Il comando di build va comunque
impostato nel pannello Cloudflare Pages, in `Settings > Builds and deployments`,
perche' Cloudflare non lo legge dal `wrangler.toml`.

`public/_redirects` contiene le riscritture delle route React verso `index.html`.

## Note tecniche

- Le route sono caricate in lazy loading da `src/App.tsx`.
- Il database non viene modificato da questa pulizia: le migrazioni Supabase restano in `supabase/migrations`.
- Le Edge Function admin sono in `supabase/functions`.
- Riferimenti per la futura app mobile: `docs/MOBILE_APP_REFERENCE.md`.
