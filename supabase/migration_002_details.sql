-- Migration 002 — dettagli attività
-- Esegui in Supabase SQL Editor

alter table leads add column if not exists address text;
alter table leads add column if not exists opening_hours text;
alter table leads add column if not exists business_type text;
alter table leads add column if not exists website_url text;
