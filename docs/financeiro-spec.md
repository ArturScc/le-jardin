# Le Jardin — Financeiro (MVP)

## Objetivo

Centralizar as entradas e saídas da cafeteria e floricultura, mantendo o saldo separado entre **Caixa** e **Banco**.

## Fluxos aprovados

### Lançamentos

- A pessoa registra um recebimento ou pagamento em poucos passos.
- Um lançamento pode ser repetido em sequência: por exemplo, "Vendas do balcão" por Pix e depois por Dinheiro, sem trocar de tela.
- Métodos e destinos obrigatórios:
  - Dinheiro → Caixa
  - Pix → Banco
  - Crédito → Banco
  - Débito → Banco
  - Outro → pessoa escolhe Caixa ou Banco

### Consultas

- Recebimentos: lista somente entradas, com filtros por método e destino.
- Pagamentos: lista somente saídas, com filtros por método e destino.
- Saldo: período selecionado, todas as movimentações e três visões: saldo Caixa, saldo Banco e total disponível.

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
| `amount` | numeric(12,2) | maior que zero |
| `payment_method` | text | Dinheiro, Pix, Crédito, Débito ou Outro |
| `destination` | text | Caixa ou Banco |

Regra de integridade: Dinheiro deve usar Caixa; Pix, Crédito e Débito devem usar Banco; Outro pode usar ambos.

## Fora do escopo deste MVP

- Login e múltiplos usuários
- Conciliação bancária e importação de extratos
- Estoque, fichas técnicas e relatórios fiscais
- Edição e exclusão de lançamentos

## Próximo incremento

Conectar o formulário e as listas ao Supabase, habilitar autenticação e aplicar políticas de acesso por usuário.
