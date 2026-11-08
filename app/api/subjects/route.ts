import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { resolveAccess, accessDenied, PRIVATE_HEADERS } from "../../../lib/auth/access";
import { querySubjects, validFilters, saveSubject } from "../../../lib/catalog/service";
export async function GET(request: Request) {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator", "director"]);
  if (!access.ok) return accessDenied(access.status);
  const params = new URL(request.url).searchParams;
  const filters = { query: params.get("q") ?? "", programId: params.get("program") ?? "", state: params.get("state") ?? "all" };
  if (!validFilters(filters)) return NextResponse.json({ error: "Los filtros no son válidos." }, { status: 422, headers: PRIVATE_HEADERS });
  const { data, error } = await querySubjects(client, filters);
  if (error) return accessDenied(503);
  return NextResponse.json({ subjects: data }, { headers: PRIVATE_HEADERS });
}
export async function POST(request: Request) {
  const value = await request.json().catch(() => null);
  const result = await saveSubject(value);
  return NextResponse.json(result.ok ? { subject: result.subject } : { errors: result.errors }, { status: result.ok ? 201 : result.status, headers: PRIVATE_HEADERS });
}
