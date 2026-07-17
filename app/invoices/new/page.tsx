"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import LineItemsEditor, { LineItemDraft } from "@/components/LineItemsEditor";
import { calcTotals } from "@/lib/money";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState(searchParams.get("customer") || "");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("customers").select("id, name, company_name").order("name").then(({ data }) => setCustomers(data || []));
    supabase.from("services").select("*").eq("active", true).order("name").then(({ data }) => setServices(data || []));
  }, []);

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || items.length === 0) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id, companies(invoice_prefix, invoice_next_number, payment_terms_days)")
      .eq("user_id", user!.id)
      .single();

    const companyId = companyUser!.company_id;
    const company: any = (companyUser as any).companies;
    const invoiceNumber = `${company.invoice_prefix}${String(company.invoice_next_number).padStart(4, "0")}`;
    const totals = calcTotals(items);

    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + (company.payment_terms_days || 14));

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        notes,
        due_date: dueDate || defaultDue.toISOString().slice(0, 10),
        subtotal: totals.subtotal,
        gst_total: totals.gstTotal,
        total: totals.total,
      })
      .select()
      .single();

    if (error || !invoice) {
      setSaving(false);
      alert(error?.message || "Could not save invoice");
      return;
    }

    await supabase.from("invoice_items").insert(
      items.map((item, i) => ({
        invoice_id: invoice.id,
        service_id: item.service_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst: item.gst,
        sort_order: i,
      }))
    );

    await supabase.from("companies").update({ invoice_next_number: company.invoice_next_number + 1 }).eq("id", companyId);

    router.push(`/invoices/${invoice.id}`);
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-semibold mb-6">New invoice</h1>

      <form onSubmit={saveInvoice} className="space-y-6">
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
            <label className="label">Due date (defaults to your payment terms)</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes (shown on the invoice)</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <LineItemsEditor items={items} setItems={setItems} services={services} />

        <div className="flex justify-end gap-3">
          <button type="submit" className="btn-primary" disabled={saving || !customerId || items.length === 0}>
            {saving ? "Saving…" : "Save invoice"}
          </button>
        </div>
      </form>
    </Shell>
  );
}
