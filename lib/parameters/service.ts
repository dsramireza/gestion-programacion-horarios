import "server-only";
import { createClient } from "../supabase/server";
import { resolveAccess } from "../auth/access";
import { validateParameters } from "./validation";
import type { ParameterErrors, ParameterRevision, SemesterRecord } from "./types";
type Client = Awaited<ReturnType<typeof createClient>>;
export async function semesterCatalog(client: Client) {
  const result=await client.from("semesters").select("*").order("name",{ascending:false});
  return {data:(result.data??[]) as SemesterRecord[],error:result.error};
}
export async function parameterContext(client: Client,semester: SemesterRecord) {
  const [history,groups,heads]=await Promise.all([
    client.from("semester_parameter_revisions").select("*").eq("semester_id",semester.id).order("revision_number",{ascending:false}),
    client.from("academic_groups").select("id,code,student_count,parameter_revision_id,subject:subjects(code)").eq("semester_id",semester.id),
    client.from("subject_configurations").select("id,current_revision_id,subject:subjects(code)").eq("semester_id",semester.id),
  ]);
  const revisions=(history.data??[]) as ParameterRevision[];
  const current=revisions.find(row=>row.id===semester.current_parameter_revision_id)??null;
  const ids=(heads.data??[]).flatMap(row=>row.current_revision_id?[row.current_revision_id]:[]);
  const configurations=ids.length ? await client.from("subject_configuration_revisions").select("id,parameter_revision_id,sessions_per_week").in("id",ids) : {data:[],error:null};
  const configById=new Map((configurations.data??[]).map(row=>[row.id,row]));
  const subjectCode=(subject:unknown)=>(subject as {code:string}|null)?.code??"";
  return {error:history.error||groups.error||heads.error||configurations.error,semester,current,revisions,
    groups:(groups.data??[]).map(row=>({id:row.id,code:subjectCode(row.subject)+row.code,student_count:row.student_count,
      needs_review:row.parameter_revision_id!==current?.id,exceeds_limit:current?row.student_count>Math.floor(current.group_capacity*(1+Number(current.group_tolerance_percent)/100)):false})),
    configurations:(heads.data??[]).map(row=>{const revision=configById.get(row.current_revision_id??""); return {id:row.id,code:subjectCode(row.subject),
      needs_review:!!revision && revision.parameter_revision_id!==current?.id,exceeds_limit:!!revision && !!current && revision.sessions_per_week>current.max_weekly_sessions};}),
  };
}
export async function saveParameters(value: unknown): Promise<{ok:true;revision:ParameterRevision}|{ok:false;status:number;errors:ParameterErrors}> {
  const client=await createClient();
  const access=await resolveAccess(client,["administrator"]);
  if (!access.ok) return {ok:false,status:access.status,errors:{form:"No tienes permiso para editar parámetros."}};
  const {data,errors}=validateParameters(value);
  if (Object.keys(errors).length) return {ok:false,status:422,errors};
  const {semester_id,expected_revision_id,...values}=data;
  const result=await client.rpc("save_semester_parameters",{p_semester_id:semester_id,p_expected_revision_id:expected_revision_id,p_values:values});
  if (!result.error) return {ok:true,revision:result.data as ParameterRevision};
  const {code,message}=result.error;
  if (code==="42501") return {ok:false,status:403,errors:{form:"Solo Administrador puede editar parámetros."}};
  if (code==="40001") return {ok:false,status:409,errors:{form:"Los parámetros cambiaron. Recarga la página antes de guardar."}};
  if (message==="another_active_semester") return {ok:false,status:409,errors:{is_active:"Ya hay otro semestre activo. Inactívalo primero."}};
  if (code==="23505") return {ok:false,status:409,errors:{name:"Ya existe un semestre con ese código."}};
  if (message==="invalid_windows") return {ok:false,status:422,errors:{weekly_windows:"Revisa las franjas y el bloque excluido: cada día debe permitir una sesión continua de 120 minutos."}};
  if (message==="invalid_dates") return {ok:false,status:422,errors:{end_date:"Las fechas deben ser válidas y estar ordenadas."}};
  if (message==="invalid_semester") return {ok:false,status:404,errors:{form:"El semestre no está disponible."}};
  if (code==="22023") return {ok:false,status:422,errors:{form:"Revisa los valores de los parámetros."}};
  return {ok:false,status:503,errors:{form:"No fue posible guardar. Inténtalo de nuevo."}};
}
