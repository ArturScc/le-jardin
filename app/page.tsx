"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Destination = "Caixa" | "Banco";
type Method = "Dinheiro" | "Pix" | "Cartão" | "Outro";
type EntryType = "recebimento" | "pagamento";
type Screen = "lancamentos" | "recebimentos" | "pagamentos" | "saldo" | "graficos";
type PeriodPreset = "7" | "30" | "year" | null;
type Entry = { id: string; date: string; description: string; category: string; method: Method; destination: Destination; amount: number; type: EntryType };
type BatchLine = { id: number; amount: string };

const methods: Method[] = ["Dinheiro", "Pix", "Cartão", "Outro"];
const ADMIN_PASSWORD = "marcia";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (date: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));
const today = () => new Date().toISOString().slice(0, 10);
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthStart = () => { const date = new Date(); return localDate(new Date(date.getFullYear(), date.getMonth(), 1)); };
const monthEnd = () => { const date = new Date(); return localDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)); };
const FILTER_CACHE_KEY = "le-jardin-financial-filters";
type DatabaseStatus = "loading" | "ready" | "missing" | "error";
type DatabaseRow = { id: string; entry_date: string; description: string; category: string | null; payment_method: Method; destination: Destination; amount: number | string; type: EntryType };
const entryFromRow = (row: DatabaseRow): Entry => ({ id: row.id, date: row.entry_date, description: row.description, category: row.category ?? "", method: row.payment_method, destination: row.destination, amount: Number(row.amount), type: row.type });

