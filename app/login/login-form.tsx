"use client";
import { useActionState, useState, type FormEvent } from "react";
import { institutionalEmail } from "../../lib/auth/roles";
import { signIn } from "./actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: null });
  const [clientError, setClientError] = useState<string | null>(null);
  function validate(event: FormEvent<HTMLFormElement>) {
    if (!institutionalEmail(new FormData(event.currentTarget).get("email"))) {
      event.preventDefault();
      setClientError("Usa tu correo institucional del dominio unbosque.edu.co.");
    } else setClientError(null);
  }
  const error = clientError ?? state.error;
  return (
    <form action={action} onSubmit={validate} className="login-form" aria-describedby={error ? "login-error" : undefined}>
      <div className="field">
        <label htmlFor="email">Correo institucional</label>
        <input id="email" name="email" type="email" autoComplete="username" required
          onChange={() => setClientError(null)} aria-invalid={Boolean(clientError)} />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? <p id="login-error" role="alert" className="error-message">{error}</p> : null}
      <button type="submit" className="button" disabled={pending}>{pending ? "Verificando acceso…" : "Iniciar sesión"}</button>
      <p className="form-note">Para crear una cuenta o recuperar tu acceso, contacta a la administración del proyecto.</p>
    </form>
  );
}
