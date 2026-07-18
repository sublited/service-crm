# Service CRM — MVP

A minimal, mobile-first CRM for service businesses: customers, a service/price
list, quotes, invoices, payment tracking, themed PDF generation with your
logo, and emailing quotes/invoices from your own Gmail. Installable as a PWA
on iPhone. Built on the plan in your project doc.

Every table already carries `company_id` and Row Level Security is switched
on in the schema, so turning this into a true multi-tenant SaaS later is a
policy/UI change, not a rebuild — and email is already per-company, not a
shared credential.

## 1. Create a Supabase project

1. Go to supabase.com → New project.
2. In the SQL editor, paste and run everything in `supabase/schema.sql`.
   This creates every table, the `logos` storage bucket, enables RLS, and
   sets up the auto-provisioning trigger.
   - **Already have this app running from before?** Run
     `supabase/migration_002_logo_email_richtext.sql`,
     `supabase/migration_003_email_templates.sql`, then
     `supabase/migration_004_archive_invoices.sql` — all additive, none
     touch your existing data.
3. In Project Settings → API, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret, server-only)
4. In Authentication → Providers, make sure Email is enabled.

## 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in the three Supabase values. **Gmail is no longer configured here** —
each business connects their own Gmail account from inside the app (Settings
→ Email), once they're logged in. This is what makes it safe for multiple
tenants: nobody's quotes send through your inbox.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up (auto-creates your company), then in
**Settings**:
- Upload your **logo** — it appears on every quote/invoice PDF
- Connect **Email** — enter your Gmail address + an app password (Google
  Account → Security → 2-Step Verification → App passwords), then hit
  "Send test email & connect". Nothing sends to customers until this passes.
- Fill in business details, invoice numbering, GST, bank details

## 4. Deploy

Push to GitHub, import into Vercel, add the 3 Supabase env vars in Vercel's
Project Settings, deploy. On an iPhone, open the deployed URL in Safari →
Share → **Add to Home Screen** to install it as a PWA.

## What's new in this pass

- **Logo on documents** — Settings → Logo, stored in a per-company Supabase
  Storage folder (`logos/{company_id}/…`), shown top-left on every PDF.
- **Themed PDFs** — quotes render in a warm orange theme, invoices in strict
  black & white, so the two are unmistakable at a glance (and invoices print
  cleanly on a mono printer).
- **Rich service descriptions** — Services now has a formatting toolbar
  (bold/italic, bullet & numbered lists, simple tables) instead of a plain
  textarea. When you add a service to a **quote**, that formatted
  description carries over as an expandable "description details" block
  under the line item, and renders on the quote PDF exactly as formatted.
  Invoices stay lean — no item-level rich text there by design.
- **Per-company email** — Gmail credentials live on each company's own row
  (`companies.email_address` / `email_app_password`), set from Settings
  after login, verified with a one-click test send. `/api/send-email` reads
  the sending company's own credentials, never a shared one.
- **Mobile-first + PWA** — the app shell is now a bottom tab bar + slide-over
  "more" drawer on phones (sidebar remains on desktop), every data table
  scrolls horizontally instead of breaking layout, line-item entry is a
  stacked card list instead of a cramped table, and the app is installable
  from Safari's "Add to Home Screen" with a proper manifest, icons, and
  offline-capable service worker (via `next-pwa`).
  - Replace the placeholder icons in `public/icons/` with your real logo at
    192×192, 512×512, and a 512×512 "maskable" version, plus a 180×180
    `apple-touch-icon.png`, before shipping this to real users.

## What's new in this pass (archiving + quick customer entry)

- **Archive invoices instead of deleting** — from an invoice's detail page,
  "Archive this invoice" opens a small form requiring a reason: **Duplicate**
  (asks which invoice number it duplicates), **Replaced by an updated
  invoice** (asks for the new invoice's number), or **Other** (free-text
  comment). Delete is still there for genuine mistakes, but archiving is now
  the safer default — nothing is lost, and the reason is kept on record.
- **Archived tab** — Invoices list now has an "Archived" filter tab alongside
  All/Unpaid/Paid, showing the reason for each. Archived invoices are
  excluded from the Dashboard's outstanding-balance and revenue totals.
  "Unarchive" restores one to the normal list at any time.
- **Paste a customer in as JSON** — on the "+ New customer" form, "Paste
  from JSON" reveals a box where you can paste a JSON object (or use "Paste
  from clipboard") and click "Parse & fill form" — it matches common key
  names (`name`/`full_name`, `phone`/`mobile`, `email`, `address`, etc.) and
  fills the form fields, which you can still adjust before saving. Useful
  when you're copying a contact's details from an email, another CRM
  export, or a lead-capture form.