export default function Home() {
  const [screen, setScreen] = useState<Screen>("lancamentos");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [type, setType] = useState<EntryType>("recebimento");
  const [method, setMethod] = useState<Method>("Pix");
  const [destination, setDestination] = useState<Destination>("Banco");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(today);
  const [batchLines, setBatchLines] = useState<BatchLine[]>([{ id: 1, amount: "" }]);
  const [filterMethod, setFilterMethod] = useState("Todos");
  const [filterDestination, setFilterDestination] = useState("Todos");
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(monthEnd);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(null);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>("loading");
  const [databaseMessage, setDatabaseMessage] = useState("");

  const destinationFor = (value: Method): Destination => value === "Dinheiro" ? "Caixa" : "Banco";
  const chooseMethod = (value: Method) => { setMethod(value); if (value !== "Outro") setDestination(destinationFor(value)); };
  const totals = useMemo(() => entries.reduce((result, entry) => { result[entry.destination] += entry.type === "recebimento" ? entry.amount : -entry.amount; return result; }, { Caixa: 0, Banco: 0 }), [entries]);
  const total = totals.Caixa + totals.Banco;
  const periodEntries = useMemo(() => entries.filter((entry) => entry.date >= startDate && entry.date <= endDate), [entries, startDate, endDate]);
  const periodTotals = useMemo(() => periodEntries.reduce((result, entry) => { result[entry.destination] += entry.type === "recebimento" ? entry.amount : -entry.amount; return result; }, { Caixa: 0, Banco: 0 }), [periodEntries]);
  const shownEntries = useMemo(() => periodEntries.filter((entry) => (screen === "recebimentos" ? entry.type === "recebimento" : screen === "pagamentos" ? entry.type === "pagamento" : true) && (filterMethod === "Todos" || entry.method === filterMethod) && (filterDestination === "Todos" || entry.destination === filterDestination)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [periodEntries, screen, filterMethod, filterDestination]);
  const selectedDateTotals = useMemo(() => entries.filter((entry) => entry.date === entryDate).reduce((result, entry) => { result[entry.type] += entry.amount; return result; }, { recebimento: 0, pagamento: 0 }), [entries, entryDate]);

  const refreshEntries = useCallback(async () => {
    if (!supabase) { setDatabaseStatus("missing"); setDatabaseMessage("Conecte as variáveis do Supabase para salvar os lançamentos."); return; }
    setDatabaseStatus("loading");
    const { data, error } = await supabase.from("financial_entries").select("id, entry_date, description, category, payment_method, destination, amount, type").order("entry_date", { ascending: false });
    if (error) { setDatabaseStatus("error"); setDatabaseMessage(error.message); return; }
    setEntries((data ?? []).map((row) => entryFromRow(row as DatabaseRow)));
    setDatabaseStatus("ready");
  }, []);

  useEffect(() => { void refreshEntries(); }, [refreshEntries]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FILTER_CACHE_KEY);
      if (saved) {
        const filters = JSON.parse(saved) as { startDate?: string; endDate?: string; periodPreset?: PeriodPreset; method?: string; destination?: string };
        if (filters.startDate) setStartDate(filters.startDate);
        if (filters.endDate) setEndDate(filters.endDate);
        if (filters.periodPreset === "7" || filters.periodPreset === "30" || filters.periodPreset === "year") setPeriodPreset(filters.periodPreset);
        if (filters.method) setFilterMethod(filters.method);
        if (filters.destination) setFilterDestination(filters.destination);
      }
    } finally { setFiltersLoaded(true); }
  }, []);
  useEffect(() => {
    if (!filtersLoaded) return;
    window.localStorage.setItem(FILTER_CACHE_KEY, JSON.stringify({ startDate, endDate, periodPreset, method: filterMethod, destination: filterDestination }));
  }, [filtersLoaded, startDate, endDate, periodPreset, filterMethod, filterDestination]);

  function addLine() { setBatchLines((lines) => [...lines, { id: Date.now(), amount: "" }]); }
  function updateLine(id: number, amount: string) { setBatchLines((lines) => lines.map((line) => line.id === id ? { ...line, amount } : line)); }
  function removeLine(id: number) { setBatchLines((lines) => lines.length > 1 ? lines.filter((line) => line.id !== id) : lines); }
  async function addBatch() {
    if (!description.trim()) return;
    const validLines = batchLines.map((line) => Number(line.amount.replace(",", "."))).filter((amount) => Number.isFinite(amount) && amount > 0);
    if (!validLines.length) return;
    if (!supabase) { setDatabaseStatus("missing"); setDatabaseMessage("Configure o Supabase antes de salvar."); return; }
    const rows = validLines.map((amount) => ({ entry_date: entryDate, description: description.trim(), category: type === "recebimento" ? "Vendas" : "Despesa", payment_method: method, destination, amount, type }));
    const { data, error } = await supabase.from("financial_entries").insert(rows).select("id, entry_date, description, category, payment_method, destination, amount, type");
    if (error) { setDatabaseStatus("error"); setDatabaseMessage(error.message); return; }
    setEntries((current) => [...(data ?? []).map((row) => entryFromRow(row as DatabaseRow)), ...current]);
    setBatchLines([{ id: Date.now(), amount: "" }]);
    setDatabaseStatus("ready");
  }
  function requestEdit(entry: Entry) { setEditing(entry); setPassword(""); setPasswordError(false); setUnlocked(false); }
  function verifyPassword() { if (password === ADMIN_PASSWORD) { setUnlocked(true); setPasswordError(false); } else setPasswordError(true); }
  async function saveEdit(next: Entry) {
    if (!supabase) return;
    const { data, error } = await supabase.from("financial_entries").update({ entry_date: next.date, description: next.description, amount: next.amount, payment_method: next.method, destination: next.destination }).eq("id", next.id).select("id, entry_date, description, category, payment_method, destination, amount, type").single();
    if (error) { setDatabaseStatus("error"); setDatabaseMessage(error.message); return; }
    setEntries((current) => current.map((entry) => entry.id === next.id ? entryFromRow(data as DatabaseRow) : entry));
    setEditing(null);
  }
  async function deleteEntry(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("financial_entries").delete().eq("id", id);
    if (error) { setDatabaseStatus("error"); setDatabaseMessage(error.message); return; }
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setEditing(null);
  }
  function applyPeriodPreset(preset: Exclude<PeriodPreset, null>) {
    if (periodPreset === preset) { setPeriodPreset(null); return; }
    const end = new Date();
    const start = new Date();
    if (preset === "7") start.setDate(end.getDate() - 6);
    if (preset === "30") start.setDate(end.getDate() - 29);
    if (preset === "year") start.setMonth(0, 1);
    setStartDate(localDate(start)); setEndDate(localDate(end)); setPeriodPreset(preset);
  }

  const pageTitle: Record<Screen, string> = { lancamentos: "Lançamentos", recebimentos: "Recebimentos", pagamentos: "Pagamentos", saldo: "Saldo", graficos: "Gráficos" };
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/assets/logo_color.svg" alt="" /><span>Le Jardin</span></div><div className="business">CAFÉ & FLORES</div>
      <nav aria-label="Navegação principal">
        <NavButton active={screen === "lancamentos"} icon="＋" label="Lançamentos" onClick={() => setScreen("lancamentos")} />
        <NavButton active={screen === "recebimentos"} image="/assets/recebimento.svg" label="Recebimentos" onClick={() => setScreen("recebimentos")} />
        <NavButton active={screen === "pagamentos"} image="/assets/pagamento.svg" label="Pagamentos" onClick={() => setScreen("pagamentos")} />
        <NavButton active={screen === "saldo"} image="/assets/saldo.svg" label="Saldo" onClick={() => setScreen("saldo")} />
        <NavButton active={screen === "graficos"} image="/assets/grafico.svg" label="Gráficos" onClick={() => setScreen("graficos")} />
      </nav>
      <div className="sidebar-foot"><span className="avatar">LJ</span><div><strong>Le Jardin</strong><small>Gestão financeira</small></div></div>
    </aside>
    <section className="workspace">
      <header><div><p className="eyebrow">FINANCEIRO</p><h1>{pageTitle[screen]}</h1></div><div className="header-actions"><button className="refresh" onClick={() => void refreshEntries()} disabled={databaseStatus === "loading"}>↻ Atualizar</button><button className="period">{formatDate(entryDate)} <span>⌄</span></button></div></header>
      {databaseStatus !== "ready" && <div className={`database-notice ${databaseStatus}`}><strong>{databaseStatus === "loading" ? "Conectando ao Supabase…" : "Atenção"}</strong><span>{databaseStatus === "loading" ? "Carregando seus lançamentos." : databaseMessage}</span></div>}
      {screen === "lancamentos" && <>
        <section className="intro"><div><p>Registre o movimento do dia</p><span>Crie vários valores do mesmo método em uma única operação.</span></div></section>
        <section className="entry-card">
          <div className="type-toggle"><button className={type === "recebimento" ? "selected receipt" : ""} onClick={() => setType("recebimento")}>↓ Recebimento</button><button className={type === "pagamento" ? "selected payment" : ""} onClick={() => setType("pagamento")}>↑ Pagamento</button></div>
          <div className="field full"><label>Data do lançamento</label><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></div>
          <div className="field full"><label>Descrição compartilhada</label><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Vendas do balcão" /></div>
          <div className="field full"><label>Método de {type === "recebimento" ? "recebimento" : "pagamento"}</label><div className="method-grid">{methods.map((item) => <button type="button" key={item} className={method === item ? "method selected" : "method"} onClick={() => chooseMethod(item)}>{item}<small>{item === "Outro" ? "escolher destino" : destinationFor(item)}</small></button>)}</div></div>
          {method === "Outro" && <div className="field full"><label>Destino</label><select value={destination} onChange={(event) => setDestination(event.target.value as Destination)}><option>Caixa</option><option>Banco</option></select></div>}
          <div className="field full"><div className="field-label-row"><label>Valores do lote</label><span>Cada valor vira uma linha separada</span></div><div className="batch-lines">{batchLines.map((line, index) => <div className="batch-line" key={line.id}><span>{String(index + 1).padStart(2, "0")}</span><div className="amount"><b>R$</b><input aria-label={`Valor ${index + 1}`} inputMode="decimal" value={line.amount} onChange={(event) => updateLine(line.id, event.target.value)} placeholder="0,00" /></div><button className="remove-line" type="button" aria-label={`Remover valor ${index + 1}`} onClick={() => removeLine(line.id)}>×</button></div>)}</div><button className="add-line" type="button" onClick={addLine}>＋ Adicionar outro valor</button></div>
          <button className="save" onClick={addBatch}>Salvar {batchLines.length > 1 ? "lote" : "lançamento"} <span>→</span></button>
        </section>
        <section className="quick-overview"><div><span>ENTRADAS NA DATA</span><strong>{money.format(selectedDateTotals.recebimento)}</strong></div><div><span>SAÍDAS NA DATA</span><strong>{money.format(selectedDateTotals.pagamento)}</strong></div><div><span>SALDO NA DATA</span><strong>{money.format(selectedDateTotals.recebimento - selectedDateTotals.pagamento)}</strong></div></section>
      </>}
      {screen === "saldo" && <><PeriodFilters startDate={startDate} endDate={endDate} preset={periodPreset} onStartChange={(value) => { setStartDate(value); setPeriodPreset(null); }} onEndChange={(value) => { setEndDate(value); setPeriodPreset(null); }} onPreset={applyPeriodPreset} /><section className="balance-grid"><BalanceCard label="Caixa" value={periodTotals.Caixa} detail="Movimentações em dinheiro" /><BalanceCard label="Banco" value={periodTotals.Banco} detail="Pix e cartão" /><BalanceCard total label="Saldo disponível" value={periodTotals.Caixa + periodTotals.Banco} detail="Caixa + Banco" /></section><section className="section-head section-action"><div><h2>Movimentações do período</h2><p>Todos os recebimentos e pagamentos registrados.</p></div><ExportButton entries={shownEntries} title="saldo" /></section><EntryTable entries={shownEntries} onEdit={requestEdit} /></>}
      {(screen === "recebimentos" || screen === "pagamentos") && <><section className="list-top"><div><h2>{screen === "recebimentos" ? "Entradas registradas" : "Pagamentos registrados"}</h2><p>Consulte, filtre e edite suas movimentações.</p></div><div className="list-actions"><ExportButton entries={shownEntries} title={screen} /><button className="new-entry" onClick={() => setScreen("lancamentos")}>＋ Novo lançamento</button></div></section><PeriodFilters startDate={startDate} endDate={endDate} preset={periodPreset} onStartChange={(value) => { setStartDate(value); setPeriodPreset(null); }} onEndChange={(value) => { setEndDate(value); setPeriodPreset(null); }} onPreset={applyPeriodPreset} /><section className="filters"><span>Filtrar por</span><select value={filterMethod} onChange={(event) => setFilterMethod(event.target.value)}><option>Todos</option>{methods.map((value) => <option key={value}>{value}</option>)}</select><select value={filterDestination} onChange={(event) => setFilterDestination(event.target.value)}><option>Todos</option><option>Caixa</option><option>Banco</option></select><button onClick={() => { setFilterMethod("Todos"); setFilterDestination("Todos"); }}>Limpar filtros</button></section><EntryTable entries={shownEntries} onEdit={requestEdit} /></>}
      {screen === "graficos" && <><PeriodFilters startDate={startDate} endDate={endDate} preset={periodPreset} onStartChange={(value) => { setStartDate(value); setPeriodPreset(null); }} onEndChange={(value) => { setEndDate(value); setPeriodPreset(null); }} onPreset={applyPeriodPreset} /><Charts entries={periodEntries} /></>}
    </section>
    {editing && <ManageEntryDialog entry={editing} unlocked={unlocked} password={password} error={passwordError} onPasswordChange={setPassword} onVerify={verifyPassword} onClose={() => setEditing(null)} onSave={saveEdit} onDelete={deleteEntry} />}
  </main>;
}

