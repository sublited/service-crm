import Shell from "@/components/Shell";
import { createServerSupabase } from "@/lib/supabaseServer";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import clsx from "clsx";

// Always fetch fresh from Supabase — without this, Next.js's client-side
// router cache can show stale data for ~30s when navigating back to this page.
export const dynamic = "force-dynamic";
export const revalidate = 0;


const STATUS_STYLE: Record<string, string> = {
  draft: "bg-black/5 text-ink/60",
  sent: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

export default async function QuotesPage() {
  const supabase = createServerSupabase();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*, customers(name, company_name)")
    .order("created_at", { ascending: false });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Quotes</h1>
        <Link href="/quotes/new" className="btn-primary">+ New quote</Link>
      </div>

      <div className="card overflow-hidden">
        {!quotes?.length ? (
          <p className="p-6 text-sm text-ink/50">No quotes yet.</p>
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
              {quotes.map((q: any) => (
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
