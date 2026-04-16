-- Esegui su Supabase -> SQL Editor
-- Aggiunge le colonne mancanti alla tabella leads (se non esistono già)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opening_hours text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rating real;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_count int;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS popularity_score int;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Cancella tutti i lead vecchi (hanno dati sbagliati/mancanti)
-- Dopo puoi rifare lo scraping con il nuovo scraper che importa tutto
DELETE FROM leads;

-- Reset contatori campagne
UPDATE campaigns SET leads_found = 0, emails_sent = 0, emails_opened = 0, emails_replied = 0;
