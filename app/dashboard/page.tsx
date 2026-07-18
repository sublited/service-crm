import Shell from "@/components/Shell";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getCurrentCompanyId } from "@/lib/currentCompany";
import { formatMoney } from "@/lib/money";
import Link from "next/link";

// Always fetch fresh from Supabase — without this, Next.js's client-side
// router cache can show stale data for ~30s when navigating back to this page.
export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function DashboardPage() {
  const companyId = await getCurrentCompanyId();
  const supabase = createServerSupabase();

  const [{ count: customerCount }, { data: outstandingInvoices }, { data: pendingQuotes }, { data: paidThisMonth }] =
    await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      supabase
        .from("invoices")
        .select("total, amount_paid")
        .eq("company_id", companyId)
        .in("status", ["unpaid", "part_paid", "overdue"]),
      supabase.from("quotes").select("id", { count: "exact" }).eq("company_id", companyId).eq("status", "sent"),
      supabase
        .from("invoices")
        .select("amount_paid, issued_date")
        .eq("company_id", companyId)
        .gte("issued_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    ]);

  const outstandingTotal = (outstandingInvoices || []).reduce(
    (sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)),
    0
  );
  const revenueThisMonth = (paidThisMonth || []).reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);

  const cards = [
    { label: "Customers", value: customerCount ?? 0, href: "/customers" },
    { label: "Outstanding invoices", value: formatMoney(outstandingTotal), href: "/invoices" },
    { label: "Pending quotes", value: pendingQuotes?.length ?? 0, href: "/quotes" },
    { label: "Revenue this month", value: formatMoney(revenueThisMonth), href: "/invoices" },
  ];

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 hover:border-brand-400/40 transition-colors">
            <p className="text-xs text-ink/50 mb-1">{c.label}</p>
            <p className="font-display text-xl font-semibold">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link href="/customers" className="btn-secondary justify-center py-4">+ New customer</Link>
        <Link href="/quotes/new" className="btn-secondary justify-center py-4">+ New quote</Link>
        <Link href="/invoices/new" className="btn-secondary justify-center py-4">+ New invoice</Link>
      </div>
    </Shell>
  );
}
