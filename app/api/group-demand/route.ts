import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { resolveAccess,accessDenied,PRIVATE_HEADERS } from "../../../lib/auth/access";
import { groupCatalog } from "../../../lib/groups/service";
import { UUID } from "../../../lib/catalog/validation";
export async function GET(request:Request) {
  const client=await createClient(),access=await resolveAccess(client,["administrator","director"]);
  if(!access.ok) return accessDenied(access.status);
  const semesterId=new URL(request.url).searchParams.get("semester") ?? "";
  if(!UUID.test(semesterId)) return NextResponse.json({error:"Selecciona un semestre válido."},{status:422,headers:PRIVATE_HEADERS});
  const result=await groupCatalog(client,{semesterId,subjectId:"",state:"all"});
  if(result.error) return accessDenied(503);
  const programmable=result.data.filter(group=>group.demand.programmable);
  return NextResponse.json({programmable_groups:programmable.map(group=>({subject_id:group.subject_id,semester_id:group.semester_id,code:group.full_code,...group.demand})),
    excluded_groups:result.data.flatMap(group=>group.demand.programmable ? []:[{group_id:group.id,reason:group.demand.reason}]),
    total_sessions_per_week:programmable.reduce((sum,group)=>sum+(group.demand.programmable ? group.demand.sessions_per_week:0),0)}, {headers:PRIVATE_HEADERS});
}