function NavButton({ active, icon, image, label, onClick }: { active: boolean; icon?: string; image?: string; label: string; onClick: () => void }) { return <button className={active ? "nav active" : "nav"} onClick={onClick}>{image ? <img src={image} alt="" /> : <span>{icon}</span>}<em>{label}</em></button>; }
function BalanceCard({ label, value, detail, total }: { label: string; value: number; detail: string; total?: boolean }) { return <div className={total ? "balance-card total" : "balance-card"}><span>{label}</span><strong>{money.format(value)}</strong><small>{detail}</small></div>; }
function PeriodFilters({ startDate, endDate, preset, onStartChange, onEndChange, onPreset }: { startDate: string; endDate: string; preset: PeriodPreset; onStartChange: (value: string) => void; onEndChange: (value: string) => void; onPreset: (preset: Exclude<PeriodPreset, null>) => void }) { const presets: { id: Exclude<PeriodPreset, null>; label: string }[] = [{ id: "30", label: "Últimos 30 dias" }, { id: "7", label: "Últimos 7 dias" }, { id: "year", label: "Esse ano até agora" }]; return <section className="period-filters"><div className="date-fields"><label>Data inicial<input type="date" value={startDate} onChange={(event) => onStartChange(event.target.value)} /></label><label>Data final<input type="date" value={endDate} onChange={(event) => onEndChange(event.target.value)} /></label></div><div className="period-presets">{presets.map((item) => <label key={item.id}><input type="checkbox" checked={preset === item.id} onChange={() => onPreset(item.id)} />{item.label}</label>)}</div></section>; }

