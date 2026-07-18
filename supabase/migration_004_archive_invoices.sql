-- ============================================================================
-- Migration 004: archive invoices instead of only deleting them. Archiving
-- requires a reason, and (for duplicate/updated) the related invoice number,
-- so there's always a record of *why* something was set aside.
-- Run after migration_003.
-- ============================================================================

alter table invoices
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text, -- 'duplicate' | 'updated' | 'other'
  add column if not exists archived_related_invoice_number text,
  add column if not exists archived_comment text;

create index if not exists idx_invoices_archived on invoices(company_id, archived_at);
