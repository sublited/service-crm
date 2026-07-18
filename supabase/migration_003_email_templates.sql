-- ============================================================================
-- Migration 003: editable email subject/body templates per company, with
-- variable placeholders like {{customer_name}}. Run after migration_002.
-- ============================================================================

alter table companies
  add column if not exists quote_email_subject text,
  add column if not exists quote_email_body text,
  add column if not exists invoice_email_subject text,
  add column if not exists invoice_email_body text;
