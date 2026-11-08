import "server-only";
import { createClient } from "../supabase/server";
import { resolveAccess } from "../auth/access";
import { UUID } from "../catalog/validation";
import { groupDemand } from "../configuration/demand";
import type { ConfigurationHead, ConfigurationRevision, Semester, SemesterParameters } from "../configuration/types";
import type { AcademicGroup, GroupErrors, GroupSemester, GroupView } from "./types";
import { validateGroup } from "./validation";
type Client = Awaited<ReturnType<typeof createClient>>;
export const GROUP_FIELDS = "*,subject:subjects(id,code,name,is_active),semester:semesters(id,name,current_parameter_revision_id),parameters:semester_parameter_revisions(*)";
export async function groupReferences(client: Client) {
  const [semesters, parameters, subjects] = await Promise.all([
    client.from("semesters").select("id,name,current_parameter_revision_id").order("name", { ascending: false }),
    client.from("semester_parameter_revisions").select("*"),
    client.from("subjects").select("id,code,name,is_active").order("code"),
  ]);
  const byId = new Map((parameters.data as SemesterParameters[] | null)?.map(parameter => [parameter.id,parameter]));
  return { error: semesters.error || parameters.error || subjects.error, subjects: subjects.data ?? [],
    semesters: ((semesters.data ?? []) as Semester[]).map(semester => ({ ...semester, parameters: byId.get(semester.current_parameter_revision_id ?? "") ?? null })) as GroupSemester[] };
}
export type GroupFilters = { semesterId: string; subjectId: string; state: string };
export function validGroupFilters(filters: GroupFilters) {
  return UUID.test(filters.semesterId) && (!filters.subjectId || UUID.test(filters.subjectId)) && ["all","open","at_risk","closed"].includes(filters.state);
}
export async function groupCatalog(client: Client, filters: GroupFilters) {
  let query = client.from("academic_groups").select(GROUP_FIELDS).eq("semester_id",filters.semesterId).order("code");
  if (filters.subjectId) query=query.eq("subject_id",filters.subjectId);
  if (filters.state!=="all") query=query.eq("state",filters.state);
  const [groups, configurations] = await Promise.all([query,client.from("subject_configurations").select("*").eq("semester_id",filters.semesterId)]);
  const heads=(configurations.data ?? []) as ConfigurationHead[];
  const ids=heads.flatMap(head => head.current_revision_id ? [head.current_revision_id] : []);
  const revisions=ids.length ? await client.from("subject_configuration_revisions").select("*").in("id",ids) : { data: [], error: null };
  const headBySubject=new Map(heads.map(head => [head.subject_id,head]));
  const revisionById=new Map(((revisions.data ?? []) as ConfigurationRevision[]).map(revision => [revision.id,revision]));
  const rows=((groups.data ?? []) as unknown as GroupView[]).map(group => {
    const head=headBySubject.get(group.subject_id) ?? null;
    const revision=revisionById.get(head?.current_revision_id ?? "") ?? null;
    let blocked: "inactive_subject" | "parameters_changed" | "stale_configuration" | null = null;
    if (!group.subject.is_active) blocked="inactive_subject";
    else if (group.parameter_revision_id!==group.semester.current_parameter_revision_id) blocked="parameters_changed";
    else if (revision && revision.parameter_revision_id!==group.semester.current_parameter_revision_id) blocked="stale_configuration";
    const demand = group.state!=="closed" && blocked ? { group_id: group.id, programmable: false as const, reason: blocked } : groupDemand(group,head,revision);
    return { ...group, full_code: group.subject.code+group.code, demand };
  });
  return { data: rows, error: groups.error || configurations.error || revisions.error };
}
type SaveResult = { ok: true; group: AcademicGroup } | { ok: false; status: number; errors: GroupErrors };
export async function saveGroup(value: unknown,id?: string): Promise<SaveResult> {
  const client=await createClient();
  const access=await resolveAccess(client,["administrator","director"]);
  if (!access.ok) return { ok:false,status:access.status,errors:{ form:"No tienes permiso para guardar grupos." } };
  if (id!==undefined && !UUID.test(id)) return { ok:false,status:404,errors:{ form:"El grupo no existe." } };
  const {data,errors}=validateGroup(value);
  if(Object.keys(errors).length) return {ok:false,status:422,errors};
  const result=await client.rpc("save_academic_group",{ p_subject_id:data.subject_id,p_semester_id:data.semester_id,p_code:data.code,p_student_count:data.student_count,
    p_expected_parameter_revision_id:data.expected_parameter_revision_id,p_group_id:id ?? null,p_expected_revision_number:data.expected_revision_number });
  if(result.error) {
    const message=result.error.message;
    if(result.error.code==="42501") return {ok:false,status:403,errors:{form:"No tienes permiso para guardar grupos."}};
    if(result.error.code==="23505") return {ok:false,status:409,errors:{code:"El código del grupo ya existe en esta asignatura y semestre."}};
    if(message==="group_not_found") return {ok:false,status:404,errors:{form:"El grupo no existe."}};
    if(message==="invalid_student_count") return {ok:false,status:422,errors:{student_count:"El conteo debe ser un entero entre cero y el máximo tolerado del semestre."}};
    if(message==="invalid_group_code") return {ok:false,status:422,errors:{code:"Escribe un código de grupo no vacío, por ejemplo G1."}};
    if(message==="invalid_subject") return {ok:false,status:422,errors:{subject_id:"La asignatura debe pertenecer al semestre y estar activa para crear un grupo."}};
    if(message==="invalid_semester") return {ok:false,status:422,errors:{semester_id:"El semestre no está disponible."}};
    if(message==="immutable_group_context") return {ok:false,status:422,errors:{form:"No puedes cambiar la asignatura o el semestre de un grupo existente."}};
    if(result.error.code==="40001") return {ok:false,status:409,errors:{form:"El grupo o los parámetros cambiaron. Recarga antes de guardar."}};
    return {ok:false,status:503,errors:{form:"No fue posible guardar el grupo. Inténtalo de nuevo."}};
  }
  return {ok:true,group:result.data as AcademicGroup};
}
