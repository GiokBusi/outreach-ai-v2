-- Migration 003 — archivio lead scartati
alter table leads add column if not exists archived boolean default false;
create index if not exists leads_archived_idx on leads(archived);
