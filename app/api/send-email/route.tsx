import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabase } from "@/lib/supabaseServer";
import { BusinessDocPDF } from "@/lib/pdfDocument";

// Every company sends from its own inbox, configured in Settings → Email.
// This route never touches a shared/global mailbox — GMAIL_USER/PASSWORD
// env vars are gone. See /api/test-email for the "send yourself a test"
// flow used when a company sets this up.
function getTransporter(email: string, appPassword: string) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: appPassword },
  });
}

export async function POST(req: Request) {
  const { type, id } = await req.json();
  if (!["quote", "invoice"].includes(type) || !id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const table = type === "quote" ? "quotes" : "invoices";
  const itemsTable = type === "quote" ? "quote_items" : "invoice_items";
  const fkColumn = type === "quote" ? "quote_id" : "invoice_id";

  const { data: doc } = await supabase.from(table).select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: `${type} not found` }, { status: 404 });

  const [{ data: items }, { data: customer }, { data: company }] = await Promise.all([
    supabase.from(itemsTable).select("*").eq(fkColumn, doc.id).order("sort_order"),
    supabase.from("customers").select("*").eq("id", doc.customer_id).single(),
    supabase.from("companies").select("*").eq("id", doc.company_id).single(),
  ]);

  if (!company?.email_configured || !company?.email_address || !company?.email_app_password) {
    return NextResponse.json(
      { error: "Email isn't set up yet. Go to Settings → Email and connect your Gmail account first." },
      { status: 400 }
    );
  }

  if (!customer?.email) {
    return NextResponse.json({ error: "This customer has no email address on file" }, { status: 400 });
  }

  const docNumber = type === "quote" ? doc.quote_number : doc.invoice_number;

  const pdf = await renderToBuffer(
    <BusinessDocPDF
      docType={type === "quote" ? "QUOTE" : company?.gst_registered ? "TAX INVOICE" : "INVOICE"}
      theme={type === "quote" ? "orange" : "mono"}
      docNumber={docNumber}
      issuedDate={doc.issued_date}
      dueOrExpiryLabel={type === "quote" ? "Expires" : "Due"}
      dueOrExpiryDate={type === "quote" ? doc.expiry_date : doc.due_date}
      company={company}
      customer={customer}
      items={items || []}
      subtotal={Number(doc.subtotal)}
      gstTotal={Number(doc.gst_total)}
      total={Number(doc.total)}
      notes={doc.notes}
      showItemDetails={type === "quote"}
    />
  );

  const subject =
    type === "quote"
      ? `Quote ${docNumber} from ${company?.name}`
      : `Invoice ${docNumber} from ${company?.name}`;

  const bodyText =
    type === "quote"
      ? `Hi ${customer.name},\n\nPlease find attached quote ${docNumber} for your review.\n\nTotal: ${Number(doc.total).toFixed(2)} AUD\n\nLet us know if you have any questions.\n\n${company?.name}`
      : `Hi ${customer.name},\n\nPlease find attached invoice ${docNumber}.\n\nTotal due: ${Number(doc.total).toFixed(2)} AUD${doc.due_date ? `\nDue date: ${doc.due_date}` : ""}\n\nThanks for your business.\n\n${company?.name}`;

  try {
    const transporter = getTransporter(company.email_address, company.email_app_password);
    await transporter.sendMail({
      from: `"${company?.name || "Service CRM"}" <${company.email_address}>`,
      to: customer.email,
      subject,
      text: bodyText,
      attachments: [{ filename: `${docNumber}.pdf`, content: pdf }],
    });

    await supabase.from("activity_log").insert({
      company_id: doc.company_id,
      entity_type: type,
      entity_id: doc.id,
      action: "emailed",
      meta: { to: customer.email },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send email — check your Gmail address and app password in Settings." }, { status: 500 });
  }
}
