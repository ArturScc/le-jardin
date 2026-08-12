-- A aplicação é pública: qualquer pessoa com o link pode consultar, criar e editar lançamentos.
drop policy if exists "Financial entries are visible to their owner" on public.financial_entries;
drop policy if exists "Financial entries can be created by their owner" on public.financial_entries;
drop policy if exists "Financial entries can be updated by their owner" on public.financial_entries;
drop policy if exists "Public financial entries can be read" on public.financial_entries;
drop policy if exists "Public financial entries can be created" on public.financial_entries;
drop policy if exists "Public financial entries can be updated" on public.financial_entries;

grant select, insert, update, delete on public.financial_entries to anon, authenticated;

create policy "Public financial entries can be read"
  on public.financial_entries for select to anon, authenticated
  using (true);

create policy "Public financial entries can be created"
  on public.financial_entries for insert to anon, authenticated
  with check (true);

create policy "Public financial entries can be updated"
  on public.financial_entries for update to anon, authenticated
  using (true)
  with check (true);

create policy "Public financial entries can be deleted"
  on public.financial_entries for delete to anon, authenticated
  using (true);
