import Link from "next/link";
import { requirePageAccess } from "../../../lib/auth/access";
import { createClient } from "../../../lib/supabase/server";
import { groupReferences } from "../../../lib/groups/service";
import { GroupForm } from "../group-form";
export const dynamic="force-dynamic";
export default async function NewGroupPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  await requirePageAccess(["administrator","director"]);
  const params=await searchParams,client=await createClient(),references=await groupReferences(client);
  const semester=typeof params.semester==="string" && references.semesters.some(item=>item.id===params.semester) ? params.semester:"";
  const subject=typeof params.subject==="string" && references.subjects.some(item=>item.id===params.subject && item.is_active) ? params.subject:"";
  return <main className="workspace"><Link href="/grupos" className="text-link">Volver a grupos</Link><section className="panel"><p className="eyebrow">Planeación</p><h1>Nuevo grupo</h1>
    {references.error ? <p role="alert" className="error-message">No fue posible consultar las referencias. Inténtalo de nuevo.</p>:!references.semesters.length || !references.subjects.some(item=>item.is_active) ? <p className="empty-state">Necesitas un semestre y una asignatura activa para crear grupos.</p>:<GroupForm semesters={references.semesters} subjects={references.subjects} initialSemester={semester} initialSubject={subject}/>}
  </section></main>;
}
