"use client";

import { useMemo, useState } from "react";

type Destination = "Caixa" | "Banco";
type Method = "Dinheiro" | "Pix" | "Crédito" | "Débito" | "Outro";
type EntryType = "recebimento" | "pagamento";
type Entry = {
  id: number;
  date: string;
  description: string;
  category: string;
  method: Method;
  destination: Destination;
  amount: number;
  type: EntryType;
};

const methods: Method[] = ["Dinheiro", "Pix", "Crédito", "Débito", "Outro"];
const initialEntries: Entry[] = [
  { id: 1, date: "2026-08-11", description: "Vendas do balcão", category: "Cafeteria", method: "Pix", destination: "Banco", amount: 487.5, type: "recebimento" },
  { id: 2, date: "2026-08-11", description: "Vendas do balcão", category: "Cafeteria", method: "Dinheiro", destination: "Caixa", amount: 286, type: "recebimento" },
  { id: 3, date: "2026-08-10", description: "Buquês e flores", category: "Floricultura", method: "Crédito", destination: "Banco", amount: 325, type: "recebimento" },
  { id: 4, date: "2026-08-10", description: "Compra de flores", category: "Fornecedor", method: "Pix", destination: "Banco", amount: 420, type: "pagamento" },
  { id: 5, date: "2026-08-09", description: "Insumos da cozinha", category: "Fornecedor", method: "Dinheiro", destination: "Caixa", amount: 96.4, type: "pagamento" },
  { id: 6, date: "2026-08-08", description: "Vaso decorativo", category: "Decoração", method: "Débito", destination: "Banco", amount: 168, type: "recebimento" },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const prettyDate = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));

