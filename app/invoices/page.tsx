"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import clsx from "clsx";

const STATUS_STYLE: Record<string, string> = {
  unpaid: "bg-black/5 text-ink/60",
  part_paid: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
};

type Filter = "all" | "unpaid" | "paid" | "archived";

function archiveReasonLabel(inv: any) {
  if (inv.archived_reason === "duplicate") return `Duplicate of ${inv.archived_related_invoice_number}`;
  if (inv.archived_reason === "updated") return `Replaced by ${inv.archived_related_invoice_number}`;
  if (inv.archived_reason === "other") return inv.archived_comment || "Other";
  return "";
}

export default function InvoicesPage() {
  const supabase = createClient();
  const pathname = usePathname();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*, customers(name, company_name)")
      .order("created_at", { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  }

  // Re-fetch whenever this route is navigated to, even if Next.js reused a
  // cached component instance (the App Router client cache can otherwise
  // show stale data when coming back via the nav or the browser's back button).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const unpaidFirst = (a: any, b: any) => {
    const weight = (s: string) => (s === "paid" ? 1 : 0);
    return weight(a.status) - weight(b.status);
  };

  const active = invoices.filter((inv) => !inv.archived_at);
  const archived = invoices.filter((inv) => !!inv.archived_at);

  const filtered = (
    filter === "archived"
      ? archived
      : active.filter((inv) => {
          if (filter === "unpaid") return inv.status !== "paid";
          if (filter === "paid") return inv.status === "paid";
          return true;
        })
  ).sort(filter === "archived" ? (a, b) => 0 : unpaidFirst);

  const counts = {
    all: active.length,
    unpaid: active.filter((i) => i.status !== "paid").length,
    paid: active.filter((i) => i.status === "paid").length,
    archived: archived.length,
  };

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Invoices</h1>
        <Link href="/invoices/new" className="btn-primary">+ New invoice</Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "unpaid", "paid", "archived"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "text-sm px-3 py-1.5 rounded-full font-medium capitalize transition-colors",
              filter === f ? "bg-ink text-white" : "bg-black/5 text-ink/60 hover:bg-black/10"
            )}
          >
            {f} <span className="opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : !filtered.length ? (
          <p className="p-6 text-sm text-ink/50">{filter === "archived" ? "No archived invoices." : "No invoices here."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink/50 border-b border-black/[0.06]">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  {filter === "archived" ? (
                    <th className="px-5 py-3 font-medium">Archive reason</th>
                  ) : (
                    <th className="px-5 py-3 font-medium">Status</th>
                  )}
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium text-right">{filter === "archived" ? "" : "Balance"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015]">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium hover:text-brand-600">{inv.invoice_number}</Link>
                    </td>
                    <td className="px-5 py-3 text-ink/70">{inv.customers?.name}</td>
                    {filter === "archived" ? (
                      <td className="px-5 py-3 text-ink/60">{archiveReasonLabel(inv)}</td>
                    ) : (
                      <td className="px-5 py-3">
                        <span className={clsx("text-xs px-2 py-1 rounded-full font-medium capitalize", STATUS_STYLE[inv.status])}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">{formatMoney(Number(inv.total))}</td>
                    <td className="px-5 py-3 text-right">
                      {filter === "archived" ? "" : formatMoney(Number(inv.total) - Number(inv.amount_paid))}
                    </td>
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
