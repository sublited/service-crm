"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Shell from "@/components/Shell";
import { createClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import clsx from "clsx";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-black/5 text-ink/60",
  sent: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

export default function QuotesPage() {
  const supabase = createClient();
  const pathname = usePathname();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("quotes")
      .select("*, customers(name, company_name, email, phone, address)")
      .order("created_at", { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const filtered = quotes.filter((q: any) => {
    if (!search.trim()) return true;
    const haystack = [
      q.quote_number,
      q.customers?.name,
      q.customers?.company_name,
      q.customers?.email,
      q.customers?.phone,
      q.customers?.address,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Quotes</h1>
        <Link href="/quotes/new" className="btn-primary">+ New quote</Link>
      </div>

      <input
        className="input mb-4 max-w-sm"
        placeholder="Search by quote #, customer, email, phone, address…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : !filtered.length ? (
          <p className="p-6 text-sm text-ink/50">No quotes here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink/50 border-b border-black/[0.06]">
                  <th className="px-5 py-3 font-medium">Quote</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q: any) => (
                  <tr key={q.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015]">
                    <td className="px-5 py-3">
                      <Link href={`/quotes/${q.id}`} className="font-medium hover:text-brand-600">{q.quote_number}</Link>
                    </td>
                    <td className="px-5 py-3 text-ink/70">{q.customers?.name}</td>
                    <td className="px-5 py-3">
                      <span className={clsx("text-xs px-2 py-1 rounded-full font-medium capitalize", STATUS_STYLE[q.status])}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">{formatMoney(Number(q.total))}</td>
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
