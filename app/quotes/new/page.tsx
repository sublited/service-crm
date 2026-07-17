"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import LineItemsEditor, { LineItemDraft } from "@/components/LineItemsEditor";
import { calcTotals } from "@/lib/money";

export default function NewQuotePage() {
  return (
    <Suspense fallback={null}>
      <NewQuoteForm />
    </Suspense>
  );
}

function NewQuoteForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState(searchParams.get("customer") || "");
  const [notes, setNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("customers").select("id, name, company_name").order("name").then(({ data }) => setCustomers(data || []));
    supabase.from("services").select("*").eq("active", true).order("name").then(({ data }) => setServices(data || []));
  }, []);

  async function saveQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || items.length === 0) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id, companies(quote_prefix, quote_next_number)")
      .eq("user_id", user!.id)
      .single();

    const companyId = companyUser!.company_id;
    const company: any = (companyUser as any).companies;
    const quoteNumber = `${company.quote_prefix}${String(company.quote_next_number).padStart(4, "0")}`;
    const totals = calcTotals(items);

    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        company_id: companyId,
        customer_id: customerId,
        quote_number: quoteNumber,
        notes,
        expiry_date: expiryDate || null,
        subtotal: totals.subtotal,
        gst_total: totals.gstTotal,
        total: totals.total,
      })
      .select()
      .single();

    if (error || !quote) {
      setSaving(false);
      alert(error?.message || "Could not save quote");
      return;
    }

    await supabase.from("quote_items").insert(
      items.map((item, i) => ({
        quote_id: quote.id,
        service_id: item.service_id,
        description: item.description,
        details: item.details || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst: item.gst,
        sort_order: i,
      }))
    );

    await supabase.from("companies").update({ quote_next_number: company.quote_next_number + 1 }).eq("id", companyId);

    router.push(`/quotes/${quote.id}`);
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-semibold mb-6">New quote</h1>

      <form onSubmit={saveQuote} className="space-y-6">
        <div className="card p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer *</label>
            <select required className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Expiry date</label>
            <input type="date" className="input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes (shown on the quote)</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <LineItemsEditor items={items} setItems={setItems} services={services} showDetails />

        <div className="flex justify-end gap-3">
          <button type="submit" className="btn-primary" disabled={saving || !customerId || items.length === 0}>
            {saving ? "Saving…" : "Save quote"}
          </button>
        </div>
      </form>
    </Shell>
  );
}
