-- ============================================================================
-- Migration 002: logo upload, per-company email sending, rich text on
-- services, and a quote-only "details" field for showing service
-- descriptions (bullets/tables) on quotes.
-- Run this after schema.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Per-company email sending config. Each tenant sends from their own inbox —
-- nothing here is a shared/global credential. email_app_password is only
-- ever read server-side with the caller's own session (RLS already scopes a
-- company's row to that company's members), never exposed in a client bundle.
-- ----------------------------------------------------------------------------
alter table companies
  add column if not exists email_address text,
  add column if not exists email_app_password text,
  add column if not exists email_configured boolean default false;

-- ----------------------------------------------------------------------------
-- quote_items: a "details" field for the fuller service description
-- (rich text HTML — bullets, simple tables) shown under the line on quote
-- PDFs. Invoices intentionally stay lean, so this lives only on quote_items.
-- ----------------------------------------------------------------------------
alter table quote_items
  add column if not exists details text;

-- services.description already exists as `text` — it now stores rich text
-- HTML from the editor (bullets, tables) rather than plain text. No column
-- change needed, just a change in what the app writes/reads from it.

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

-- ----------------------------------------------------------------------------
-- Fix for the auth.users trigger: supabase_auth_admin's search_path doesn't
-- include `public`, so unqualified table names inside the trigger fail with
-- "relation does not exist". Re-create both functions with explicit schema
-- qualification. Safe to run even if you already patched this by hand.
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

create or replace function user_company_ids()
returns setof uuid
language sql security definer stable
as $$
  select company_id from public.company_users where user_id = auth.uid();
$$;
