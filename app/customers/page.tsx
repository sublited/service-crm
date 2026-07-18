"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { parseCustomerJson } from "@/lib/parseCustomerJson";

type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

const EMPTY_FORM = { name: "", company_name: "", phone: "", email: "", address: "" };

export default function CustomersPage() {
  const supabase = createClient();
  const pathname = usePathname();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
    setForm(EMPTY_FORM);
    setShowForm(false);
    setShowPaste(false);
    setPasteText("");
    setSaving(false);
    load();
  }

  function applyPastedJson() {
    setPasteError(null);
    const result = parseCustomerJson(pasteText);
    if (!result.ok) {
      setPasteError(result.error);
      return;
    }
    setForm(result.data);
    setShowPaste(false);
    setPasteText("");
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setPasteText(text);
    } catch {
      setPasteError("Couldn't read the clipboard automatically — paste into the box manually (Ctrl/Cmd+V).");
    }
  }

  const filtered = customers.filter((c) =>
    `${c.name} ${c.company_name ?? ""} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Customers</h1>
        <button
          className="btn-primary"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setShowPaste(false);
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Cancel" : "+ New customer"}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">New customer</p>
            <button
              type="button"
              onClick={() => setShowPaste((s) => !s)}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              {showPaste ? "Hide paste box" : "Paste from JSON"}
            </button>
          </div>

          {showPaste && (
            <div className="mb-4 p-3 rounded-lg bg-black/[0.02] border border-black/[0.06]">
              <p className="text-xs text-ink/50 mb-2">
                Paste a JSON object with the customer's details — e.g.{" "}
                <code className="bg-black/[0.05] px-1 rounded">{`{"name":"Jane Smith","email":"jane@example.com","phone":"0412 345 678"}`}</code>
                . Fields are matched by common name/email/phone/address key names.
              </p>
              <textarea
                className="input font-mono text-xs"
                rows={4}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='{"name": "Jane Smith", "email": "jane@example.com", "phone": "0412 345 678", "address": "12 Smith St"}'
              />
              {pasteError && <p className="text-sm text-red-600 mt-2">{pasteError}</p>}
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={pasteFromClipboard} className="btn-secondary text-xs px-3 py-1.5">
                  Paste from clipboard
                </button>
                <button type="button" onClick={applyPastedJson} className="btn-primary text-xs px-3 py-1.5" disabled={!pasteText.trim()}>
                  Parse & fill form
                </button>
              </div>
            </div>
          )}

          <form onSubmit={addCustomer} className="grid grid-cols-2 gap-4">
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
        </div>
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
