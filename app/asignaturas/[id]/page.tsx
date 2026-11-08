import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAccess } from "../../../lib/auth/access";
import { createClient } from "../../../lib/supabase/server";
import { SUBJECT_FIELDS } from "../../../lib/catalog/service";
import { UUID } from "../../../lib/catalog/validation";
import { SubjectForm } from "../subject-form";
export const dynamic = "force-dynamic";
export default async function EditSubjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess(["administrator"]);
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const client = await createClient();
  const [subject, programs] = await Promise.all([
    client.from("subjects").select(SUBJECT_FIELDS).eq("id", id).maybeSingle(),
    client.from("programs").select("id,name,is_active").order("name"),
  ]);
  if (!subject.error && !subject.data) notFound();
  return <main className="workspace"><Link href="/asignaturas" className="text-link">Volver al catálogo</Link><section className="panel">
    <p className="eyebrow">Administración</p><h1>Editar asignatura</h1>
    {subject.error || programs.error ? <p role="alert" className="error-message">No fue posible consultar la asignatura. Inténtalo de nuevo.</p> : <SubjectForm programs={programs.data ?? []} subject={subject.data!} />}
  </section></main>;
}
