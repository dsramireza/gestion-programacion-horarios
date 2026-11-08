import { NextResponse } from "next/server";
import { resolveAccess, accessDenied, PRIVATE_HEADERS } from "../../../lib/auth/access";
import { createClient } from "../../../lib/supabase/server";
export async function GET() {
  const supabase = await createClient();
  const access = await resolveAccess(supabase, ["administrator"]);
  if (!access.ok) return accessDenied(access.status);
  const { data, error } = await supabase.from("access_audit")
    .select("id, actor_email, target_user_id, previous_access, next_access, reason, created_at")
    .order("created_at", { ascending: false }).limit(50);
  if (error) return accessDenied(503);
  return NextResponse.json({ events: data }, { headers: PRIVATE_HEADERS });
}
