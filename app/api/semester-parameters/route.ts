import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { resolveAccess,accessDenied,PRIVATE_HEADERS } from "../../../lib/auth/access";
import { parameterContext,saveParameters,semesterCatalog } from "../../../lib/parameters/service";
export async function GET(request: Request) {
  const client=await createClient();
  const access=await resolveAccess(client,["administrator","director"]);
  if (!access.ok) return accessDenied(access.status);
  const catalog=await semesterCatalog(client);
  if (catalog.error) return accessDenied(503);
  const id=new URL(request.url).searchParams.get("semester");
  if (!id) return NextResponse.json({semesters:catalog.data},{headers:PRIVATE_HEADERS});
  const semester=catalog.data.find(row=>row.id===id);
  if (!semester) return NextResponse.json({error:"El semestre no está disponible."},{status:404,headers:PRIVATE_HEADERS});
  const context=await parameterContext(client,semester);
  if (context.error) return accessDenied(503);
  const {error:_,...data}=context;
  return NextResponse.json(data,{headers:PRIVATE_HEADERS});
}
export async function POST(request: Request) {
  const result=await saveParameters(await request.json().catch(()=>null));
  return NextResponse.json(result.ok?{revision:result.revision}:{errors:result.errors},{status:result.ok?201:result.status,headers:PRIVATE_HEADERS});
}
