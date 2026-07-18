-- ============================================================================
-- Universal Service Business CRM — MVP schema
-- Every business table carries company_id, even though this MVP runs as a
-- single company. That makes multi-tenant RLS a policy-only change later:
-- no columns to add, no migrations to backfill.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- companies: one row today, many rows when this becomes multi-tenant
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  abn text,
  address text,
  phone text,
  email text,
  website text,
  gst_registered boolean default true,
  invoice_prefix text default 'INV-',
  invoice_next_number int default 1,
  quote_prefix text default 'QTE-',
  quote_next_number int default 1,
  invoice_footer text,
  payment_terms_days int default 14,
  bank_details text,
  payid text,
  google_review_link text,
  logo_url text,
  email_address text,
  email_app_password text,
  email_configured boolean default false,
  quote_email_subject text,
  quote_email_body text,
  invoice_email_subject text,
  invoice_email_body text,
  created_at timestamptz default now()
);

-- links a Supabase auth user to a company (future: multiple users per company)
create table company_users (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'owner', -- owner | staff (future)
  created_at timestamptz default now(),
  unique (company_id, user_id)
);

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  name text not null,
  company_name text,
  phone text,
  email text,
  address text,
  billing_address text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- services: the price list used by both quotes and invoices
-- ----------------------------------------------------------------------------
create table services (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  name text not null,
  category text,
  description text,
  default_price numeric(10,2) not null default 0,
  gst boolean default true,
  estimated_minutes int,
  colour text default '#6366f1',
  active boolean default true,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- quotes
-- ----------------------------------------------------------------------------
create type quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired');

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete cascade not null,
  quote_number text not null,
  status quote_status default 'draft',
  notes text,
  subtotal numeric(10,2) default 0,
  gst_total numeric(10,2) default 0,
  total numeric(10,2) default 0,
  issued_date date default current_date,
  expiry_date date,
  created_at timestamptz default now(),
  unique (company_id, quote_number)
);

create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes(id) on delete cascade not null,
  service_id uuid references services(id) on delete set null,
  description text not null,
  details text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  gst boolean default true,
  sort_order int default 0
);

-- ----------------------------------------------------------------------------
-- invoices (created from a customer directly, or converted from a quote)
-- ----------------------------------------------------------------------------
create type invoice_status as enum ('unpaid', 'part_paid', 'paid', 'overdue');

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete cascade not null,
  quote_id uuid references quotes(id) on delete set null,
  invoice_number text not null,
  status invoice_status default 'unpaid',
  notes text,
  subtotal numeric(10,2) default 0,
  gst_total numeric(10,2) default 0,
  total numeric(10,2) default 0,
  amount_paid numeric(10,2) default 0,
  issued_date date default current_date,
  due_date date,
  created_at timestamptz default now(),
  archived_at timestamptz,
  archived_reason text,
  archived_related_invoice_number text,
  archived_comment text,
  unique (company_id, invoice_number)
);

create table invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id) on delete cascade not null,
  service_id uuid references services(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  gst boolean default true,
  sort_order int default 0
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  invoice_id uuid references invoices(id) on delete cascade not null,
  amount numeric(10,2) not null,
  method text, -- cash | bank_transfer | payid | card | other
  paid_date date default current_date,
  notes text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- activity_log: generic/polymorphic so future features (jobs, reviews) reuse it
-- ----------------------------------------------------------------------------
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  entity_type text not null, -- 'customer' | 'quote' | 'invoice' | 'payment' ...
  entity_id uuid not null,
  action text not null,      -- 'created' | 'sent' | 'accepted' | 'paid' ...
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- indexes
-- ----------------------------------------------------------------------------
create index idx_customers_company on customers(company_id);
create index idx_services_company on services(company_id);
create index idx_quotes_company on quotes(company_id);
create index idx_quotes_customer on quotes(customer_id);
create index idx_invoices_company on invoices(company_id);
create index idx_invoices_customer on invoices(customer_id);
create index idx_invoice_items_invoice on invoice_items(invoice_id);
create index idx_quote_items_quote on quote_items(quote_id);
create index idx_invoices_archived on invoices(company_id, archived_at);
create index idx_activity_entity on activity_log(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- Row Level Security — written now, tightened later.
-- MVP policy: any authenticated user linked to a company (via company_users)
-- can read/write that company's rows. Add per-role checks when staff accounts
-- ship; nothing above needs to change, only these policies.
-- ----------------------------------------------------------------------------
alter table companies enable row level security;
alter table company_users enable row level security;
alter table customers enable row level security;
alter table services enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table activity_log enable row level security;

create or replace function user_company_ids()
returns setof uuid
language sql security definer stable
as $$
  select company_id from public.company_users where user_id = auth.uid();
$$;

create policy "company members can access their company" on companies
  for all using (id in (select user_company_ids()));

create policy "company members can access their link rows" on company_users
  for all using (user_id = auth.uid());

create policy "company members can access their customers" on customers
  for all using (company_id in (select user_company_ids()));

create policy "company members can access their services" on services
  for all using (company_id in (select user_company_ids()));

create policy "company members can access their quotes" on quotes
  for all using (company_id in (select user_company_ids()));

create policy "company members can access their quote items" on quote_items
  for all using (quote_id in (select id from quotes where company_id in (select user_company_ids())));

create policy "company members can access their invoices" on invoices
  for all using (company_id in (select user_company_ids()));

create policy "company members can access their invoice items" on invoice_items
  for all using (invoice_id in (select id from invoices where company_id in (select user_company_ids())));

create policy "company members can access their payments" on payments
  for all using (company_id in (select user_company_ids()));

create policy "company members can access their activity log" on activity_log
  for all using (company_id in (select user_company_ids()));

-- ----------------------------------------------------------------------------
-- Trigger: create a company + link row the first time a new user signs up.
-- Keeps signup -> usable dashboard to one step for the MVP.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
declare
  new_company_id uuid;
begin
  insert into public.companies (name, email)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'My Business'), new.email)
  returning id into new_company_id;

  insert into public.company_users (company_id, user_id, role)
  values (new_company_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Storage bucket for company logos. Public read (so PDFs/emails can embed
-- the image by URL), write restricted to members of the owning company via
-- a folder-per-company convention: logos/{company_id}/{filename}.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "company members can upload their own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select company_id::text from company_users where user_id = auth.uid())
  );

create policy "company members can replace their own logo"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select company_id::text from company_users where user_id = auth.uid())
  );

create policy "company members can delete their own logo"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select company_id::text from company_users where user_id = auth.uid())
  );
