import Shell from "@/components/Shell";
import { createServerSupabase } from "@/lib/supabaseServer";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import clsx from "clsx";

const STATUS_STYLE: Record<string, string> = {
  unpaid: "bg-black/5 text-ink/60",
  part_paid: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
};

export default async function InvoicesPage() {
  const supabase = createServerSupabase();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, customers(name, company_name)")
    .order("created_at", { ascending: false });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Invoices</h1>
        <Link href="/invoices/new" className="btn-primary">+ New invoice</Link>
      </div>

      <div className="card overflow-hidden">
        {!invoices?.length ? (
          <p className="p-6 text-sm text-ink/50">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
<table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink/50 border-b border-black/[0.06]">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-5 py-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium hover:text-brand-600">{inv.invoice_number}</Link>
                  </td>
                  <td className="px-5 py-3 text-ink/70">{inv.customers?.name}</td>
                  <td className="px-5 py-3">
                    <span className={clsx("text-xs px-2 py-1 rounded-full font-medium capitalize", STATUS_STYLE[inv.status])}>
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">{formatMoney(Number(inv.total))}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(Number(inv.total) - Number(inv.amount_paid))}</td>
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