function EntryTable({ entries, onEdit }: { entries: Entry[]; onEdit: (entry: Entry) => void }) { return <section className="table-card"><div className="table-header"><span>DATA</span><span>DESCRIÇÃO</span><span>MÉTODO</span><span>DESTINO</span><span>VALOR</span><span></span></div>{entries.length ? entries.map((entry) => <div className="table-row" key={entry.id}><span>{formatDate(entry.date)}</span><div><strong>{entry.description}</strong><small>{entry.category}</small></div><span><i className={`dot ${entry.method.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}></i>{entry.method}</span><span className="destination">{entry.destination}</span><strong className={entry.type === "recebimento" ? "positive" : "negative"}>{entry.type === "recebimento" ? "+" : "−"} {money.format(entry.amount)}</strong><button className="edit" onClick={() => onEdit(entry)}>Editar</button></div>) : <div className="empty">Nenhum lançamento encontrado.</div>}</section>; }

function ExportButton({ entries, title }: { entries: Entry[]; title: string }) {
  const [open, setOpen] = useState(false);
  const rows = entries.map((entry) => ({ Data: entry.date, Descrição: entry.description, Categoria: entry.category, Tipo: entry.type === "recebimento" ? "Recebimento" : "Pagamento", Método: entry.method, Destino: entry.destination, Valor: entry.amount }));
  async function exportFile(format: "pdf" | "excel") {
    const fileName = `le-jardin-${title}-${today()}`;
    if (format === "excel") {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [{ wch: 13 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Lançamentos");
      XLSX.writeFile(book, `${fileName}.xlsx`);
    } else {
      const { jsPDF } = await import("jspdf");
      const document = new jsPDF({ unit: "mm", format: "a4" });
      const titleLabel = title === "recebimentos" ? "Recebimentos" : title === "pagamentos" ? "Pagamentos" : "Movimentações";
      const receipts = entries.filter((entry) => entry.type === "recebimento").reduce((sum, entry) => sum + entry.amount, 0);
      const payments = entries.filter((entry) => entry.type === "pagamento").reduce((sum, entry) => sum + entry.amount, 0);
      const sortedDates = entries.map((entry) => entry.date).sort();
      const range = sortedDates.length ? `${formatDate(sortedDates[0])} a ${formatDate(sortedDates[sortedDates.length - 1])}` : "Sem lançamentos";
      const left = 17; const right = 193; const columns = { date: 17, description: 42, method: 108, in: 140, out: 167 };
      function reportHeader() {
        document.setTextColor(39, 53, 44); document.setFont("helvetica", "bold"); document.setFontSize(15); document.text("LE JARDIN", left, 18);
        document.setFont("helvetica", "normal"); document.setFontSize(7); document.setTextColor(112, 118, 110); document.text("CAFÉ & FLORES", left, 22.5);
        document.setFont("helvetica", "bold"); document.setTextColor(39, 53, 44); document.setFontSize(12); document.text("RELATÓRIO FINANCEIRO", right, 18, { align: "right" });
        document.setFont("helvetica", "normal"); document.setFontSize(8); document.setTextColor(112, 118, 110); document.text(`${titleLabel} | ${range}`, right, 22.5, { align: "right" });
        document.setDrawColor(78, 96, 68); document.setLineWidth(.55); document.line(left, 27, right, 27);
      }
      function tableHeader(y: number) {
        document.setFont("helvetica", "bold"); document.setFontSize(7); document.setTextColor(78, 96, 68);
        document.text("DATA", columns.date, y); document.text("DESCRIÇÃO", columns.description, y); document.text("MÉTODO / DESTINO", columns.method, y); document.text("ENTRADAS", columns.in + 19, y, { align: "right" }); document.text("SAÍDAS", columns.out + 19, y, { align: "right" });
        document.setDrawColor(80, 80, 80); document.setLineWidth(.25); document.line(left, y + 3, right, y + 3);
      }
      reportHeader();
      document.setFillColor(242, 244, 238); document.roundedRect(left, 33, right - left, 24, 2, 2, "F");
      document.setTextColor(112, 118, 110); document.setFont("helvetica", "bold"); document.setFontSize(7); document.text("ENTRADAS", left + 8, 40); document.text("SAÍDAS", left + 65, 40); document.text("SALDO DO PERÍODO", left + 122, 40);
      document.setTextColor(39, 53, 44); document.setFont("helvetica", "normal"); document.setFontSize(13); document.text(money.format(receipts), left + 8, 49); document.text(money.format(payments), left + 65, 49); document.text(money.format(receipts - payments), left + 122, 49);
      let y = 68; tableHeader(y); y += 10;
      entries.forEach((entry) => {
        const description = document.splitTextToSize(entry.description, 61) as string[];
        const height = Math.max(8, description.length * 4.2 + 3);
        if (y + height > 279) { document.addPage(); reportHeader(); y = 38; tableHeader(y); y += 10; }
        document.setFont("helvetica", "normal"); document.setFontSize(8); document.setTextColor(45, 50, 45);
        document.text(formatDate(entry.date), columns.date, y); document.text(description, columns.description, y); document.text(`${entry.method}\n${entry.destination}`, columns.method, y, { lineHeightFactor: 1.25 });
        if (entry.type === "recebimento") { document.setTextColor(54, 104, 58); document.text(money.format(entry.amount), columns.in + 19, y, { align: "right" }); } else { document.setTextColor(139, 82, 60); document.text(money.format(entry.amount), columns.out + 19, y, { align: "right" }); }
        document.setDrawColor(210, 210, 205); document.setLineWidth(.15); document.line(left, y + height - 2, right, y + height - 2); y += height;
      });
      if (y > 270) { document.addPage(); reportHeader(); y = 42; }
      document.setDrawColor(39, 53, 44); document.setLineWidth(.55); document.line(left, y + 1, right, y + 1);
      document.setFont("helvetica", "bold"); document.setFontSize(9); document.setTextColor(39, 53, 44); document.text("SALDO", columns.out + 19, y + 8, { align: "right" }); document.text(money.format(receipts - payments), right, y + 8, { align: "right" });
      const pages = document.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) { document.setPage(page); document.setFont("helvetica", "normal"); document.setFontSize(7); document.setTextColor(112, 118, 110); document.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} | Página ${page} de ${pages}`, right, 289, { align: "right" }); }
      document.save(`${fileName}.pdf`);
    }
    setOpen(false);
  }
  return <><button className="export" disabled={!entries.length} onClick={() => setOpen(true)}>⇩ Exportar</button>{open && <div className="modal-backdrop" role="presentation"><section className="modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title"><button className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar">×</button><p className="eyebrow">EXPORTAR RESULTADOS</p><h2 id="export-title">Escolha o formato</h2><p>Serão exportados somente os {entries.length} lançamentos exibidos pelos filtros atuais.</p><div className="export-options"><button onClick={() => void exportFile("pdf")}><strong>PDF</strong><span>Documento pronto para imprimir</span></button><button onClick={() => void exportFile("excel")}><strong>Excel</strong><span>Planilha editável (.xlsx)</span></button></div></section></div>}</>;
}

