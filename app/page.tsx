import Link from "next/link";
import { requirePageAccess } from "../lib/auth/access";
import { ROLE_LABELS } from "../lib/auth/roles";
import { signOut } from "./login/actions";
export const dynamic = "force-dynamic";
export default async function Home() {
  const account = await requirePageAccess();
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div><p className="eyebrow">Facultad de Ingeniería</p><p className="account-email">{account.email}</p></div>
        <form action={signOut}><button className="button button-secondary">Cerrar sesión</button></form>
      </header>
      <nav aria-label="Navegación principal" className="navigation">
        <Link href="/" aria-current="page">Inicio</Link>
        {account.role === "administrator" || account.role === "director" ? <Link href="/asignaturas">Asignaturas</Link> : null}
        {account.role === "administrator" || account.role === "director" ? <Link href="/docentes">Docentes</Link> : null}
        {account.role === "administrator" || account.role === "director" ? <Link href="/configuracion">Frecuencia y duración</Link> : null}
        {account.role === "administrator" || account.role === "director" ? <Link href="/grupos">Grupos y conteos</Link> : null}
        {account.role === "administrator" || account.role === "director" ? <Link href="/parametros">Parámetros del semestre</Link> : null}
        {account.role === "administrator" ? <Link href="/accesos">Historial de permisos</Link> : null}
      </nav>
      <section className="panel">
        <p className="eyebrow">{ROLE_LABELS[account.role]}</p><h1>Tu espacio de programación académica</h1>
        <p>Tu sesión está activa. Los módulos académicos se incorporarán conforme avance el proyecto.</p>
      </section>
    </main>
  );
}
