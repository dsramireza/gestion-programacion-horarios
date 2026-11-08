import { NextResponse } from "next/server";
import { resolveAccess, accessDenied, PRIVATE_HEADERS } from "../../../lib/auth/access";
export async function GET() {
  const result = await resolveAccess();
  if (!result.ok) return accessDenied(result.status);
  return NextResponse.json({ authenticated: true, role: result.account.role }, { headers: PRIVATE_HEADERS });
}
