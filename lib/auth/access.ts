import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "../supabase/server";
import { institutionalEmail, isAppRole, type AppRole } from "./roles";
type Client = Awaited<ReturnType<typeof createClient>>;
export type AccessContext = { userId: string; email: string; role: AppRole };
type AccessResult = { ok: true; account: AccessContext } | { ok: false; status: 401 | 403 | 503 };
export async function resolveAccess(client?: Client, roles?: readonly AppRole[]): Promise<AccessResult> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, status: 401 };
  const email = institutionalEmail(data.user.email);
  if (!email || !data.user.email_confirmed_at) return { ok: false, status: 403 };
  // RLS comprueba también estado, dominio y vigencia de la sesión.
  const { data: profile, error: profileError } = await supabase.from("user_profiles")
    .select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (profileError) return { ok: false, status: 503 };
  if (!profile?.is_active || !isAppRole(profile.role)) return { ok: false, status: 403 };
  if (roles && !roles.includes(profile.role)) return { ok: false, status: 403 };
  return { ok: true, account: { userId: data.user.id, email, role: profile.role } };
}
export async function requirePageAccess(roles?: readonly AppRole[]) {
  const result = await resolveAccess(undefined, roles);
  if (!result.ok) {
    if (result.status === 401) redirect("/login");
    redirect("/acceso-denegado");
  }
  return result.account;
}
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", Pragma: "no-cache" };
export function accessDenied(status: 401 | 403 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "Servicio no disponible temporalmente." : "Acceso no autorizado." },
    { status, headers: PRIVATE_HEADERS },
  );
}
