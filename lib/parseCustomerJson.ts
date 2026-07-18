export type ParsedCustomer = {
  name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
};

const ALIASES: Record<keyof ParsedCustomer, string[]> = {
  name: ["name", "full_name", "fullname", "customer_name", "contact_name", "first_name"],
  company_name: ["company_name", "company", "business", "business_name", "organisation", "organization"],
  phone: ["phone", "phone_number", "mobile", "mobile_number", "tel", "telephone"],
  email: ["email", "email_address", "e-mail"],
  address: ["address", "street_address", "full_address", "location"],
};

/**
 * Accepts a pasted JSON object (or array with one object) and maps it onto
 * the new-customer form fields, matching common key spellings so it works
 * with data copied from an email signature parser, another CRM's export, a
 * form builder submission, etc. — not just an exact schema match.
 */
export function parseCustomerJson(raw: string): { ok: true; data: ParsedCustomer } | { ok: false; error: string } {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That doesn't look like valid JSON — check for missing quotes or commas." };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { ok: false, error: "The JSON array is empty." };
    parsed = parsed[0];
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "Expected a JSON object, e.g. {\"name\": \"Jane Smith\", \"email\": \"jane@example.com\"}." };
  }

  const lowerKeyed: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed)) {
    lowerKeyed[k.toLowerCase().trim()] = v;
  }

  const result: ParsedCustomer = { name: "", company_name: "", phone: "", email: "", address: "" };
  for (const field of Object.keys(ALIASES) as (keyof ParsedCustomer)[]) {
    for (const alias of ALIASES[field]) {
      if (lowerKeyed[alias] !== undefined && lowerKeyed[alias] !== null) {
        result[field] = String(lowerKeyed[alias]);
        break;
      }
    }
  }

  if (!result.name) {
    return { ok: false, error: "Couldn't find a name field in that JSON — add a \"name\" key and try again." };
  }

  return { ok: true, data: result };
}
