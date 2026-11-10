import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { resolveAccess, accessDenied, PRIVATE_HEADERS } from "../../../../lib/auth/access";
import { saveTeacher, teacherWithHistory } from "../../../../lib/teachers/service";
import { UUID } from "../../../../lib/catalog/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator", "director"]);
  if (!access.ok) return accessDenied(access.status);
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "El docente no existe." }, { status: 404, headers: PRIVATE_HEADERS });
  const result = await teacherWithHistory(client, id);
  if (result.error) return accessDenied(503);
  return NextResponse.json(result.teacher ? { teacher: result.teacher, history: result.history } : { error: "El docente no existe." },
    { status: result.teacher ? 200 : 404, headers: PRIVATE_HEADERS });
}
export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  const result = await saveTeacher(await request.json().catch(() => null), id);
  return NextResponse.json(result.ok ? { teacher: result.teacher } : { errors: result.errors }, { status: result.ok ? 200 : result.status, headers: PRIVATE_HEADERS });
}
