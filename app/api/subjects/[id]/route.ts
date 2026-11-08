import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { resolveAccess, accessDenied, PRIVATE_HEADERS } from "../../../../lib/auth/access";
import { SUBJECT_FIELDS, saveSubject } from "../../../../lib/catalog/service";
import { UUID } from "../../../../lib/catalog/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator", "director"]);
  if (!access.ok) return accessDenied(access.status);
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "La asignatura no existe." }, { status: 404, headers: PRIVATE_HEADERS });
  const { data, error } = await client.from("subjects").select(SUBJECT_FIELDS).eq("id", id).maybeSingle();
  if (error) return accessDenied(503);
  return NextResponse.json(data ? { subject: data } : { error: "La asignatura no existe." }, { status: data ? 200 : 404, headers: PRIVATE_HEADERS });
}
export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  const result = await saveSubject(await request.json().catch(() => null), id);
  return NextResponse.json(result.ok ? { subject: result.subject } : { errors: result.errors }, { status: result.ok ? 200 : result.status, headers: PRIVATE_HEADERS });
}
