import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabase } from "@/lib/supabaseServer";
import { BusinessDocPDF } from "@/lib/pdfDocument";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", params.id).single();
  if (!invoice) return new Response("Not found", { status: 404 });

  const [{ data: items }, { data: customer }, { data: company }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id).order("sort_order"),
    supabase.from("customers").select("*").eq("id", invoice.customer_id).single(),
    supabase.from("companies").select("*").eq("id", invoice.company_id).single(),
  ]);

  const pdf = await renderToBuffer(
    <BusinessDocPDF
      docType={company?.gst_registered ? "TAX INVOICE" : "INVOICE"}
      theme="mono"
      docNumber={invoice.invoice_number}
      issuedDate={invoice.issued_date}
      dueOrExpiryLabel="Due"
      dueOrExpiryDate={invoice.due_date}
      company={company}
      customer={customer}
      items={items || []}
      subtotal={Number(invoice.subtotal)}
      gstTotal={Number(invoice.gst_total)}
      total={Number(invoice.total)}
      notes={invoice.notes}
    />
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf"`,
    },
  });
}