function EditDialog({ entry, unlocked, password, error, onPasswordChange, onVerify, onClose, onSave }: { entry: Entry; unlocked: boolean; password: string; error: boolean; onPasswordChange: (value: string) => void; onVerify: () => void; onClose: () => void; onSave: (entry: Entry) => void }) {
  const [draft, setDraft] = useState(entry);
  const methodDestination = (method: Method) => method === "Dinheiro" ? "Caixa" : "Banco";
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>{!unlocked ? <><p className="eyebrow">ÁREA RESTRITA</p><h2 id="edit-title">Senha de administrador</h2><p>Confirme a senha para editar este lançamento.</p><input autoFocus type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onVerify()} placeholder="Senha" />{error && <small className="error">Senha incorreta. Tente novamente.</small>}<button className="save modal-save" onClick={onVerify}>Continuar <span>→</span></button></> : <><p className="eyebrow">EDIÇÃO AUTORIZADA</p><h2 id="edit-title">Editar lançamento</h2><div className="edit-fields"><label>Data<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Descrição<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Valor<input inputMode="decimal" value={String(draft.amount).replace(".", ",")} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value.replace(",", ".")) || 0 })} /></label><label>Método<select value={draft.method} onChange={(event) => { const value = event.target.value as Method; setDraft({ ...draft, method: value, destination: value === "Outro" ? draft.destination : methodDestination(value) }); }}>{methods.map((value) => <option key={value}>{value}</option>)}</select></label>{draft.method === "Outro" && <label>Destino<select value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value as Destination })}><option>Caixa</option><option>Banco</option></select></label>}</div><button className="save modal-save" onClick={() => draft.description.trim() && draft.amount > 0 && onSave(draft)}>Salvar alterações <span>→</span></button></>}</section></div>;
}

