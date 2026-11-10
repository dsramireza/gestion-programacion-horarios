import Link from "next/link";
import { requirePageAccess } from "../../lib/auth/access";
import { createClient } from "../../lib/supabase/server";
import type { Program } from "../../lib/catalog/service";
import { queryTeachers, validTeacherFilters } from "../../lib/teachers/service";
import { ACADEMIC_RANKS, DEDICATIONS, type Teacher } from "../../lib/teachers/types";
export const dynamic = "force-dynamic";
type Search = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
export default async function TeachersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const account = await requirePageAccess(["administrator", "director"]);
  const params = await searchParams;
  const filters = { query: first(params.q).trim(), programId: first(params.program), dedication: first(params.dedication), state: first(params.state) || "all" };
  const valid = validTeacherFilters(filters);
  const client = await createClient();
  const [programResult, teacherResult] = await Promise.all([
    client.from("programs").select("id,name,is_active").order("name"),
    valid ? queryTeachers(client, filters) : Promise.resolve({ data: [], error: { message: "invalid_filters" } }),
  ]);
  const programs = (programResult.data ?? []) as Program[];
  const teachers = (teacherResult.data ?? []) as Teacher[];
  const programNames = new Map(programs.map(program => [program.id, program.name]));
  const hasFilters = Boolean(filters.query || filters.programId || filters.dedication || filters.state !== "all");
  const error = programResult.error || teacherResult.error;
  return (
    <main className="workspace">
      <Link href="/" className="text-link">Volver al inicio</Link>
      <header className="workspace-header catalog-heading">
        <div><p className="eyebrow">Facultad de Ingeniería</p><h1>Docentes</h1><p>Datos académicos y de dedicación para la programación.</p></div>
        {account.role === "administrator" ? <Link href="/docentes/nuevo" className="button">Nuevo docente</Link> : null}
      </header>
      {first(params.saved) === "1" ? <p role="status" className="success-message">El docente se guardó y el cambio quedó registrado en su historial.</p> : null}
      <section className="panel" aria-label="Listado de docentes">
        <form method="GET" className="catalog-filters" key={JSON.stringify(filters)}>
          <div className="field"><label htmlFor="search">Buscar por identificador, nombre o correo</label><input id="search" name="q" type="search" defaultValue={filters.query} /></div>
          <div className="field"><label htmlFor="program">Programa</label><select id="program" name="program" defaultValue={filters.programId}><option value="">Todos los programas</option>{programs.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></div>
          <div className="field"><label htmlFor="dedication">Dedicación</label><select id="dedication" name="dedication" defaultValue={filters.dedication}><option value="">Todas</option>{Object.entries(DEDICATIONS).map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}</select></div>
          <div className="field"><label htmlFor="state">Estado</label><select id="state" name="state" defaultValue={filters.state}><option value="all">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
          <button className="button" type="submit">Buscar</button><Link href="/docentes" className="text-link">Limpiar</Link>
        </form>
        {error ? <p role="alert" className="error-message">{valid ? "No fue posible consultar los docentes. Inténtalo de nuevo." : "Los filtros no son válidos. Limpia la búsqueda e inténtalo de nuevo."}</p> :
          teachers.length ? <div className="table-scroll"><table>
            <caption className="table-caption">{teachers.length} docentes {hasFilters ? "encontrados" : "registrados"}</caption>
            <thead><tr><th scope="col">Identificador</th><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Programa</th><th scope="col">Dedicación</th><th scope="col">Escalafón</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
            <tbody>{teachers.map(teacher => <tr key={teacher.id}>
              <td>{teacher.institutional_id}</td><td>{teacher.full_name}</td><td>{teacher.email}</td><td>{programNames.get(teacher.program_id)}</td>
              <td>{teacher.dedication}</td><td>{ACADEMIC_RANKS[teacher.academic_rank]}</td>
              <td><span className={teacher.is_active ? "badge badge-active" : "badge"}>{teacher.is_active ? "Activo" : "Inactivo"}</span></td>
              <td><Link href={`/docentes/${teacher.id}`} className="text-link" aria-label={`${account.role === "administrator" ? "Editar" : "Consultar"} ${teacher.full_name}`}>{account.role === "administrator" ? "Editar e historial" : "Ver historial"}</Link></td>
            </tr>)}</tbody>
          </table></div> : <p className="empty-state">{hasFilters ? "No hay docentes que coincidan con la búsqueda." : "Todavía no hay docentes registrados. La carga de datos requiere aprobación del responsable del proyecto."}</p>}
      </section>
    </main>
  );
}
