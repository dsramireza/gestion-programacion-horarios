import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { resolveAccess, accessDenied, PRIVATE_HEADERS } from "../../../lib/auth/access";
import { queryTeachers, saveTeacher, validTeacherFilters } from "../../../lib/teachers/service";
export async function GET(request: Request) {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator", "director"]);
  if (!access.ok) return accessDenied(access.status);
  const params = new URL(request.url).searchParams;
  const filters = { query: params.get("q") ?? "", programId: params.get("program") ?? "", dedication: params.get("dedication") ?? "", state: params.get("state") ?? "all" };
  if (!validTeacherFilters(filters)) return NextResponse.json({ error: "Los filtros no son válidos." }, { status: 422, headers: PRIVATE_HEADERS });
  const { data, error } = await queryTeachers(client, filters);
  if (error) return accessDenied(503);
  return NextResponse.json({ teachers: data }, { headers: PRIVATE_HEADERS });
}
export async function POST(request: Request) {
  const result = await saveTeacher(await request.json().catch(() => null));
  return NextResponse.json(result.ok ? { teacher: result.teacher } : { errors: result.errors }, { status: result.ok ? 201 : result.status, headers: PRIVATE_HEADERS });
}