function ManageEntryDialog({ entry, unlocked, password, error, onPasswordChange, onVerify, onClose, onSave, onDelete }: { entry: Entry; unlocked: boolean; password: string; error: boolean; onPasswordChange: (value: string) => void; onVerify: () => void; onClose: () => void; onSave: (entry: Entry) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState(entry);
  const [amountInput, setAmountInput] = useState(money.format(entry.amount));
  const destinationFor = (method: Method): Destination => method === "Dinheiro" ? "Caixa" : "Banco";
  function updateAmount(value: string) {
    const amount = Number(value.replace(/\D/g, "") || "0") / 100;
    setAmountInput(money.format(amount));
    setDraft({ ...draft, amount });
  }
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="manage-entry-title"><button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>{!unlocked ? <><p className="eyebrow">ÁREA RESTRITA</p><h2 id="manage-entry-title">Senha de administrador</h2><p>Confirme a senha para editar ou excluir este lançamento.</p><input autoFocus type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onVerify()} placeholder="Senha" />{error && <small className="error">Senha incorreta. Tente novamente.</small>}<button className="save modal-save" onClick={onVerify}>Continuar <span>→</span></button></> : <><p className="eyebrow">EDIÇÃO AUTORIZADA</p><h2 id="manage-entry-title">Editar lançamento</h2><div className="edit-fields"><label>Data<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Descrição<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Valor<input inputMode="numeric" value={amountInput} onChange={(event) => updateAmount(event.target.value)} /></label><label>Método<select value={draft.method} onChange={(event) => { const method = event.target.value as Method; setDraft({ ...draft, method, destination: method === "Outro" ? draft.destination : destinationFor(method) }); }}>{methods.map((method) => <option key={method}>{method}</option>)}</select></label>{draft.method === "Outro" && <label>Destino<select value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value as Destination })}><option>Caixa</option><option>Banco</option></select></label>}</div><div className="modal-actions"><button className="delete-entry" onClick={() => window.confirm("Excluir este lançamento? Esta ação não pode ser desfeita.") && onDelete(draft.id)}>Excluir lançamento</button><button className="save modal-save" onClick={() => draft.description.trim() && draft.amount >= 0 && onSave(draft)}>Salvar alterações <span>→</span></button></div></>}</section></div>;
}

