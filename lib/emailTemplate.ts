export const QUOTE_EMAIL_VARIABLES = [
  { key: "customer_name", label: "Customer name" },
  { key: "company_name", label: "Your business name" },
  { key: "doc_number", label: "Quote number" },
  { key: "total", label: "Total (formatted, e.g. $250.00)" },
  { key: "expiry_date", label: "Expiry date" },
] as const;

export const INVOICE_EMAIL_VARIABLES = [
  { key: "customer_name", label: "Customer name" },
  { key: "company_name", label: "Your business name" },
  { key: "doc_number", label: "Invoice number" },
  { key: "total", label: "Total (formatted, e.g. $250.00)" },
  { key: "due_date", label: "Due date" },
] as const;

export const DEFAULT_QUOTE_SUBJECT = "Quote {{doc_number}} from {{company_name}}";
export const DEFAULT_QUOTE_BODY = `Hi {{customer_name}},

Please find attached quote {{doc_number}} for your review.

Total: {{total}}

Let us know if you have any questions.

{{company_name}}`;

export const DEFAULT_INVOICE_SUBJECT = "Invoice {{doc_number}} from {{company_name}}";
export const DEFAULT_INVOICE_BODY = `Hi {{customer_name}},

Please find attached invoice {{doc_number}}.

Total due: {{total}}
Due date: {{due_date}}

Thanks for your business.

{{company_name}}`;

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}
