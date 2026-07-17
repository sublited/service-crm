import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { email, appPassword } = await req.json();
  if (!email || !appPassword) {
    return NextResponse.json({ error: "Enter both the Gmail address and app password" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: appPassword },
    });

    await transporter.sendMail({
      from: `"Service CRM test" <${email}>`,
      to: email,
      subject: "Service CRM — test email",
      text: "If you're reading this, your Gmail connection is working. Quotes and invoices will now send from this address.",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Couldn't send — double check the address and app password." },
      { status: 400 }
    );
  }
}
