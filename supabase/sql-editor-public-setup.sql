-- Le Jardin Financeiro: execute todo este script no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null default current_date,
  type text not null check (type in ('recebimento', 'pagamento')),
  description text not null check (char_length(trim(description)) > 0),
  category text,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('Dinheiro', 'Pix', 'Cartão', 'Outro')),
  destination text not null check (destination in ('Caixa', 'Banco')),
  constraint financial_entries_method_destination_check check (
    (payment_method = 'Dinheiro' and destination = 'Caixa') or
    (payment_method in ('Pix', 'Cartão') and destination = 'Banco') or
    payment_method = 'Outro'
  )
);

-- Atualiza versões antigas que ainda tinham Crédito e Débito separados.
update public.financial_entries
set payment_method = 'Cartão'
where payment_method in ('Crédito', 'Débito');

alter table public.financial_entries
  drop constraint if exists financial_entries_payment_method_check,
  drop constraint if exists financial_entries_method_destination_check;

alter table public.financial_entries
  add constraint financial_entries_payment_method_check
    check (payment_method in ('Dinheiro', 'Pix', 'Cartão', 'Outro')),
  add constraint financial_entries_method_destination_check
    check (
      (payment_method = 'Dinheiro' and destination = 'Caixa') or
      (payment_method in ('Pix', 'Cartão') and destination = 'Banco') or
      payment_method = 'Outro'
    );

-- Remove a obrigatoriedade de dono caso uma versão anterior tenha criado owner_id.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'financial_entries' and column_name = 'owner_id'
  ) then
    alter table public.financial_entries alter column owner_id drop not null;
  end if;
end $$;

create index if not exists financial_entries_date_idx on public.financial_entries (entry_date desc);
alter table public.financial_entries enable row level security;

drop policy if exists "Financial entries are visible to their owner" on public.financial_entries;
drop policy if exists "Financial entries can be created by their owner" on public.financial_entries;
drop policy if exists "Financial entries can be updated by their owner" on public.financial_entries;
drop policy if exists "Public financial entries can be read" on public.financial_entries;
drop policy if exists "Public financial entries can be created" on public.financial_entries;
drop policy if exists "Public financial entries can be updated" on public.financial_entries;

grant select, insert, update on public.financial_entries to anon, authenticated;

create policy "Public financial entries can be read"
  on public.financial_entries for select to anon, authenticated using (true);
create policy "Public financial entries can be created"
  on public.financial_entries for insert to anon, authenticated with check (true);
create policy "Public financial entries can be updated"
  on public.financial_entries for update to anon, authenticated using (true) with check (true);