function Charts({ entries }: { entries: Entry[] }) {
  const sales = entries.filter((entry) => entry.type === "recebimento");
  const dates = useMemo(() => periodDates(sales), [sales]);
  const series = methods.map((method) => ({ label: method, values: dates.map((date) => sales.filter((entry) => entry.date === date && entry.method === method).reduce((sum, entry) => sum + entry.amount, 0)) }));
  const totalValues = dates.map((date) => sales.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.amount, 0));
  return <><section className="list-top chart-heading"><div><h2>Vendas no tempo</h2><p>Acompanhe as entradas registradas no período escolhido.</p></div></section><section className="chart-card"><h2>Vendas por método</h2><LineChart dates={dates} series={series} emptyText="Ainda não há recebimentos neste período." /></section><section className="chart-card"><h2>Vendas totais</h2><LineChart dates={dates} series={[{ label: "Total", values: totalValues }]} emptyText="Ainda não há vendas neste período." /></section></>;
}

function periodDates(entries: Entry[]) { return [...new Set(entries.map((entry) => entry.date))].sort(); }
function LineChart({ dates, series, emptyText }: { dates: string[]; series: { label: string; values: number[] }[]; emptyText: string }) { const width = 720; const height = 250; const max = Math.max(...series.flatMap((item) => item.values), 0); if (!dates.length || max === 0) return <div className="chart-empty">{emptyText}</div>; const point = (value: number, index: number) => `${54 + (index * 620) / Math.max(dates.length - 1, 1)},${205 - (value / max) * 150}`; const colors = ["#4e6044", "#9b6e55", "#7d9274", "#927461"]; return <><div className="chart-legend">{series.filter((item) => item.values.some(Boolean)).map((item, index) => <span key={item.label}><i style={{ background: colors[index] }}></i>{item.label}</span>)}</div><svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de linha das vendas"><line x1="54" y1="205" x2="674" y2="205" /><line x1="54" y1="55" x2="54" y2="205" />{[0, .5, 1].map((ratio) => <text key={ratio} x="45" y={209 - ratio * 150} textAnchor="end">{money.format(max * ratio)}</text>)}{series.map((item, index) => item.values.some(Boolean) && <polyline key={item.label} points={item.values.map(point).join(" ")} fill="none" stroke={colors[index]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}{dates.map((date, index) => <text key={date} x={54 + (index * 620) / Math.max(dates.length - 1, 1)} y="230" textAnchor="middle">{formatDate(date)}</text>)}</svg></>; }
