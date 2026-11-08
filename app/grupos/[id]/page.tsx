import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAccess } from "../../../lib/auth/access";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../../lib/catalog/validation";
import { GROUP_FIELDS,groupReferences } from "../../../lib/groups/service";
import { GROUP_STATES,type GroupRevision,type GroupView } from "../../../lib/groups/types";
import { GroupForm } from "../group-form";
export const dynamic="force-dynamic";
export default async function EditGroupPage({params}:{params:Promise<{id:string}>}) {
  await requirePageAccess(["administrator","director"]);
  const {id}=await params;
  if(!UUID.test(id)) notFound();
  const client=await createClient();
  const [group,references,history]=await Promise.all([client.from("academic_groups").select(GROUP_FIELDS).eq("id",id).maybeSingle(),groupReferences(client),client.from("group_revisions").select("*").eq("group_id",id).order("revision_number",{ascending:false})]);
  if(!group.error && !group.data) notFound();
  const item=group.data as unknown as GroupView;
  const revisions=(history.data ?? []) as GroupRevision[];
  const error=group.error || references.error || history.error;
  return <main className="workspace"><Link href="/grupos" className="text-link">Volver a grupos</Link><section className="panel"><p className="eyebrow">Planeación</p><h1>Editar grupo</h1>
    {error ? <p role="alert" className="error-message">No fue posible consultar el grupo. Inténtalo de nuevo.</p>:<><p>{item.subject.code}{item.code} · {item.semester.name} · {GROUP_STATES[item.state]}</p><GroupForm group={item} semesters={references.semesters} subjects={references.subjects}/></>}
  </section>
    {!error ? <section className="panel"><h2>Historial de conteos y estados</h2>{revisions.length ? <div className="table-scroll"><table><thead><tr><th scope="col">Revisión</th><th scope="col">Conteo anterior → nuevo</th><th scope="col">Estado anterior → nuevo</th><th scope="col">Responsable</th><th scope="col">Fecha</th><th scope="col">Validación</th></tr></thead><tbody>{revisions.map(revision=><tr key={revision.id}><td>{revision.revision_number}</td><td>{revision.previous_values?.student_count ?? "Inicial"} → {revision.next_values.student_count}</td><td>{revision.previous_values ? GROUP_STATES[revision.previous_values.state]:"Inicial"} → {GROUP_STATES[revision.next_values.state]}</td><td>{revision.actor_email}</td><td>{new Intl.DateTimeFormat("es-CO",{dateStyle:"short",timeStyle:"short",timeZone:"America/Bogota"}).format(new Date(revision.created_at))}</td><td>{revision.validation_result==="accepted" ? "Aceptado":""}</td></tr>)}</tbody></table></div>:<p className="empty-state">No hay cambios registrados.</p>}</section>:null}
  </main>;
}
