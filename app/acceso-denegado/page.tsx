import Link from "next/link";
import { signOut } from "../login/actions";
export default function AccessDeniedPage() {
  return (
    <main className="message-shell panel">
      <p className="eyebrow">Acceso institucional</p><h1>No es posible acceder a esta sección</h1>
      <p>Tu cuenta necesita un permiso vigente. Si el problema continúa, contacta a la administración del proyecto.</p>
      <div className="actions"><Link href="/" className="text-link">Volver al inicio</Link>
        <form action={signOut}><button className="button">Volver a iniciar sesión</button></form>
      </div>
    </main>
  );
}
