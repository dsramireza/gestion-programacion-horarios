import Link from "next/link";
import { requirePageAccess } from "../../lib/auth/access";
import { createClient } from "../../lib/supabase/server";
import { semesterCatalog,parameterContext } from "../../lib/parameters/service";
import { DAYS,minuteTime } from "../../lib/parameters/types";
import { ParameterForm } from "./parameter-form";
export const dynamic="force-dynamic";
const first=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;
export default async function ParametersPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const account=await requirePageAccess(["administrator","director"]);
  const client=await createClient();
  const [params,catalog]=await Promise.all([searchParams,semesterCatalog(client)]);
  const chosen=first(params.semester)??catalog.data.find(row=>row.is_active)?.id??catalog.data[0]?.id??"";
  const semester=catalog.data.find(row=>row.id===chosen)??null;
  const context=semester?await parameterContext(client,semester):null;
  const canEdit=account.role==="administrator";
  const unavailable=catalog.error||context?.error||(!semester && (chosen!=="new" || !canEdit));
  return <main className="workspace">
    <nav className="navigation" aria-label="Navegación de parámetros"><Link href="/">Inicio</Link><Link href="/parametros" aria-current="page">Parámetros del semestre</Link><Link href="/configuracion">Frecuencia y duración</Link><Link href="/grupos">Grupos y conteos</Link></nav>
    <header className="catalog-heading"><p className="eyebrow">Facultad de Ingeniería</p><h1>Parámetros del semestre</h1><p>Calendario, franjas institucionales y límites que orientan la programación académica.</p></header>
    <section className="panel"><form className="catalog-filters" method="get">
      <div className="field"><label htmlFor="semester">Semestre</label><select id="semester" name="semester" defaultValue={chosen}>{catalog.data.map(row=><option key={row.id} value={row.id}>{row.name}{row.is_active?" · Activo":" · Inactivo"}</option>)}{canEdit?<option value="new">Crear semestre</option>:null}</select></div><button className="button" type="submit">Consultar</button>
    </form></section>
    {unavailable?<section className="panel"><p role="alert" className="error-message">No fue posible consultar los parámetros. Selecciona un semestre disponible e inténtalo de nuevo.</p></section>:<>
      {context?.current && first(params.saved)===context.current.id?<p role="status" className="success-message">La nueva revisión se guardó correctamente. Consulta los datos pendientes de revisión antes de programar.</p>:null}
      <section className="panel"><h2>{semester?semester.name:"Nuevo semestre"}</h2><ParameterForm key={`${semester?.id??"new"}-${context?.current?.id??"initial"}`} semester={semester} current={context?.current??null} canEdit={canEdit}/></section>
      {context?<><section className="panel"><h2>Datos que requieren revisión</h2>
        <p>Una revisión anterior se conserva como evidencia. Para usar parámetros nuevos, revisa y guarda la configuración de la asignatura y el conteo del grupo en sus módulos.</p>
        {context.configurations.some(row=>row.needs_review)||context.groups.some(row=>row.needs_review)?<ul>
          {context.configurations.filter(row=>row.needs_review).map(row=><li key={row.id}><Link href={`/configuracion?semester=${semester!.id}`}>{row.code}</Link>: configuración pendiente{row.exceeds_limit?"; la frecuencia supera el máximo vigente":""}.</li>)}
          {context.groups.filter(row=>row.needs_review).map(row=><li key={row.id}><Link href={`/grupos/${row.id}`}>{row.code}</Link>: grupo pendiente{row.exceeds_limit?"; el conteo supera el máximo tolerado":""}.</li>)}
        </ul>:<p className="empty-state">Las configuraciones y los grupos existentes no tienen referencias pendientes de revisión.</p>}
      </section><section className="panel"><h2>Historial de parámetros</h2>
        {context.revisions.map(revision=><details key={revision.id} className="parameter-history"><summary>Revisión {revision.revision_number} · {revision.id===context.current?.id?"Vigente":"Anterior"} · {new Intl.DateTimeFormat("es-CO",{dateStyle:"short",timeStyle:"short",timeZone:"America/Bogota"}).format(new Date(revision.created_at))}</summary>
          <p>Responsable: {revision.actor_email}<br/>Motivo: {revision.change_reason??"Configuración inicial de HU-03. Las fechas y franjas se incorporaron posteriormente con HU-07."}</p>
          {revision.semester_snapshot?<p>Semestre {revision.semester_snapshot.name} · {revision.semester_snapshot.start_date} a {revision.semester_snapshot.end_date} · {revision.semester_snapshot.is_active?"Activo":"Inactivo"}</p>:<p className="form-note">La revisión inicial no registraba fechas ni estado del semestre en su historial.</p>}
          <p>Máximo {revision.max_weekly_sessions} sesiones de {revision.session_duration_minutes} minutos. Capacidad {revision.group_capacity}, mínimo {revision.group_minimum}, tolerancia {revision.group_tolerance_percent}%.</p>
          <ul>{revision.weekly_windows.map(window=><li key={window.day}>{DAYS[window.day-1]}: {minuteTime(window.start_minute)}–{minuteTime(window.end_minute)}</li>)}</ul><p>Bloque excluido: {minuteTime(revision.excluded_start_minute)}–{minuteTime(revision.excluded_end_minute)}.</p>
        </details>)}
      </section></>:null}
    </>}
  </main>;
}
