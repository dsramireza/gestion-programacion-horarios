import Link from "next/link";
import { requirePageAccess } from "../../lib/auth/access";
import { createClient } from "../../lib/supabase/server";
import { querySubjects, validFilters, type Program, type Subject } from "../../lib/catalog/service";
export const dynamic = "force-dynamic";
type Search = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
export default async function SubjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const account = await requirePageAccess(["administrator", "director"]);
  const params = await searchParams;
  const filters = { query: first(params.q).trim(), programId: first(params.program), state: first(params.state) || "all" };
  const valid = validFilters(filters);
  const client = await createClient();
  const [programResult, subjectResult] = await Promise.all([
    client.from("programs").select("id,name,is_active").order("name"),
    valid ? querySubjects(client, filters) : Promise.resolve({ data: [], error: { message: "invalid_filters" } }),
  ]);
  const programs = (programResult.data ?? []) as Program[];
  const subjects = (subjectResult.data ?? []) as Subject[];
  const programNames = new Map(programs.map(program => [program.id, program.name]));
  const hasFilters = Boolean(filters.query || filters.programId || filters.state !== "all");
  const error = programResult.error || subjectResult.error;
  return (
    <main className="workspace">
      <Link href="/" className="text-link">Volver al inicio</Link>
      <header className="workspace-header catalog-heading">
        <div><p className="eyebrow">Facultad de Ingeniería</p><h1>Asignaturas</h1><p>Catálogo académico del programa.</p></div>
        {account.role === "administrator" ? <Link href="/asignaturas/nueva" className="button">Nueva asignatura</Link> : null}
      </header>
      {first(params.saved) === "1" ? <p role="status" className="success-message">La asignatura se guardó correctamente.</p> : null}
      <section className="panel" aria-label="Catálogo de asignaturas">
        <form method="GET" className="catalog-filters" key={JSON.stringify(filters)}>
          <div className="field"><label htmlFor="search">Buscar por código o nombre</label><input id="search" name="q" type="search" defaultValue={filters.query} /></div>
          <div className="field"><label htmlFor="program">Programa</label><select id="program" name="program" defaultValue={filters.programId}><option value="">Todos los programas</option>{programs.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></div>
          <div className="field"><label htmlFor="state">Estado</label><select id="state" name="state" defaultValue={filters.state}><option value="all">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
          <button className="button" type="submit">Buscar</button><Link href="/asignaturas" className="text-link">Limpiar</Link>
        </form>
        {error ? <p role="alert" className="error-message">{valid ? "No fue posible consultar el catálogo. Inténtalo de nuevo." : "Los filtros no son válidos. Limpia la búsqueda e inténtalo de nuevo."}</p> :
          subjects.length ? <div className="table-scroll"><table>
            <caption className="table-caption">{subjects.length} asignaturas {hasFilters ? "encontradas" : "en el catálogo"}</caption>
            <thead><tr><th scope="col">Código</th><th scope="col">Asignatura</th><th scope="col">Programa</th><th scope="col">Créditos</th><th scope="col">Estado</th>{account.role === "administrator" ? <th scope="col">Acciones</th> : null}</tr></thead>
            <tbody>{subjects.map(subject => <tr key={subject.id}>
              <td>{subject.code}</td><td>{subject.name}</td><td>{programNames.get(subject.program_id)}</td><td>{subject.credits}</td><td><span className={subject.is_active ? "badge badge-active" : "badge"}>{subject.is_active ? "Activo" : "Inactivo"}</span></td>
              {account.role === "administrator" ? <td><Link href={`/asignaturas/${subject.id}`} className="text-link" aria-label={`Editar ${subject.name}`}>Editar</Link></td> : null}
            </tr>)}</tbody>
          </table></div> : <p className="empty-state">{hasFilters ? "No hay asignaturas que coincidan con la búsqueda." : "Todavía no hay asignaturas en el catálogo."}</p>}
      </section>
    </main>
  );
}
