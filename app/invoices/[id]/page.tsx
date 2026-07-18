"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { formatMoney, calcTotals } from "@/lib/money";
import LineItemsEditor, { LineItemDraft } from "@/components/LineItemsEditor";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<LineItemDraft[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [archiveReason, setArchiveReason] = useState<"duplicate" | "updated" | "other">("duplicate");
  const [archiveRelatedNumber, setArchiveRelatedNumber] = useState("");
  const [archiveComment, setArchiveComment] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [unarchiving, setUnarchiving] = useState(false);

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
      const { data: svc } = await supabase.from("services").select("*").eq("active", true).order("name");
      setServices(svc || []);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  // Default the payment field to the remaining balance so "Record payment"
  // works immediately for a full payment, instead of relying on the
  // placeholder (which isn't an actual value and made this look broken).
  useEffect(() => {
    if (invoice && !editing) {
      const balance = Number(invoice.total) - Number(invoice.amount_paid);
      if (balance > 0) setPaymentAmount(balance.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.amount_paid]);

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
    setPaymentError(null);
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Enter an amount greater than zero.");
      return;
    }
    setRecordingPayment(true);

    const { error: insertError } = await supabase.from("payments").insert({
      company_id: invoice.company_id,
      invoice_id: invoice.id,
      amount,
      method: paymentMethod,
    });

    if (insertError) {
      setRecordingPayment(false);
      setPaymentError(insertError.message);
      return;
    }

    const newAmountPaid = Number(invoice.amount_paid) + amount;
    const newStatus = newAmountPaid >= Number(invoice.total) ? "paid" : "part_paid";
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ amount_paid: newAmountPaid, status: newStatus })
      .eq("id", invoice.id);

    if (updateError) {
      setRecordingPayment(false);
      setPaymentError(updateError.message);
      return;
    }

    setRecordingPayment(false);
    load();
  }

  function startEditing() {
    setEditItems(
      items.map((it) => ({
        service_id: it.service_id,
        description: it.description,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        gst: it.gst,
      }))
    );
    setEditing(true);
  }

  async function saveEdit() {
    if (editItems.length === 0) {
      alert("An invoice needs at least one line item.");
      return;
    }
    setSavingEdit(true);
    const totals = calcTotals(editItems);

    await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);
    await supabase.from("invoice_items").insert(
      editItems.map((item, i) => ({
        invoice_id: invoice.id,
        service_id: item.service_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst: item.gst,
        sort_order: i,
      }))
    );

    // If this invoice was already partly/fully paid and the new total drops
    // below what's been paid, don't silently mark it wrong — recompute status
    // against the new total rather than assuming still-unpaid.
    const newStatus =
      Number(invoice.amount_paid) <= 0
        ? "unpaid"
        : Number(invoice.amount_paid) >= totals.total
        ? "paid"
        : "part_paid";

    await supabase
      .from("invoices")
      .update({ subtotal: totals.subtotal, gst_total: totals.gstTotal, total: totals.total, status: newStatus })
      .eq("id", invoice.id);

    setSavingEdit(false);
    setEditing(false);
    load();
  }

  async function submitArchive(e: React.FormEvent) {
    e.preventDefault();
    setArchiveError(null);

    if ((archiveReason === "duplicate" || archiveReason === "updated") && !archiveRelatedNumber.trim()) {
      setArchiveError(
        archiveReason === "duplicate"
          ? "Enter the invoice number this duplicates."
          : "Enter the invoice number that replaces this one."
      );
      return;
    }
    if (archiveReason === "other" && !archiveComment.trim()) {
      setArchiveError("Add a short comment explaining why this is being archived.");
      return;
    }

    setArchiving(true);
    const { error } = await supabase
      .from("invoices")
      .update({
        archived_at: new Date().toISOString(),
        archived_reason: archiveReason,
        archived_related_invoice_number: archiveReason === "other" ? null : archiveRelatedNumber.trim(),
        archived_comment: archiveReason === "other" ? archiveComment.trim() : null,
      })
      .eq("id", invoice.id);
    setArchiving(false);

    if (error) {
      setArchiveError(error.message);
      return;
    }
    setShowArchiveForm(false);
    load();
  }

  async function unarchive() {
    setUnarchiving(true);
    const { error } = await supabase
      .from("invoices")
      .update({ archived_at: null, archived_reason: null, archived_related_invoice_number: null, archived_comment: null })
      .eq("id", invoice.id);
    setUnarchiving(false);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  async function deleteInvoice() {
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This can't be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
    setDeleting(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.push("/invoices");
  }

  if (!invoice) return <Shell><p className="text-sm text-ink/50">Loading…</p></Shell>;

  const balance = Number(invoice.total) - Number(invoice.amount_paid);

  return (
    <Shell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link href="/invoices" className="text-sm text-ink/50 hover:text-ink/80">← Invoices</Link>
          <h1 className="font-display text-2xl font-semibold mt-2">{invoice.invoice_number}</h1>
          <p className="text-sm text-ink/50">{customer?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <a href={`/api/pdf/invoice/${invoice.id}`} target="_blank" className="btn-secondary">Download PDF</a>
          <button onClick={sendEmail} disabled={sending || !customer?.email} className="btn-primary">
            {sending ? "Sending…" : "Email to customer"}
          </button>
        </div>
      </div>

      {message && <p className="text-sm mb-4 text-brand-600">{message}</p>}

      {invoice.archived_at && (
        <div className="card p-4 mb-6 bg-amber-50/60 border-amber-200 flex items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium text-amber-800">Archived</p>
            <p className="text-amber-700/80">
              {invoice.archived_reason === "duplicate" && `Duplicate of invoice ${invoice.archived_related_invoice_number}`}
              {invoice.archived_reason === "updated" && `Replaced by invoice ${invoice.archived_related_invoice_number}`}
              {invoice.archived_reason === "other" && invoice.archived_comment}
            </p>
          </div>
          <button onClick={unarchive} disabled={unarchiving} className="btn-secondary shrink-0">
            {unarchiving ? "Restoring…" : "Unarchive"}
          </button>
        </div>
      )}

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

      {editing ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Edit line items</h2>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary" disabled={savingEdit}>Cancel</button>
              <button onClick={saveEdit} className="btn-primary" disabled={savingEdit}>
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
          <LineItemsEditor items={editItems} setItems={setEditItems} services={services} />
        </div>
      ) : (
        <div className="card overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06]">
            <span className="text-xs font-medium text-ink/50 uppercase tracking-wide">Line items</span>
            <button onClick={startEditing} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              Edit items
            </button>
          </div>
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
      )}

      <div className="card p-5 mb-6">
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
          <form onSubmit={recordPayment} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="label">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
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
        {paymentError && <p className="text-sm text-red-600 mt-2">{paymentError}</p>}
      </div>

      {!invoice.archived_at && (
        <div className="card p-5 mb-6">
          {showArchiveForm ? (
            <form onSubmit={submitArchive} className="space-y-3">
              <h2 className="text-sm font-semibold">Archive this invoice</h2>
              <div>
                <label className="label">Reason</label>
                <select
                  className="input"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value as typeof archiveReason)}
                >
                  <option value="duplicate">Duplicate invoice</option>
                  <option value="updated">Replaced by an updated invoice</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {(archiveReason === "duplicate" || archiveReason === "updated") && (
                <div>
                  <label className="label">
                    {archiveReason === "duplicate" ? "Duplicate of invoice number" : "Replaced by invoice number"}
                  </label>
                  <input
                    className="input"
                    value={archiveRelatedNumber}
                    onChange={(e) => setArchiveRelatedNumber(e.target.value)}
                    placeholder="INV-0042"
                  />
                </div>
              )}

              {archiveReason === "other" && (
                <div>
                  <label className="label">Comment</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={archiveComment}
                    onChange={(e) => setArchiveComment(e.target.value)}
                    placeholder="Why is this being archived?"
                  />
                </div>
              )}

              {archiveError && <p className="text-sm text-red-600">{archiveError}</p>}

              <div className="flex gap-2">
                <button className="btn-primary" disabled={archiving}>{archiving ? "Archiving…" : "Archive invoice"}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowArchiveForm(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowArchiveForm(true)} className="text-sm text-ink/60 hover:text-ink font-medium">
              Archive this invoice
            </button>
          )}
        </div>
      )}

      <div className="text-right">
        <button onClick={deleteInvoice} disabled={deleting} className="text-sm text-red-500 hover:text-red-700">
          {deleting ? "Deleting…" : "Delete this invoice"}
        </button>
      </div>
    </Shell>
  );
}
