import { createServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

/**
 * Returns the signed-in user's company_id, or redirects to /login.
 * Every server component/action that reads or writes business data should
 * call this first — it's the one place that will need updating if a user
 * ever belongs to more than one company (multi-company staff accounts).
 */
export async function getCurrentCompanyId(): Promise<string> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (error || !data) redirect("/login");

  return data.company_id;
}
