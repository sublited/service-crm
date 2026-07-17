import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: quote } = await supabase.from("quotes").select("*").eq("id", params.id).single();
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const { data: existing } = await supabase.from("invoices").select("id").eq("quote_id", quote.id).maybeSingle();
  if (existing) return NextResponse.json({ invoiceId: existing.id });

  const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");

  const { data: company } = await supabase
    .from("companies")
    .select("invoice_prefix, invoice_next_number, payment_terms_days")
    .eq("id", quote.company_id)
    .single();

  const invoiceNumber = `${company!.invoice_prefix}${String(company!.invoice_next_number).padStart(4, "0")}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (company!.payment_terms_days || 14));

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: quote.company_id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      invoice_number: invoiceNumber,
      notes: quote.notes,
      subtotal: quote.subtotal,
      gst_total: quote.gst_total,
      total: quote.total,
      due_date: dueDate.toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error || !invoice) return NextResponse.json({ error: error?.message || "Could not create invoice" }, { status: 500 });

  if (items?.length) {
    await supabase.from("invoice_items").insert(
      items.map((item) => ({
        invoice_id: invoice.id,
        service_id: item.service_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst: item.gst,
        sort_order: item.sort_order,
      }))
    );
  }

  await supabase
    .from("companies")
    .update({ invoice_next_number: company!.invoice_next_number + 1 })
    .eq("id", quote.company_id);

  return NextResponse.json({ invoiceId: invoice.id });
}
