"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data: q } = await supabase.from("quotes").select("*").eq("id", params.id).single();
    setQuote(q);
    if (q) {
      const { data: its } = await supabase.from("quote_items").select("*").eq("quote_id", q.id).order("sort_order");
      setItems(its || []);
      const { data: cust } = await supabase.from("customers").select("*").eq("id", q.customer_id).single();
      setCustomer(cust);
      const { data: linkedInvoice } = await supabase.from("invoices").select("id").eq("quote_id", q.id).maybeSingle();
      setLinkedInvoiceId(linkedInvoice?.id || null);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function setStatus(status: string) {
    await supabase.from("quotes").update({ status }).eq("id", params.id);
    load();
  }

  async function sendEmail() {
    setSending(true);
    setMessage(null);
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "quote", id: params.id }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setMessage("Quote emailed to " + customer?.email);
      setStatus("sent");
    } else {
      setMessage("Error: " + (data.error || "could not send email"));
    }
  }

  async function convertToInvoice() {
    setConverting(true);
    const res = await fetch(`/api/quotes/${params.id}/convert`, { method: "POST" });
    const data = await res.json();
    setConverting(false);
    if (res.ok) router.push(`/invoices/${data.invoiceId}`);
    else setMessage("Error: " + (data.error || "could not convert"));
  }

  if (!quote) return <Shell><p className="text-sm text-ink/50">Loading…</p></Shell>;

  return (
    <Shell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/quotes" className="text-sm text-ink/50 hover:text-ink/80">← Quotes</Link>
          <h1 className="font-display text-2xl font-semibold mt-2">{quote.quote_number}</h1>
          <p className="text-sm text-ink/50">{customer?.name}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/pdf/quote/${quote.id}`} target="_blank" className="btn-secondary">Download PDF</a>
          <button onClick={sendEmail} disabled={sending || !customer?.email} className="btn-primary">
            {sending ? "Sending…" : "Email to customer"}
          </button>
        </div>
      </div>

      {message && <p className="text-sm mb-4 text-brand-600">{message}</p>}

      <div className="card p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink/50">Status:</span>
          <select value={quote.status} onChange={(e) => setStatus(e.target.value)} className="input !w-auto py-1.5">
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        {linkedInvoiceId ? (
          <Link href={`/invoices/${linkedInvoiceId}`} className="btn-secondary">View invoice →</Link>
        ) : (
          <button onClick={convertToInvoice} disabled={converting} className="btn-secondary">
            {converting ? "Converting…" : "Convert to invoice →"}
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
<table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink/50 border-b border-black/[0.06]">
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium text-right">Qty</th>
              <th className="px-5 py-3 font-medium text-right">Unit price</th>
              <th className="px-5 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-black/[0.04] last:border-0 align-top">
                <td className="px-5 py-3">
                  <p>{item.description}</p>
                  {item.details && (
                    <div className="rich-text text-xs text-ink/60 mt-1" dangerouslySetInnerHTML={{ __html: item.details }} />
                  )}
                </td>
                <td className="px-5 py-3 text-right">{item.quantity}</td>
                <td className="px-5 py-3 text-right">{formatMoney(Number(item.unit_price))}</td>
                <td className="px-5 py-3 text-right">{formatMoney(Number(item.quantity) * Number(item.unit_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="px-5 py-4 border-t border-black/[0.06] flex justify-end">
          <dl className="w-56 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink/50">Subtotal</dt><dd>{formatMoney(Number(quote.subtotal))}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">GST</dt><dd>{formatMoney(Number(quote.gst_total))}</dd></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-black/[0.06]"><dt>Total</dt><dd>{formatMoney(Number(quote.total))}</dd></div>
          </dl>
        </div>
      </div>

      {quote.notes && (
        <div className="card p-5 mt-6">
          <h2 className="text-sm font-semibold mb-2">Notes</h2>
          <p className="text-sm text-ink/70 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
    </Shell>
  );
}
