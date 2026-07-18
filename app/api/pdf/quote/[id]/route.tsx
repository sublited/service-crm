import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabase } from "@/lib/supabaseServer";
import { BusinessDocPDF } from "@/lib/pdfDocument";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: quote } = await supabase.from("quotes").select("*").eq("id", params.id).single();
  if (!quote) return new Response("Not found", { status: 404 });

  const [{ data: items }, { data: customer }, { data: company }] = await Promise.all([
    supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order"),
    supabase.from("customers").select("*").eq("id", quote.customer_id).single(),
    supabase.from("companies").select("*").eq("id", quote.company_id).single(),
  ]);

  const pdf = await renderToBuffer(
    <BusinessDocPDF
      docType="QUOTE"
      theme="orange"
      docNumber={quote.quote_number}
      issuedDate={quote.issued_date}
      dueOrExpiryLabel="Expires"
      dueOrExpiryDate={quote.expiry_date}
      company={company}
      customer={customer}
      items={items || []}
      subtotal={Number(quote.subtotal)}
      gstTotal={Number(quote.gst_total)}
      total={Number(quote.total)}
      notes={quote.notes}
      showItemDetails
    />
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf"`,
    },
  });
}
