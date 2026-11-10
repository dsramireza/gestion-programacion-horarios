import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAccess } from "../../../lib/auth/access";
import { createClient } from "../../../lib/supabase/server";
import type { Program } from "../../../lib/catalog/service";
import { UUID } from "../../../lib/catalog/validation";
import { teacherWithHistory } from "../../../lib/teachers/service";
import { ACADEMIC_RANKS, DEDICATIONS, type Teacher, type TeacherRevision } from "../../../lib/teachers/types";
import { TeacherForm } from "../teacher-form";
export const dynamic = "force-dynamic";
const LABELS: Record<string, string> = {
  institutional_id: "Identificador", full_name: "Nombre", email: "Correo", program_id: "Programa",
  dedication: "Dedicación", academic_rank: "Escalafón", is_active: "Estado",
};
function display(field: string, value: unknown, programs: Map<string, string>) {
  if (field === "program_id") return programs.get(String(value)) ?? String(value);
  if (field === "academic_rank") return ACADEMIC_RANKS[value as Teacher["academic_rank"]] ?? String(value);
  if (field === "is_active") return value ? "Activo" : "Inactivo";
  return String(value);
}
function changes(revision: TeacherRevision, programs: Map<string, string>) {
  if (!revision.previous_values) return "Registro inicial";
  const previous = revision.previous_values as Record<string, unknown>, next = revision.next_values as Record<string, unknown>;
  return Object.keys(LABELS).filter(field => previous[field] !== next[field])
    .map(field => `${LABELS[field]}: ${display(field, previous[field], programs)} → ${display(field, next[field], programs)}`).join("; ");
}
export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requirePageAccess(["administrator", "director"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const client = await createClient();
  const [result, programResult] = await Promise.all([
    teacherWithHistory(client, id),
    client.from("programs").select("id,name,is_active").order("name"),
  ]);
  if (!result.error && !result.teacher) notFound();
  const error = result.error || programResult.error;
  const teacher = result.teacher!;
  const programs = (programResult.data ?? []) as Program[];
  const programNames = new Map(programs.map(program => [program.id, program.name]));
  const revisions = result.history as TeacherRevision[];
  const editable = account.role === "administrator";
  return <main className="workspace"><Link href="/docentes" className="text-link">Volver a docentes</Link>
    <section className="panel"><p className="eyebrow">{editable ? "Administración" : "Consulta"}</p><h1>{editable ? "Editar docente" : "Docente"}</h1>
      {error ? <p role="alert" className="error-message">No fue posible consultar el docente. Inténtalo de nuevo.</p> : editable ? <TeacherForm programs={programs} teacher={teacher} /> :
        <dl className="form-grid">
          <div className="field"><dt>Identificador institucional</dt><dd>{teacher.institutional_id}</dd></div>
          <div className="field"><dt>Correo institucional</dt><dd>{teacher.email}</dd></div>
          <div className="field form-wide"><dt>Nombre completo</dt><dd>{teacher.full_name}</dd></div>
          <div className="field form-wide"><dt>Programa</dt><dd>{programNames.get(teacher.program_id)}</dd></div>
          <div className="field"><dt>Dedicación</dt><dd>{teacher.dedication} — {DEDICATIONS[teacher.dedication]}</dd></div>
          <div className="field"><dt>Escalafón</dt><dd>{ACADEMIC_RANKS[teacher.academic_rank]}</dd></div>
          <div className="field"><dt>Estado</dt><dd>{teacher.is_active ? "Activo" : "Inactivo"}</dd></div>
        </dl>}
    </section>
    {!error ? <section className="panel"><h2>Historial de cambios</h2>{revisions.length ? <div className="table-scroll"><table>
      <thead><tr><th scope="col">Revisión</th><th scope="col">Cambios</th><th scope="col">Responsable</th><th scope="col">Fecha</th></tr></thead>
      <tbody>{revisions.map(revision => <tr key={revision.id}><td>{revision.revision_number}</td><td>{changes(revision, programNames)}</td><td>{revision.actor_email}</td>
        <td>{new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(revision.created_at))}</td></tr>)}</tbody>
    </table></div> : <p className="empty-state">No hay cambios registrados.</p>}</section> : null}
  </main>;
}