export default function Home() {
  const [screen, setScreen] = useState<"lancamentos" | "recebimentos" | "pagamentos" | "saldo">("lancamentos");
  const [entries, setEntries] = useState(initialEntries);
  const [type, setType] = useState<EntryType>("recebimento");
  const [method, setMethod] = useState<Method>("Pix");
  const [destination, setDestination] = useState<Destination>("Banco");
  const [description, setDescription] = useState("Vendas do balcão");
  const [amount, setAmount] = useState("");
  const [filterMethod, setFilterMethod] = useState("Todos");
  const [filterDestination, setFilterDestination] = useState("Todos");

  const destinationFor = (value: Method): Destination => value === "Dinheiro" ? "Caixa" : "Banco";
  const shownEntries = useMemo(() => entries.filter((entry) =>
    (screen === "recebimentos" ? entry.type === "recebimento" : screen === "pagamentos" ? entry.type === "pagamento" : true) &&
    (filterMethod === "Todos" || entry.method === filterMethod) &&
    (filterDestination === "Todos" || entry.destination === filterDestination)
  ), [entries, screen, filterMethod, filterDestination]);
  const totals = useMemo(() => entries.reduce((result, entry) => {
    const sign = entry.type === "recebimento" ? 1 : -1;
    result[entry.destination] += sign * entry.amount;
    return result;
  }, { Caixa: 0, Banco: 0 }), [entries]);

  function chooseMethod(value: Method) {
    setMethod(value);
    if (value !== "Outro") setDestination(destinationFor(value));
  }
  function addEntry() {
    const parsed = Number(amount.replace(",", "."));
    if (!description.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    setEntries((current) => [{ id: Date.now(), date: "2026-08-11", description: description.trim(), category: type === "recebimento" ? "Vendas" : "Despesa", method, destination, amount: parsed, type }, ...current]);
    setAmount("");
  }

  const pageTitle = { lancamentos: "Lançamentos", recebimentos: "Recebimentos", pagamentos: "Pagamentos", saldo: "Saldo" }[screen];
  const total = totals.Caixa + totals.Banco;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✿</span><span>Le Jardin</span></div>
      <div className="business">CAFÉ & FLORES</div>
      <nav aria-label="Navegação principal">
        <button className={screen === "lancamentos" ? "nav active" : "nav"} onClick={() => setScreen("lancamentos")}><span>＋</span>Lançamentos</button>
        <button className={screen === "recebimentos" ? "nav active" : "nav"} onClick={() => setScreen("recebimentos")}><span>↙</span>Recebimentos</button>
        <button className={screen === "pagamentos" ? "nav active" : "nav"} onClick={() => setScreen("pagamentos")}><span>↗</span>Pagamentos</button>
        <button className={screen === "saldo" ? "nav active" : "nav"} onClick={() => setScreen("saldo")}><span>◒</span>Saldo</button>
      </nav>
      <div className="sidebar-foot"><span className="avatar">LJ</span><div><strong>Le Jardin</strong><small>Gestão financeira</small></div></div>
    </aside>

    <section className="workspace">
      <header><div><p className="eyebrow">FINANCEIRO</p><h1>{pageTitle}</h1></div><button className="period">Agosto 2026 <span>⌄</span></button></header>
      {screen === "lancamentos" ? <>
        <section className="intro"><div><p>Registre o movimento do dia</p><span>Adicione vários lançamentos sem perder o ritmo do atendimento.</span></div><div className="today">TERÇA-FEIRA<br/><strong>11 AGO</strong></div></section>
        <section className="entry-card">
          <div className="type-toggle"><button className={type === "recebimento" ? "selected receipt" : ""} onClick={() => setType("recebimento")}>↓ Recebimento</button><button className={type === "pagamento" ? "selected payment" : ""} onClick={() => setType("pagamento")}>↑ Pagamento</button></div>
          <div className="field"><label>Descrição</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Vendas do balcão" /></div>
          <div className="field"><label>Valor</label><div className="amount"><span>R$</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div></div>
          <div className="field full"><label>Método de {type === "recebimento" ? "recebimento" : "pagamento"}</label><div className="method-grid">{methods.map((item) => <button key={item} className={method === item ? "method selected" : "method"} onClick={() => chooseMethod(item)}>{item}<small>{item === "Outro" ? "escolher destino" : destinationFor(item)}</small></button>)}</div></div>
          {method === "Outro" && <div className="field full"><label>Destino</label><select value={destination} onChange={(e) => setDestination(e.target.value as Destination)}><option>Caixa</option><option>Banco</option></select></div>}
          <button className="save" onClick={addEntry}>Adicionar lançamento <span>→</span></button>
        </section>
        <section className="quick-overview"><div><span>ENTRADAS HOJE</span><strong>{money.format(entries.filter(e => e.type === "recebimento" && e.date === "2026-08-11").reduce((sum, e) => sum + e.amount, 0))}</strong></div><div><span>SAÍDAS HOJE</span><strong>{money.format(entries.filter(e => e.type === "pagamento" && e.date === "2026-08-11").reduce((sum, e) => sum + e.amount, 0))}</strong></div><div><span>SALDO DO DIA</span><strong>{money.format(entries.filter(e => e.date === "2026-08-11").reduce((sum, e) => sum + (e.type === "recebimento" ? e.amount : -e.amount), 0))}</strong></div></section>
      </> : screen === "saldo" ? <>
        <section className="balance-grid"><div className="balance-card"><span>CAIXA</span><strong>{money.format(totals.Caixa)}</strong><small>Movimentações em dinheiro</small></div><div className="balance-card"><span>BANCO</span><strong>{money.format(totals.Banco)}</strong><small>Pix, crédito e débito</small></div><div className="balance-card total"><span>SALDO DISPONÍVEL</span><strong>{money.format(total)}</strong><small>Caixa + Banco</small></div></section>
        <section className="section-head"><div><h2>Movimentações do período</h2><p>Todos os recebimentos e pagamentos de agosto.</p></div></section><EntryTable entries={shownEntries} />
      </> : <>
        <section className="list-top"><div><h2>{screen === "recebimentos" ? "Entradas registradas" : "Pagamentos registrados"}</h2><p>Consulte e filtre suas movimentações por método e destino.</p></div><button className="new-entry" onClick={() => setScreen("lancamentos")}>＋ Novo lançamento</button></section>
        <section className="filters"><span>Filtrar por</span><select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}><option>Todos</option>{methods.map(value => <option key={value}>{value}</option>)}</select><select value={filterDestination} onChange={e => setFilterDestination(e.target.value)}><option>Todos</option><option>Caixa</option><option>Banco</option></select><button onClick={() => { setFilterMethod("Todos"); setFilterDestination("Todos"); }}>Limpar filtros</button></section>
        <EntryTable entries={shownEntries} />
      </>}
    </section>
  </main>;
}

function EntryTable({ entries }: { entries: Entry[] }) {
  return <section className="table-card"><div className="table-header"><span>DATA</span><span>DESCRIÇÃO</span><span>MÉTODO</span><span>DESTINO</span><span>VALOR</span></div>{entries.length ? entries.map(entry => <div className="table-row" key={entry.id}><span>{prettyDate(entry.date)}</span><div><strong>{entry.description}</strong><small>{entry.category}</small></div><span><i className={`dot ${entry.method.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}></i>{entry.method}</span><span className="destination">{entry.destination}</span><strong className={entry.type === "recebimento" ? "positive" : "negative"}>{entry.type === "recebimento" ? "+" : "−"} {money.format(entry.amount)}</strong></div>) : <div className="empty">Nenhum lançamento encontrado com estes filtros.</div>}</section>;
}
