"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";
import RichTextEditor from "@/components/RichTextEditor";

type Service = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  default_price: number;
  gst: boolean;
  active: boolean;
};

const CATEGORY_SUGGESTIONS = ["Residential", "Commercial", "End of Lease", "Add-on"];
const EMPTY_FORM = { name: "", category: "", description: "", default_price: "", gst: true };

export default function ServicesPage() {
  const supabase = createClient();
  const pathname = usePathname();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").order("category").order("name");
    setServices(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function openNewForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(service: Service) {
    setForm({
      name: service.name,
      category: service.category || "",
      description: service.description || "",
      default_price: String(service.default_price),
      gst: service.gst,
    });
    setEditingId(service.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveService(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      await supabase
        .from("services")
        .update({ ...form, default_price: parseFloat(form.default_price || "0") })
        .eq("id", editingId);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user!.id)
        .single();

      await supabase.from("services").insert({
        ...form,
        default_price: parseFloat(form.default_price || "0"),
        company_id: companyUser!.company_id,
      });
    }

    setSaving(false);
    closeForm();
    load();
  }

  async function toggleActive(service: Service) {
    await supabase.from("services").update({ active: !service.active }).eq("id", service.id);
    load();
  }

  async function deleteService(service: Service) {
    if (!confirm(`Delete "${service.name}"? Quotes and invoices that already used it keep their own copy of the description, so nothing on past documents changes.`)) return;
    setDeletingId(service.id);
    const { error } = await supabase.from("services").delete().eq("id", service.id);
    setDeletingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const key = s.category || "Uncategorised";
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Services & pricing</h1>
        <button className="btn-primary" onClick={() => (showForm ? closeForm() : openNewForm())}>
          {showForm ? "Cancel" : "+ New service"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveService} className="card p-5 mb-6 grid grid-cols-2 gap-4">
          {editingId && <p className="col-span-2 text-xs font-medium text-brand-600">Editing service</p>}
          <div>
            <label className="label">Service name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Deep Clean" />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              list="category-suggestions"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Residential"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Default price (AUD) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.default_price}
              onChange={(e) => setForm({ ...form, default_price: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <input
              id="gst"
              type="checkbox"
              checked={form.gst}
              onChange={(e) => setForm({ ...form, gst: e.target.checked })}
              className="h-4 w-4 rounded border-black/20"
            />
            <label htmlFor="gst" className="text-sm">GST applies</label>
          </div>
          <div className="col-span-2">
            <label className="label">Description (shown to customers on quotes — supports bullet points and simple tables)</label>
            <RichTextEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })} />
          </div>
          <div className="col-span-2 flex gap-2">
            <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Save service"}</button>
            <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-ink/50">No services yet — add your price list to start building quotes and invoices faster.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-black/[0.06] bg-black/[0.015]">
                <h2 className="text-sm font-semibold">{category}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id} className="border-b border-black/[0.04] last:border-0">
                        <td className="px-5 py-3">
                          <p className={s.active ? "font-medium" : "font-medium text-ink/40 line-through"}>{s.name}</p>
                          {s.description && (
                            <div
                              className="rich-text text-xs text-ink/50 mt-1"
                              dangerouslySetInnerHTML={{ __html: s.description }}
                            />
                          )}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {formatMoney(Number(s.default_price))}
                          {s.gst && <span className="text-xs text-ink/40"> +GST</span>}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openEditForm(s)} className="text-xs text-ink/40 hover:text-ink/70 mr-3">
                            Edit
                          </button>
                          <button onClick={() => toggleActive(s)} className="text-xs text-ink/40 hover:text-ink/70 mr-3">
                            {s.active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteService(s)}
                            disabled={deletingId === s.id}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            {deletingId === s.id ? "Deleting…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
