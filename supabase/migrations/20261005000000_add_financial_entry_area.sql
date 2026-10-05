-- Existing entries stay unclassified until they are edited.
alter table public.financial_entries
  add column if not exists area text;

alter table public.financial_entries
  drop constraint if exists financial_entries_area_check;

alter table public.financial_entries
  add constraint financial_entries_area_check
    check (area in ('Cozinha', 'Jardim'));

create index if not exists financial_entries_area_date_idx
  on public.financial_entries (area, entry_date desc);
