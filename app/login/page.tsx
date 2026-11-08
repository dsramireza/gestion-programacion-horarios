import { redirect } from "next/navigation";
import { resolveAccess } from "../../lib/auth/access";
import { LoginForm } from "./login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const access = await resolveAccess();
  if (access.ok) redirect("/");
  return (
    <main className="login-shell">
      <section className="login-intro">
        <p className="eyebrow">Facultad de Ingeniería</p><h1>Gestión y Programación de Horarios</h1>
        <p>Organiza la programación académica desde un espacio compartido.</p>
      </section>
      <section className="panel" aria-labelledby="login-title">
        <p className="eyebrow">Acceso institucional</p><h2 id="login-title">Bienvenido</h2>
        <p>Ingresa con tu correo institucional y contraseña.</p><LoginForm />
      </section>
    </main>
  );
}
