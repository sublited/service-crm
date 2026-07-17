import Shell from "@/components/Shell";
import { createServerSupabase } from "@/lib/supabaseServer";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", params.id).single();
  if (!customer) notFound();

  const [{ data: quotes }, { data: invoices }] = await Promise.all([
    supabase.from("quotes").select("*").eq("customer_id", params.id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("customer_id", params.id).order("created_at", { ascending: false }),
  ]);

  return (
    <Shell>
      <div className="mb-6">
        <Link href="/customers" className="text-sm text-ink/50 hover:text-ink/80">← Customers</Link>
        <h1 className="font-display text-2xl font-semibold mt-2">{customer.name}</h1>
        {customer.company_name && <p className="text-ink/50 text-sm">{customer.company_name}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Contact details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink/50">Phone</dt><dd>{customer.phone || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Email</dt><dd>{customer.email || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Address</dt><dd className="text-right">{customer.address || "—"}</dd></div>
          </dl>
          <div className="flex gap-2 mt-4">
            <Link href={`/quotes/new?customer=${customer.id}`} className="btn-secondary flex-1 justify-center">New quote</Link>
            <Link href={`/invoices/new?customer=${customer.id}`} className="btn-secondary flex-1 justify-center">New invoice</Link>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Quotes</h2>
          {!quotes?.length ? (
            <p className="text-sm text-ink/50">No quotes yet.</p>
          ) : (
            <ul className="space-y-2">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/quotes/${q.id}`} className="flex justify-between text-sm hover:text-brand-600">
                    <span>{q.quote_number} · <span className="capitalize text-ink/50">{q.status}</span></span>
                    <span>{formatMoney(Number(q.total))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5 md:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Invoices</h2>
          {!invoices?.length ? (
            <p className="text-sm text-ink/50">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex justify-between text-sm hover:text-brand-600">
                    <span>{inv.invoice_number} · <span className="capitalize text-ink/50">{inv.status.replace("_", " ")}</span></span>
                    <span>{formatMoney(Number(inv.total))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}
