-- OutreachAI — Supabase schema
-- Esegui in Supabase → SQL Editor

-- Campagne
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  city text not null,
  status text default 'active', -- active | paused | completed
  leads_found int default 0,
  emails_sent int default 0,
  emails_opened int default 0,
  emails_replied int default 0,
  daily_limit int default 50,
  created_at timestamptz default now()
);

-- Lead
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  company_name text not null,
  sector text,
  email text,
  phone text,
  whatsapp text,
  google_maps_url text,
  address text,
  opening_hours text,
  business_type text,
  website_url text,
  rating real,
  review_count int,
  popularity_score int,
  archived boolean default false,
  status text default 'found', -- found | sent | opened | replied | interested | not_interested
  notes text default '',
  email_sent_at timestamptz,
  email_opened_at timestamptz,
  email_replied_at timestamptz,
  tracking_id uuid default gen_random_uuid(),
  created_at timestamptz default now()
);

create index if not exists leads_campaign_id_idx on leads(campaign_id);
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_tracking_id_idx on leads(tracking_id);

-- Template email
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Template di default
insert into email_templates (name, subject, body, is_default)
select
  'Template principale',
  'Un sito web può cambiare il tuo business, [Nome]',
  'Ciao [Nome],

ho notato che la tua attività non ha ancora un sito web. Oggigiorno il 70% dei clienti cerca online prima di scegliere un servizio locale.

Creo siti professionali, veloci e ottimizzati per Google — su misura per attività come la tua, a prezzi accessibili.

Scrivimi a questo indirizzo oppure contattami su WhatsApp al +39 XXX XXX XXXX per un preventivo gratuito e senza impegno.

A presto!',
  true
where not exists (select 1 from email_templates where is_default = true);
