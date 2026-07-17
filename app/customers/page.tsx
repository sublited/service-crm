"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";

type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", company_name: "", phone: "", email: "", address: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user!.id)
      .single();

    await supabase.from("customers").insert({ ...form, company_id: companyUser!.company_id });
    setForm({ name: "", company_name: "", phone: "", email: "", address: "" });
    setShowForm(false);
    setSaving(false);
    load();
  }

  const filtered = customers.filter((c) =>
    `${c.name} ${c.company_name ?? ""} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Customers</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addCustomer} className="card p-5 mb-6 grid grid-cols-2 gap-4">
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
          <div className="col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="col-span-2">
            <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save customer"}</button>
          </div>
        </form>
      )}

      <input
        className="input mb-4 max-w-sm"
        placeholder="Search customers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
<table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink/50 border-b border-black/[0.06]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-5 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium hover:text-brand-600">
                      {c.name}
                    </Link>
                    {c.company_name && <span className="text-ink/40"> · {c.company_name}</span>}
                  </td>
                  <td className="px-5 py-3 text-ink/70">{c.phone || "—"}</td>
                  <td className="px-5 py-3 text-ink/70">{c.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
