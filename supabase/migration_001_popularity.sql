-- Migration 001 — aggiunge campi popolarità al lead
-- Esegui in Supabase SQL Editor

alter table leads add column if not exists rating numeric;
alter table leads add column if not exists review_count int;
alter table leads add column if not exists popularity_score int;

create index if not exists leads_popularity_idx on leads(popularity_score desc);
