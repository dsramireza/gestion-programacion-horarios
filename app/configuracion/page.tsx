import Link from "next/link";
import { requirePageAccess } from "../../lib/auth/access";
import { createClient } from "../../lib/supabase/server";
import { UUID } from "../../lib/catalog/validation";
import { configurationContext } from "../../lib/configuration/service";
import type { Semester } from "../../lib/configuration/types";
import { ConfigurationForm } from "./configuration-form";
export const dynamic = "force-dynamic";
type Search = Record<string,string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
export default async function ConfigurationPage({ searchParams }: { searchParams: Promise<Search> }) {
  const account = await requirePageAccess(["administrator","director"]);
  const params = await searchParams;
  const client = await createClient();
  const [semesters, subjects] = await Promise.all([
    client.from("semesters").select("id,name,current_parameter_revision_id").order("name", { ascending: false }),
    client.from("subjects").select("id,code,name,is_active").order("code"),
  ]);
  const semesterId = first(params.semester) || (semesters.data?.[0]?.id ?? "");
  const subjectId = first(params.subject);
  const validSelection = UUID.test(semesterId) && UUID.test(subjectId);
  const selected = validSelection ? await configurationContext(client,subjectId,semesterId) : null;
  const context = selected?.ok ? selected.context : null;
  const previousById = new Map(context?.revisions.map(revision => [revision.id,revision]));
  const invalid = (subjectId && !UUID.test(subjectId)) || (semesterId && !UUID.test(semesterId));
  const error = semesters.error || subjects.error || (selected && !selected.ok) || invalid;
  return <main className="workspace">
    <Link href="/" className="text-link">Volver al inicio</Link>
    <header className="catalog-heading"><p className="eyebrow">Programación académica</p><h1>Frecuencia y duración</h1><p>Configura las sesiones de cada asignatura por semestre y consulta sus cambios.</p></header>
    <section className="panel" aria-label="Seleccionar contexto">
      <form method="GET" className="catalog-filters" key={`${semesterId}:${subjectId}`}>
        <div className="field"><label htmlFor="semester">Semestre</label><select id="semester" name="semester" required defaultValue={semesterId}><option value="">Selecciona un semestre</option>{(semesters.data as Semester[] | null)?.map(semester => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></div>
        <div className="field"><label htmlFor="subject">Asignatura</label><select id="subject" name="subject" required defaultValue={subjectId}><option value="">Selecciona una asignatura</option>{subjects.data?.map(subject => <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}{subject.is_active ? "" : " (inactiva)"}</option>)}</select></div>
        <button className="button" type="submit">Consultar</button>
      </form>
    </section>
    {error ? <section className="panel"><p role="alert" className="error-message">No fue posible consultar ese contexto. Selecciona una asignatura y un semestre disponibles e inténtalo de nuevo.</p></section> :
      context ? <>
        {first(params.saved) === "1" ? <p className="success-message" role="status">La nueva revisión se guardó correctamente.</p> : null}
        <section className="panel">
          <p className="eyebrow">{context.semester.name} · {context.subject.code}</p><h2>{context.subject.name}</h2>
          {context.current ? <p>Configuración vigente: {context.current.sessions_per_week} sesiones semanales de {context.current.session_duration_minutes} minutos. Revisión {context.current.revision_number}.</p> : <p className="empty-state">Esta asignatura aún no tiene configuración en el semestre.</p>}
          {!context.subject.is_active ? <p className="form-note">La asignatura está inactiva. Puedes consultar su historial.</p> : null}
          {!context.parameters ? <p role="alert" className="error-message">El semestre no tiene parámetros disponibles para guardar una configuración.</p> :
            account.role === "administrator" && context.subject.is_active ? <ConfigurationForm key={context.current?.id ?? "initial"} subjectId={subjectId} semesterId={semesterId} parameters={context.parameters} current={context.current} /> : null}
        </section>
        <section className="panel"><h2>Historial de configuración</h2>
          {context.revisions.length ? <div className="table-scroll"><table><caption className="table-caption">Se conservan las revisiones anteriores con su responsable y fecha.</caption>
            <thead><tr><th scope="col">Revisión</th><th scope="col">Sesiones por semana</th><th scope="col">Duración en minutos</th><th scope="col">Responsable</th><th scope="col">Fecha</th><th scope="col">Estado</th></tr></thead>
            <tbody>{context.revisions.map(revision => { const previous = revision.previous_revision_id ? previousById.get(revision.previous_revision_id) : null; return <tr key={revision.id}>
              <td>{revision.revision_number}</td><td>{previous?.sessions_per_week ?? "Inicial"} → {revision.sessions_per_week}</td><td>{previous?.session_duration_minutes ?? "Inicial"} → {revision.session_duration_minutes}</td><td>{revision.actor_email}</td>
              <td>{new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(revision.created_at))}</td><td>{revision.id === context.current?.id ? "Vigente" : "Anterior"}</td>
            </tr>; })}</tbody>
          </table></div> : <p className="empty-state">Todavía no hay revisiones registradas.</p>}
        </section>
      </> : <section className="panel"><p className="empty-state">Selecciona una asignatura y un semestre para consultar o registrar su configuración.</p></section>}
  </main>;
}
