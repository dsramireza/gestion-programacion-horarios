import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Los Server Components no escriben cookies; proxy.ts renueva la sesión.
        }
      },
    },
  });
}
