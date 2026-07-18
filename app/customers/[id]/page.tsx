"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";
import Link from "next/link";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", company_name: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data: cust } = await supabase.from("customers").select("*").eq("id", params.id).single();
    setCustomer(cust);
    if (cust) {
      setForm({
        name: cust.name || "",
        company_name: cust.company_name || "",
        phone: cust.phone || "",
        email: cust.email || "",
        address: cust.address || "",
      });
      const [{ data: q }, { data: inv }] = await Promise.all([
        supabase.from("quotes").select("*").eq("customer_id", params.id).order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("*")
          .eq("customer_id", params.id)
          .is("archived_at", null)
          .order("created_at", { ascending: false }),
      ]);
      setQuotes(q || []);
      setInvoices(inv || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("customers").update(form).eq("id", params.id);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEditing(false);
    load();
  }

  async function deleteCustomer() {
    const hasHistory = quotes.length > 0 || invoices.length > 0;
    const message = hasHistory
      ? `Delete ${customer.name}? This also permanently deletes their ${quotes.length} quote(s) and ${invoices.length} invoice(s). This can't be undone.`
      : `Delete ${customer.name}? This can't be undone.`;
    if (!confirm(message)) return;

    setDeleting(true);
    const { error } = await supabase.from("customers").delete().eq("id", params.id);
    setDeleting(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.push("/customers");
  }

  if (loading) return <Shell><p className="text-sm text-ink/50">Loading…</p></Shell>;
  if (!customer) return <Shell><p className="text-sm text-ink/50">Customer not found.</p></Shell>;

  return (
    <Shell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-ink/50 hover:text-ink/80">← Customers</Link>
          <h1 className="font-display text-2xl font-semibold mt-2">{customer.name}</h1>
          {customer.company_name && <p className="text-ink/50 text-sm">{customer.company_name}</p>}
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-secondary">Edit</button>
            <button onClick={deleteCustomer} disabled={deleting} className="text-sm text-red-500 hover:text-red-700 px-3">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5">
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-3">
              <h2 className="text-sm font-semibold mb-1">Edit contact details</h2>
              <div>
                <label className="label">Name *</label>
                <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Company (optional)</label>
                <input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-1">
                <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="text-sm font-semibold mb-3">Contact details</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink/50">Phone</dt><dd>{customer.phone || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">Email</dt><dd>{customer.email || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">Address</dt><dd className="text-right">{customer.address || "—"}</dd></div>
              </dl>
              <div className="flex gap-2 mt-4">
                <Link href={`/quotes/new?customer=${customer.id}`} className="btn-secondary flex-1 justify-center">New quote</Link>
                <Link href={`/invoices/new?customer=${customer.id}`} className="btn-secondary flex-1 justify-center">New invoice</Link>
              </div>
            </>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Quotes</h2>
          {!quotes.length ? (
            <p className="text-sm text-ink/50">No quotes yet.</p>
          ) : (
            <ul className="space-y-2">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/quotes/${q.id}`} className="flex justify-between text-sm hover:text-brand-600">
                    <span>{q.quote_number} · <span className="capitalize text-ink/50">{q.status}</span></span>
                    <span>{formatMoney(Number(q.total))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5 md:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Invoices</h2>
          {!invoices.length ? (
            <p className="text-sm text-ink/50">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex justify-between text-sm hover:text-brand-600">
                    <span>{inv.invoice_number} · <span className="capitalize text-ink/50">{inv.status.replace("_", " ")}</span></span>
                    <span>{formatMoney(Number(inv.total))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}
