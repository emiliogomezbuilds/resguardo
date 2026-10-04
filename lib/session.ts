import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every protected page goes through here: no session -> /login,
// no business yet -> /onboarding. RLS still enforces ownership in the database.
export async function requireOwner() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, sector, employees_band, domain")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!business) redirect("/onboarding");
  return { supabase, user: auth.user, business };
}
