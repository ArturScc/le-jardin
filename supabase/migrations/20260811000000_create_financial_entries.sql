create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null default current_date,
  type text not null check (type in ('recebimento', 'pagamento')),
  description text not null check (char_length(trim(description)) > 0),
  category text,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('Dinheiro', 'Pix', 'Crédito', 'Débito', 'Outro')),
  destination text not null check (destination in ('Caixa', 'Banco')),
  constraint financial_entries_method_destination_check check (
    (payment_method = 'Dinheiro' and destination = 'Caixa') or
    (payment_method in ('Pix', 'Crédito', 'Débito') and destination = 'Banco') or
    payment_method = 'Outro'
  )
);

create index financial_entries_date_idx on public.financial_entries (entry_date desc);

alter table public.financial_entries enable row level security;

-- A política de acesso será adicionada junto com a autenticação no próximo incremento.
