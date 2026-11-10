import Link from "next/link";
import { requirePageAccess } from "../../../lib/auth/access";
import { createClient } from "../../../lib/supabase/server";
import { TeacherForm } from "../teacher-form";
export const dynamic = "force-dynamic";
export default async function NewTeacherPage() {
  await requirePageAccess(["administrator"]);
  const client = await createClient();
  const { data, error } = await client.from("programs").select("id,name,is_active").order("name");
  return <main className="workspace"><Link href="/docentes" className="text-link">Volver a docentes</Link><section className="panel">
    <p className="eyebrow">Administración</p><h1>Nuevo docente</h1>
    {error ? <p role="alert" className="error-message">No fue posible consultar los programas. Inténtalo de nuevo.</p> :
      data?.some(program => program.is_active) ? <TeacherForm programs={data} /> : <p className="empty-state">No hay programas activos disponibles. La carga de referencias requiere aprobación del responsable del proyecto.</p>}
  </section></main>;
}
