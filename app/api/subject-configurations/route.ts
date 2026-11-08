import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { resolveAccess, accessDenied, PRIVATE_HEADERS } from "../../../lib/auth/access";
import { UUID } from "../../../lib/catalog/validation";
import { configurationContext, saveConfiguration } from "../../../lib/configuration/service";
export async function GET(request: Request) {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator", "director"]);
  if (!access.ok) return accessDenied(access.status);
  const params = new URL(request.url).searchParams;
  const subject = params.get("subject") ?? "", semester = params.get("semester") ?? "";
  if (!UUID.test(subject) || !UUID.test(semester)) return NextResponse.json({ error: "Selecciona una asignatura y un semestre válidos." }, { status: 422, headers: PRIVATE_HEADERS });
  const result = await configurationContext(client, subject, semester);
  if (!result.ok) return result.status === 503 ? accessDenied(503) : NextResponse.json({ error: "El contexto no existe." }, { status: 404, headers: PRIVATE_HEADERS });
  return NextResponse.json(result.context, { headers: PRIVATE_HEADERS });
}
export async function POST(request: Request) {
  const result = await saveConfiguration(await request.json().catch(() => null));
  return NextResponse.json(result.ok ? { revision: result.revision } : { errors: result.errors }, { status: result.ok ? 201 : result.status, headers: PRIVATE_HEADERS });
}
