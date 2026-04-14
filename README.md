# OutreachAI

Dashboard Next.js 16 per cold outreach automatizzato verso aziende senza sito web.
Scraping Google Maps con Playwright + personalizzazione email AI con Gemini + invio via Brevo SMTP.

## Stack

- Next.js 16 (App Router, TypeScript)
- Supabase (database + auth)
- Brevo SMTP (300 email/giorno gratis)
- Google Gemini `gemini-2.0-flash`
- Playwright (scraping)
- Tailwind CSS v4 + Recharts

## Setup

### 1. Variabili d'ambiente

Compila `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=...
BREVO_SMTP_PASS=...
BREVO_FROM_EMAIL=outreach@tuodominio.com
BREVO_FROM_NAME=Nome Agency

GEMINI_API_KEY=...

NEXT_PUBLIC_URL=http://localhost:3000
DASHBOARD_PASSWORD=admin123
```

### 2. Database Supabase

Esegui `supabase/schema.sql` nel SQL Editor di Supabase.

### 3. Playwright

```bash
npx playwright install chromium
```

### 4. Avvio

```bash
npm run dev
```

Apri http://localhost:3000 e logga con la `DASHBOARD_PASSWORD`.

## Struttura

```
src/
  app/
    page.tsx                    # Login
    dashboard/
      layout.tsx                # Sidebar
      page.tsx                  # Panoramica
      campagna/page.tsx         # Nuova campagna + scraping
      lead/page.tsx             # CRM lead
      template/page.tsx         # Editor template AI
      statistiche/page.tsx      # Grafici
    api/
      auth/route.ts             # POST login / DELETE logout
      scrape/route.ts           # Streaming scraping
      send-emails/route.ts      # Streaming invio email
      ai-personalize/route.ts   # Anteprima Gemini
      track/[id]/route.ts       # Tracking pixel aperture
  lib/
    supabase.ts                 # Client + types
    brevo.ts                    # Nodemailer + tracking pixel
    gemini.ts                   # Personalizzazione email
    scraper.ts                  # Playwright Google Maps
  components/
    Sidebar.tsx
    StatsCard.tsx
    LeadTable.tsx
    TemplateEditor.tsx
proxy.ts                        # Auth gating /dashboard/*
supabase/schema.sql             # Schema DB
```

## Note importanti

1. **Rate limiting**: Brevo è limitato a 300/giorno. La route `/api/send-emails` aggiunge ~4.5s tra invii per rispettare anche il limite Gemini free (15 req/min).
2. **Scraping Google Maps**: fragile per definizione. Selettori e flusso possono cambiare. Lo script salta le aziende che hanno già un sito (`a[data-item-id="authority"]`).
3. **Email scraping**: Google Maps non espone email — `lib/scraper.ts` recupera nome/telefono/indirizzo. L'email va arricchita a parte (es. da sito o manualmente) prima dell'invio.
4. **Tracking pixel**: funziona solo se il client carica le immagini (Gmail le carica di default).
5. **Deploy**: Playwright NON gira su Vercel free tier. Per il deploy:
   - Frontend + API non-scraping → Vercel
   - Scraping in locale o su Railway/Render
   - Oppure intero stack su Railway

## Comandi

```bash
npm run dev      # dev server
npm run build    # build production
npm start        # avvia production build
```
