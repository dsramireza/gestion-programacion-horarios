import Link from "next/link";
import { requirePageAccess } from "../../lib/auth/access";
import { createClient } from "../../lib/supabase/server";
import { groupCatalog,groupReferences,validGroupFilters } from "../../lib/groups/service";
import { GROUP_REASONS,GROUP_STATES } from "../../lib/groups/types";
export const dynamic="force-dynamic";
type Search=Record<string,string|string[]|undefined>;
function first(value:string|string[]|undefined) {return Array.isArray(value) ? value[0] ?? "":value ?? "";}
const DEMAND_REASONS={closed:"No programable: cerrado",missing_configuration:"Sin configuración de frecuencia",inactive_subject:"Asignatura inactiva",parameters_changed:"Revisar conteo: cambiaron los parámetros",stale_configuration:"Revisar la configuración de frecuencia"};
export default async function GroupsPage({searchParams}:{searchParams:Promise<Search>}) {
  await requirePageAccess(["administrator","director"]);
  const params=await searchParams,client=await createClient();
  const references=await groupReferences(client);
  const filters={semesterId:first(params.semester) || references.semesters[0]?.id || "",subjectId:first(params.subject),state:first(params.state) || "all"};
  const valid=validGroupFilters(filters);
  const result=valid ? await groupCatalog(client,filters):null;
  const error=references.error || result?.error || !valid;
  return <main className="workspace"><Link href="/" className="text-link">Volver al inicio</Link>
    <header className="workspace-header catalog-heading"><div><p className="eyebrow">Programación académica</p><h1>Grupos y conteos</h1><p>Capacidad y estado calculados con los parámetros del semestre.</p></div><Link className="button" href={`/grupos/nuevo?semester=${filters.semesterId}&subject=${filters.subjectId}`}>Nuevo grupo</Link></header>
    {first(params.saved)==="1" ? <p role="status" className="success-message">El grupo se guardó y su estado se recalculó correctamente.</p>:null}
    <section className="panel"><form method="GET" className="catalog-filters" key={JSON.stringify(filters)}>
      <div className="field"><label htmlFor="semester">Semestre</label><select id="semester" name="semester" defaultValue={filters.semesterId} required>{references.semesters.map(semester=><option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></div>
      <div className="field"><label htmlFor="subject">Asignatura</label><select id="subject" name="subject" defaultValue={filters.subjectId}><option value="">Todas las asignaturas</option>{references.subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}</select></div>
      <div className="field"><label htmlFor="state">Estado</label><select id="state" name="state" defaultValue={filters.state}><option value="all">Todos</option>{Object.entries(GROUP_STATES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><button className="button" type="submit">Consultar</button>
    </form>
    {error ? <p className="error-message" role="alert">No fue posible consultar los grupos. Verifica los filtros e inténtalo de nuevo.</p>:
      result?.data.length ? <div className="table-scroll"><table><caption className="table-caption">Solo los grupos abiertos o en riesgo con configuración vigente se ofrecen para programación.</caption>
        <thead><tr><th scope="col">Grupo</th><th scope="col">Asignatura</th><th scope="col">Conteo</th><th scope="col">Estado y motivo</th><th scope="col">Demanda semanal</th><th scope="col">Acciones</th></tr></thead>
        <tbody>{result.data.map(group=><tr key={group.id}><td>{group.full_code}</td><td>{group.subject.name}</td><td>{group.student_count}</td><td><span className="badge">{GROUP_STATES[group.state]}</span><p className="form-note">{GROUP_REASONS[group.state_reason]}</p></td><td>{group.demand.programmable ? `${group.demand.sessions_per_week} sesiones × ${group.demand.session_duration_minutes} min (${group.demand.weekly_minutes} min/semana)`:DEMAND_REASONS[group.demand.reason]}</td><td><Link className="text-link" href={`/grupos/${group.id}`}>Editar e historial</Link></td></tr>)}</tbody>
      </table></div>:<p className="empty-state">No hay grupos registrados que coincidan con estos filtros. Los conteos se ingresan al crear cada grupo.</p>}
    </section></main>;
}
