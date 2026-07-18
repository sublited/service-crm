"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import {
  QUOTE_EMAIL_VARIABLES,
  INVOICE_EMAIL_VARIABLES,
  DEFAULT_QUOTE_SUBJECT,
  DEFAULT_QUOTE_BODY,
  DEFAULT_INVOICE_SUBJECT,
  DEFAULT_INVOICE_BODY,
} from "@/lib/emailTemplate";

type Company = {
  id: string;
  name: string;
  abn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gst_registered: boolean;
  invoice_prefix: string;
  invoice_next_number: number;
  quote_prefix: string;
  quote_next_number: number;
  invoice_footer: string | null;
  payment_terms_days: number;
  bank_details: string | null;
  payid: string | null;
  google_review_link: string | null;
  logo_url: string | null;
  email_address: string | null;
  email_app_password: string | null;
  email_configured: boolean;
  quote_email_subject: string | null;
  quote_email_body: string | null;
  invoice_email_subject: string | null;
  invoice_email_body: string | null;
};

export default function SettingsPage() {
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestMessage, setEmailTestMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (!companyUser) return;
      const { data } = await supabase.from("companies").select("*").eq("id", companyUser.company_id).single();
      setCompany(data);
      setLoading(false);
    })();
  }, []);

  function set<K extends keyof Company>(key: K, value: Company[K]) {
    setCompany((c) => (c ? { ...c, [key]: value } : c));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    const { id, ...updates } = company;
    const { error } = await supabase.from("companies").update(updates).eq("id", id);
    setSaving(false);
    if (!error) setSaved(true);
    else alert(error.message);
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (PNG, JPG, or SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo must be under 2MB.");
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `${company.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingLogo(false);
      alert(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path);
    // cache-bust so the new logo shows immediately if the filename is reused
    const logoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("companies").update({ logo_url: logoUrl }).eq("id", company.id);
    set("logo_url", logoUrl);
    setUploadingLogo(false);
  }

  async function sendTestEmail() {
    if (!company?.email_address || !company?.email_app_password) return;
    setTestingEmail(true);
    setEmailTestMessage(null);

    const res = await fetch("/api/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: company.email_address, appPassword: company.email_app_password }),
    });
    const data = await res.json();
    setTestingEmail(false);

    if (res.ok) {
      setEmailTestMessage({ ok: true, text: "Test email sent — check your inbox. Saving your email settings…" });
      await supabase
        .from("companies")
        .update({
          email_address: company.email_address,
          email_app_password: company.email_app_password,
          email_configured: true,
        })
        .eq("id", company.id);
      set("email_configured", true);
    } else {
      setEmailTestMessage({ ok: false, text: data.error || "Could not send test email." });
    }
  }

  if (loading || !company) {
    return (
      <Shell>
        <p className="text-sm text-ink/50">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl font-semibold mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        <section className="card p-5">
          <h2 className="text-sm font-semibold mb-4">Logo</h2>
          <p className="text-xs text-ink/50 mb-4">Appears on every quote and invoice PDF. PNG or JPG, under 2MB.</p>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border border-dashed border-black/15 flex items-center justify-center overflow-hidden bg-black/[0.02]">
              {company.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo_url} alt="Business logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-ink/30">No logo</span>
              )}
            </div>
            <div>
              <label className="btn-secondary cursor-pointer inline-flex">
                {uploadingLogo ? "Uploading…" : company.logo_url ? "Replace logo" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} disabled={uploadingLogo} />
              </label>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold mb-1">Email — send from your own inbox</h2>
          <p className="text-xs text-ink/50 mb-4">
            Quotes and invoices are emailed from your business's own Gmail account, not a shared address.
            {company.email_configured && <span className="text-brand-600 font-medium"> Connected as {company.email_address}.</span>}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Gmail address</label>
              <input
                type="email"
                className="input"
                value={company.email_address || ""}
                onChange={(e) => set("email_address", e.target.value)}
                placeholder="you@yourbusiness.com"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Gmail app password</label>
              <input
                type="password"
                className="input"
                value={company.email_app_password || ""}
                onChange={(e) => set("email_app_password", e.target.value)}
                placeholder="16-character app password"
              />
              <p className="text-xs text-ink/40 mt-1">
                Not your Gmail password. Create one at Google Account → Security → 2-Step Verification → App passwords.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={testingEmail || !company.email_address || !company.email_app_password}
              className="btn-secondary"
            >
              {testingEmail ? "Sending test…" : "Send test email & connect"}
            </button>
            {emailTestMessage && (
              <span className={`text-sm ${emailTestMessage.ok ? "text-brand-600" : "text-red-600"}`}>{emailTestMessage.text}</span>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold mb-1">Email templates</h2>
          <p className="text-xs text-ink/50 mb-4">
            Customize what customers see. Use the variables below anywhere in the subject or body — they'll be
            filled in automatically when a quote or invoice is sent.
          </p>

          <div className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">Quote email</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Subject</label>
                <input
                  className="input"
                  value={company.quote_email_subject ?? ""}
                  onChange={(e) => set("quote_email_subject", e.target.value)}
                  placeholder={DEFAULT_QUOTE_SUBJECT}
                />
              </div>
              <div>
                <label className="label">Body</label>
                <textarea
                  className="input font-mono text-xs"
                  rows={7}
                  value={company.quote_email_body ?? ""}
                  onChange={(e) => set("quote_email_body", e.target.value)}
                  placeholder={DEFAULT_QUOTE_BODY}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUOTE_EMAIL_VARIABLES.map((v) => (
                  <code key={v.key} title={v.label} className="text-[11px] bg-black/[0.04] text-ink/60 px-1.5 py-0.5 rounded">
                    {"{{" + v.key + "}}"}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">Invoice email</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Subject</label>
                <input
                  className="input"
                  value={company.invoice_email_subject ?? ""}
                  onChange={(e) => set("invoice_email_subject", e.target.value)}
                  placeholder={DEFAULT_INVOICE_SUBJECT}
                />
              </div>
              <div>
                <label className="label">Body</label>
                <textarea
                  className="input font-mono text-xs"
                  rows={7}
                  value={company.invoice_email_body ?? ""}
                  onChange={(e) => set("invoice_email_body", e.target.value)}
                  placeholder={DEFAULT_INVOICE_BODY}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INVOICE_EMAIL_VARIABLES.map((v) => (
                  <code key={v.key} title={v.label} className="text-[11px] bg-black/[0.04] text-ink/60 px-1.5 py-0.5 rounded">
                    {"{{" + v.key + "}}"}
                  </code>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-ink/40 mt-4">Leave either blank to use the default shown as placeholder text. Saved with the button at the bottom of this page.</p>
        </section>

        <form onSubmit={save} className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold mb-4">Business details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Business name</label>
                <input className="input" value={company.name || ""} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="label">ABN</label>
                <input className="input" value={company.abn || ""} onChange={(e) => set("abn", e.target.value)} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={company.phone || ""} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <label className="label">Public contact email</label>
                <input type="email" className="input" value={company.email || ""} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="input" value={company.website || ""} onChange={(e) => set("website", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input className="input" value={company.address || ""} onChange={(e) => set("address", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold mb-4">Quotes & invoices</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quote number prefix</label>
                <input className="input" value={company.quote_prefix || ""} onChange={(e) => set("quote_prefix", e.target.value)} />
              </div>
              <div>
                <label className="label">Next quote number</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={company.quote_next_number}
                  onChange={(e) => set("quote_next_number", parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="label">Invoice number prefix</label>
                <input className="input" value={company.invoice_prefix || ""} onChange={(e) => set("invoice_prefix", e.target.value)} />
              </div>
              <div>
                <label className="label">Next invoice number</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={company.invoice_next_number}
                  onChange={(e) => set("invoice_next_number", parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="label">Payment terms (days)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={company.payment_terms_days}
                  onChange={(e) => set("payment_terms_days", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input
                  id="gst_registered"
                  type="checkbox"
                  checked={company.gst_registered}
                  onChange={(e) => set("gst_registered", e.target.checked)}
                  className="h-4 w-4 rounded border-black/20"
                />
                <label htmlFor="gst_registered" className="text-sm">GST registered</label>
              </div>
              <div className="col-span-2">
                <label className="label">Invoice footer (shown on every PDF)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={company.invoice_footer || ""}
                  onChange={(e) => set("invoice_footer", e.target.value)}
                  placeholder="Thanks for your business!"
                />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold mb-4">Payment details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Bank details (shown on invoices)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={company.bank_details || ""}
                  onChange={(e) => set("bank_details", e.target.value)}
                  placeholder="BSB: 000-000  Account: 00000000"
                />
              </div>
              <div>
                <label className="label">PayID</label>
                <input className="input" value={company.payid || ""} onChange={(e) => set("payid", e.target.value)} />
              </div>
              <div>
                <label className="label">Google review link</label>
                <input
                  className="input"
                  value={company.google_review_link || ""}
                  onChange={(e) => set("google_review_link", e.target.value)}
                  placeholder="https://g.page/r/…"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
            {saved && <span className="text-sm text-brand-600">Saved</span>}
          </div>
        </form>
      </div>
    </Shell>
  );
}
