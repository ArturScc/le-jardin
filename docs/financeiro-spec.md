# Le Jardin — Financeiro (MVP)

## Objetivo

Centralizar as entradas e saídas da cafeteria e floricultura, mantendo o saldo separado entre **Caixa** e **Banco**.

## Fluxos aprovados

### Lançamentos

- A pessoa registra um recebimento ou pagamento em poucos passos.
- A data do lançamento é editável e permite registrar movimentações retroativas.
- Cada novo lançamento exige a escolha de uma área: **Cozinha** ou **Jardim**. Todos os valores de um lote recebem a mesma área.
- Um lançamento pode ser repetido em sequência: por exemplo, "Vendas do balcão" por Pix e depois por Dinheiro, sem trocar de tela.
- Métodos e destinos obrigatórios:
  - Dinheiro → Caixa
  - Pix → Banco
  - Cartão → Banco
  - Outro → pessoa escolhe Caixa ou Banco

### Consultas

- Recebimentos: lista somente entradas, com filtros por método, destino e área.
- Pagamentos: lista somente saídas, com filtros por método, destino e área.
- Saldo: período e área selecionados, todas as movimentações e três visões: saldo Caixa, saldo Banco e total disponível.
- Gráficos: vendas por método e totais no período e na área escolhidos.
- Exportações PDF e Excel incluem a área de cada lançamento e respeitam os filtros ativos.
- Lançamentos anteriores à criação do campo permanecem como **Sem área** e podem ser classificados na edição.

## Modelo de dados para Supabase

Tabela `financial_entries`:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid | chave primária |
| `created_at` | timestamptz | criado automaticamente |
| `entry_date` | date | data da movimentação |
| `type` | text | `recebimento` ou `pagamento` |
| `description` | text | obrigatório |
| `category` | text | opcional |
| `area` | text | Cozinha ou Jardim; nulo somente em lançamentos antigos |
| `amount` | numeric(12,2) | zero ou positivo |
| `payment_method` | text | Dinheiro, Pix, Cartão ou Outro |
| `destination` | text | Caixa ou Banco |

Regra de integridade: Dinheiro deve usar Caixa; Pix e Cartão devem usar Banco; Outro pode usar ambos.

## Fora do escopo deste MVP

- Login e múltiplos usuários
- Conciliação bancária e importação de extratos
- Estoque, fichas técnicas e relatórios fiscais
- Conciliação automática entre as áreas e o extrato bancário

## Persistência

Os lançamentos ficam no Supabase, com acesso público conforme a configuração escolhida para este MVP. Para um banco já em uso, aplicar `supabase/migrations/20261005000000_add_financial_entry_area.sql` antes de publicar esta versão. Para uma instalação nova, usar `supabase/sql-editor-public-setup.sql`.

O aplicativo consulta o Supabase por `/api/financial-entries` no mesmo domínio do site. A leitura pode repetir uma tentativa após falha transitória de rede; operações de escrita não são repetidas automaticamente para evitar duplicação.
