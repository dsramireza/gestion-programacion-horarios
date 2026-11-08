import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { resolveAccess,accessDenied,PRIVATE_HEADERS } from "../../../../lib/auth/access";
import { GROUP_FIELDS,saveGroup } from "../../../../lib/groups/service";
import { UUID } from "../../../../lib/catalog/validation";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context) {
  const client=await createClient(),access=await resolveAccess(client,["administrator","director"]);
  if(!access.ok) return accessDenied(access.status);
  const {id}=await context.params;
  if(!UUID.test(id)) return NextResponse.json({error:"El grupo no existe."},{status:404,headers:PRIVATE_HEADERS});
  const [group,history]=await Promise.all([client.from("academic_groups").select(GROUP_FIELDS).eq("id",id).maybeSingle(),client.from("group_revisions").select("*").eq("group_id",id).order("revision_number",{ascending:false})]);
  if(group.error || history.error) return accessDenied(503);
  return NextResponse.json(group.data ? {group:group.data,history:history.data}:{error:"El grupo no existe."},{status:group.data ? 200:404,headers:PRIVATE_HEADERS});
}
export async function PUT(request:Request,context:Context) {
  const {id}=await context.params;
  const result=await saveGroup(await request.json().catch(()=>null),id);
  return NextResponse.json(result.ok ? {group:result.group}:{errors:result.errors},{status:result.ok ? 200:result.status,headers:PRIVATE_HEADERS});
}
