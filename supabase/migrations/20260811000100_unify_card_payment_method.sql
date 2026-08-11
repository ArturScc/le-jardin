-- Mantém os lançamentos já registrados ao substituir Crédito e Débito por Cartão.
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
