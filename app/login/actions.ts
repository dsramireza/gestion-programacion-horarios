"use server";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { institutionalEmail } from "../../lib/auth/roles";
import { resolveAccess } from "../../lib/auth/access";
const LOGIN_ERROR = "No fue posible iniciar sesión. Verifica tus credenciales y tu acceso institucional.";
export type LoginState = { error: string | null };
export async function signIn(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = institutionalEmail(formData.get("email"));
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password) return { error: LOGIN_ERROR };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: LOGIN_ERROR };
  const access = await resolveAccess(supabase);
  if (!access.ok) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: LOGIN_ERROR };
  }
  redirect("/");
}
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/acceso-denegado");
  redirect("/login");
}