## What's new in this pass (bug fixes + requested features)

- **Fixed: "Record payment" doing nothing** — the amount field showed the
  remaining balance only as placeholder text, not an actual value, so
  clicking the button with an empty field silently no-opped. It now
  pre-fills with the balance and surfaces any Supabase error inline instead
  of failing silently.
- **Editable invoice & quote line items** — both detail pages now have an
  "Edit items" button: change quantities/prices, add more services, remove
  lines, and totals recalculate on save. This is what you use to adjust a
  quote-converted invoice before sending it.
- **Delete quotes and invoices** — a "Delete this quote/invoice" link at the
  bottom of each detail page, with a confirmation prompt.
- **Edit and delete customers** — the customer detail page now has Edit
  (inline form) and Delete (warns first if they have quotes/invoices, since
  deleting a customer deletes those too).
- **Edit and delete services** — same pattern on the Services page; deleting
  a service doesn't touch past quotes/invoices, since they keep their own
  copy of the description at the time they were created.
- **Editable email subject/body** — Settings → Email templates. Separate
  templates for quotes and invoices, with `{{customer_name}}`,
  `{{company_name}}`, `{{doc_number}}`, `{{total}}`, `{{due_date}}` /
  `{{expiry_date}}` variables. Leave blank to use the built-in default.
- **Fixed: stray characters (e.g. "&&&&") after names in PDFs** — the
  built-in PDF font only supports a limited character set; smart quotes,
  em-dashes, and similar characters from phone keyboards were rendering as
  garbage glyphs. Text going into PDFs is now sanitized first
  (`lib/pdfTextSanitize.ts`). Download filenames are also slugified to plain
  ASCII so nothing unusual shows up in the browser tab either.
- **Invoices sorted/filterable by paid status** — All / Unpaid / Paid tabs
  at the top of the Invoices list, unpaid ones sort first.
- **Fixed: pages showing stale data when navigating back** — Next.js's
  client-side router cache was serving cached data for the Dashboard,
  Customers, Services, and Quotes pages for up to ~30 seconds after leaving
  them. Server-rendered pages now force fresh data on every visit
  (`export const dynamic = "force-dynamic"`), and client-fetching pages
  refetch whenever the route is revisited.

## What's here vs. what's next

**Built:**
- Auth + auto-provisioned company on signup
- Customers (list, search, detail with quote/invoice history)
- Service & price list with rich-text descriptions (categorised, active/inactive)
- Quotes (build from services or custom lines, description details, orange
  themed PDF, email from your own Gmail, status tracking)
- Quote → Invoice conversion (no retyping)
- Invoices (build directly or from a quote, black & white PDF, email,
  payment recording, auto status: unpaid → part_paid → paid)
- Dashboard (customers, outstanding invoices, pending quotes, revenue this month)
- Settings: business details, logo, per-company email connection, invoice
  numbering/GST/payment terms, bank details
- Mobile-first responsive UI + installable PWA

**Deliberately not built yet, but the schema/routing already leaves room for:**
- Jobs, calendar, staff accounts, recurring invoices — `activity_log` is
  already a generic polymorphic table so these can log into it without a
  schema change
- Automatic review-request emails (the `google_review_link` column exists
  on `companies`, ready for a scheduled Edge Function, and email sending is
  already per-company so this "just works" once built)
- Reports/CSV export — the data model supports it, just needs query + UI
- Multi-user companies — `company_users` already supports many users per
  company; the signup trigger just doesn't invite anyone yet
- True offline queueing in the PWA — the service worker currently caches for
  faster loads/installability; queuing writes made while offline for later
  sync isn't implemented

## Notes on the money math

`lib/money.ts` assumes 10% Australian GST and calculates it per line item
(so you can mix GST and GST-free items on one invoice). All amounts are
stored as `numeric(10,2)` in Postgres to avoid floating-point drift.

## Notes on rich text → PDF

The Services rich text editor (Tiptap) outputs a constrained subset of HTML —
paragraphs, bold/italic, bullet/numbered lists, and simple tables.
`lib/htmlToPdf.tsx` converts exactly that subset into `@react-pdf/renderer`
elements. If you extend the editor with new formatting (headings, images,
etc.), extend that converter to match, or it'll silently fall back to plain
text for anything it doesn't recognise.
