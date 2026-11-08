import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { resolveAccess,accessDenied,PRIVATE_HEADERS } from "../../../lib/auth/access";
import { groupCatalog,saveGroup,validGroupFilters } from "../../../lib/groups/service";
export async function GET(request:Request) {
  const client=await createClient(), access=await resolveAccess(client,["administrator","director"]);
  if(!access.ok) return accessDenied(access.status);
  const params=new URL(request.url).searchParams;
  const filters={semesterId:params.get("semester") ?? "",subjectId:params.get("subject") ?? "",state:params.get("state") ?? "all"};
  if(!validGroupFilters(filters)) return NextResponse.json({error:"Selecciona un semestre y filtros válidos."},{status:422,headers:PRIVATE_HEADERS});
  const result=await groupCatalog(client,filters);
  if(result.error) return accessDenied(503);
  return NextResponse.json({groups:result.data},{headers:PRIVATE_HEADERS});
}
export async function POST(request:Request) {
  const result=await saveGroup(await request.json().catch(()=>null));
  return NextResponse.json(result.ok ? {group:result.group}:{errors:result.errors},{status:result.ok ? 201:result.status,headers:PRIVATE_HEADERS});
}
