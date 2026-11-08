"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validateConfiguration } from "../../lib/configuration/validation";
import type { ConfigurationErrors, ConfigurationRevision, SemesterParameters } from "../../lib/configuration/types";
export function ConfigurationForm({ subjectId, semesterId, parameters, current }: {
  subjectId: string; semesterId: string; parameters: SemesterParameters; current: ConfigurationRevision | null;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<ConfigurationErrors>({});
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checked = validateConfiguration({ subject_id: subjectId, semester_id: semesterId,
      sessions_per_week: form.get("sessions_per_week"), session_duration_minutes: parameters.session_duration_minutes,
      parameter_revision_id: parameters.id, expected_revision_id: current?.id ?? null });
    if (!checked.errors.sessions_per_week && checked.data.sessions_per_week > parameters.max_weekly_sessions)
      checked.errors.sessions_per_week = `El máximo del semestre es ${parameters.max_weekly_sessions} sesiones semanales.`;
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    setPending(true);
    try {
      const response = await fetch("/api/subject-configurations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checked.data) });
      const result = await response.json();
      if (!response.ok) { setErrors(result.errors ?? { form: "No fue posible guardar. Verifica tu sesión e inténtalo de nuevo." }); return; }
      router.replace(`/configuracion?semester=${semesterId}&subject=${subjectId}&saved=1`);
      router.refresh();
    } catch { setErrors({ form: "No fue posible conectar. Tus cambios no se han confirmado; inténtalo de nuevo." }); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="subject-form" aria-busy={pending}>
    <h2>Nueva configuración</h2>
    <p className="form-note">Cada guardado conserva la configuración anterior en el historial.</p>
    {Object.keys(errors).length ? <p role="alert" className="error-message">{errors.form ?? Object.values(errors).filter(Boolean).join(" ")}</p> : null}
    <fieldset disabled={pending}><div className="form-grid">
      <div className="field"><label htmlFor="sessions_per_week">Sesiones por semana</label>
        <input id="sessions_per_week" name="sessions_per_week" type="number" min="1" max={parameters.max_weekly_sessions} step="1" required defaultValue={current?.sessions_per_week ?? ""} aria-invalid={Boolean(errors.sessions_per_week)} aria-describedby="frequency-hint" />
        <p id="frequency-hint" className="form-note">Entre 1 y {parameters.max_weekly_sessions} sesiones, según el semestre.</p>
      </div>
      <div className="field"><label htmlFor="duration">Duración por sesión</label><output id="duration">{parameters.session_duration_minutes} minutos ({parameters.session_duration_minutes / 60} horas)</output><p className="form-note">Definida por los parámetros del semestre.</p></div>
    </div></fieldset>
    <div className="actions"><button className="button" disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar nueva revisión"}</button></div>
  </form>;
}
