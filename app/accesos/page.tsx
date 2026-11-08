import Link from "next/link";
import { requirePageAccess } from "../../lib/auth/access";
import { createClient } from "../../lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function AccessAuditPage() {
  await requirePageAccess(["administrator"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("access_audit")
    .select("id, actor_email, target_user_id, reason, created_at")
    .order("created_at", { ascending: false }).limit(50);
  return (
    <main className="workspace">
      <Link href="/" className="text-link">Volver al inicio</Link>
      <section className="panel">
        <p className="eyebrow">Administración</p><h1>Historial de permisos</h1>
        <p>Últimos cambios administrativos de acceso. La creación de cuentas se realiza desde el procedimiento administrativo.</p>
        {error ? <p role="alert" className="error-message">No fue posible consultar el historial. Inténtalo de nuevo.</p> :
          data?.length ? <div className="table-scroll"><table>
            <thead><tr><th>Fecha</th><th>Responsable</th><th>Cuenta</th><th>Motivo</th></tr></thead>
            <tbody>{data.map((event) => <tr key={event.id}>
              <td>{new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(event.created_at))}</td>
              <td>{event.actor_email}</td><td className="identifier">{event.target_user_id}</td><td>{event.reason}</td>
            </tr>)}</tbody>
          </table></div> : <p className="empty-state">Todavía no hay cambios de permisos registrados.</p>}
      </section>
    </main>
  );
}
