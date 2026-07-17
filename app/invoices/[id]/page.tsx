"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [recordingPayment, setRecordingPayment] = useState(false);

  async function load() {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", params.id).single();
    setInvoice(inv);
    if (inv) {
      const { data: its } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("sort_order");
      setItems(its || []);
      const { data: cust } = await supabase.from("customers").select("*").eq("id", inv.customer_id).single();
      setCustomer(cust);
      const { data: pays } = await supabase.from("payments").select("*").eq("invoice_id", inv.id).order("paid_date");
      setPayments(pays || []);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function sendEmail() {
    setSending(true);
    setMessage(null);
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "invoice", id: params.id }),
    });
    const data = await res.json();
    setSending(false);
    setMessage(res.ok ? "Invoice emailed to " + customer?.email : "Error: " + (data.error || "could not send email"));
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    setRecordingPayment(true);

    await supabase.from("payments").insert({
      company_id: invoice.company_id,
      invoice_id: invoice.id,
      amount,
      method: paymentMethod,
    });

    const newAmountPaid = Number(invoice.amount_paid) + amount;
    const newStatus = newAmountPaid >= Number(invoice.total) ? "paid" : "part_paid";
    await supabase.from("invoices").update({ amount_paid: newAmountPaid, status: newStatus }).eq("id", invoice.id);

    setPaymentAmount("");
    setRecordingPayment(false);
    load();
  }

  if (!invoice) return <Shell><p className="text-sm text-ink/50">Loading…</p></Shell>;

  const balance = Number(invoice.total) - Number(invoice.amount_paid);

  return (
    <Shell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/invoices" className="text-sm text-ink/50 hover:text-ink/80">← Invoices</Link>
          <h1 className="font-display text-2xl font-semibold mt-2">{invoice.invoice_number}</h1>
          <p className="text-sm text-ink/50">{customer?.name}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/pdf/invoice/${invoice.id}`} target="_blank" className="btn-secondary">Download PDF</a>
          <button onClick={sendEmail} disabled={sending || !customer?.email} className="btn-primary">
            {sending ? "Sending…" : "Email to customer"}
          </button>
        </div>
      </div>

      {message && <p className="text-sm mb-4 text-brand-600">{message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-ink/50 mb-1">Status</p>
          <p className="font-medium capitalize">{invoice.status.replace("_", " ")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink/50 mb-1">Total</p>
          <p className="font-medium">{formatMoney(Number(invoice.total))}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink/50 mb-1">Balance due</p>
          <p className="font-medium">{formatMoney(balance)}</p>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
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
              <tr key={item.id} className="border-b border-black/[0.04] last:border-0">
                <td className="px-5 py-3">{item.description}</td>
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
            <div className="flex justify-between"><dt className="text-ink/50">Subtotal</dt><dd>{formatMoney(Number(invoice.subtotal))}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">GST</dt><dd>{formatMoney(Number(invoice.gst_total))}</dd></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-black/[0.06]"><dt>Total</dt><dd>{formatMoney(Number(invoice.total))}</dd></div>
          </dl>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Payments</h2>
        {payments.length > 0 && (
          <ul className="space-y-2 mb-4">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span className="text-ink/60 capitalize">{p.paid_date} · {p.method?.replace("_", " ")}</span>
                <span>{formatMoney(Number(p.amount))}</span>
              </li>
            ))}
          </ul>
        )}
        {balance > 0 && (
          <form onSubmit={recordPayment} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Amount</label>
              <input type="number" step="0.01" min="0" className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={String(balance)} />
            </div>
            <div className="flex-1">
              <label className="label">Method</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="payid">PayID</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button className="btn-primary" disabled={recordingPayment}>{recordingPayment ? "Saving…" : "Record payment"}</button>
          </form>
        )}
      </div>
    </Shell>
  );
}
