import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const columns = "id, entry_date, description, category, area, payment_method, destination, amount, type";
const unavailable = () => Response.json({ error: "A conexão com o Supabase não está configurada." }, { status: 503 });
const failure = (message: string) => Response.json({ error: message }, { status: 502 });

export async function GET() {
  if (!supabase) return unavailable();
  try {
    const { data, error } = await supabase.from("financial_entries").select(columns).order("entry_date", { ascending: false });
    return error ? failure(error.message) : Response.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("Não foi possível consultar o Supabase."); }
}

export async function POST(request: Request) {
  if (!supabase) return unavailable();
  const rows = await request.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length === 0) return Response.json({ error: "Lote inválido." }, { status: 400 });
  try {
    const { data, error } = await supabase.from("financial_entries").insert(rows).select(columns);
    return error ? failure(error.message) : Response.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("Não foi possível salvar o lançamento no Supabase."); }
}

export async function PATCH(request: Request) {
  if (!supabase) return unavailable();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Lançamento não informado." }, { status: 400 });
  const changes = await request.json().catch(() => null);
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return Response.json({ error: "Alterações inválidas." }, { status: 400 });
  try {
    const { data, error } = await supabase.from("financial_entries").update(changes).eq("id", id).select(columns).single();
    return error ? failure(error.message) : Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("Não foi possível editar o lançamento no Supabase."); }
}

export async function DELETE(request: Request) {
  if (!supabase) return unavailable();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Lançamento não informado." }, { status: 400 });
  try {
    const { error } = await supabase.from("financial_entries").delete().eq("id", id);
    return error ? failure(error.message) : Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("Não foi possível excluir o lançamento no Supabase."); }
}
