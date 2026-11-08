"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Program, Subject } from "../../lib/catalog/service";
import { validateSubject, type FieldErrors } from "../../lib/catalog/validation";

function FieldError({ field, errors }: { field: keyof FieldErrors; errors: FieldErrors }) {
  return errors[field] ? <p id={`${field}-error`} className="field-error">{errors[field]}</p> : null;
}
export function SubjectForm({ programs, subject }: { programs: Program[]; subject?: Subject }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { code: form.get("code"), name: form.get("name"), program_id: form.get("program_id"), credits: form.get("credits"), is_active: form.get("is_active") === "on" };
    const checked = validateSubject(input);
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    setPending(true);
    try {
      const response = await fetch(subject ? `/api/subjects/${subject.id}` : "/api/subjects", {
        method: subject ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checked.data),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.errors ?? { form: "No fue posible guardar. Verifica tu sesión e inténtalo de nuevo." });
        return;
      }
      router.push("/asignaturas?saved=1");
      router.refresh();
    } catch {
      setErrors({ form: "No fue posible conectar. Tus cambios no se han confirmado; inténtalo de nuevo." });
    } finally { setPending(false); }
  }
  const description = (field: keyof FieldErrors) => errors[field] ? `${field}-error` : undefined;
  return (
    <form onSubmit={submit} className="subject-form" aria-busy={pending}>
      {Object.keys(errors).length ? <p role="alert" className="error-message">{errors.form ?? "Revisa los campos indicados. No se guardaron los cambios."}</p> : null}
      <fieldset disabled={pending}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="code">Código de asignatura</label>
            <input id="code" name="code" defaultValue={subject?.code ?? ""} required aria-invalid={Boolean(errors.code)} aria-describedby={["code-hint", description("code")].filter(Boolean).join(" ")} />
            <p id="code-hint" className="form-note">Usa el código base, sin el sufijo de grupo G1 o G2.</p>
            <FieldError field="code" errors={errors} />
          </div>
          <div className="field">
            <label htmlFor="credits">Créditos</label>
            <input id="credits" name="credits" type="number" min="1" step="1" defaultValue={subject?.credits ?? ""} required aria-invalid={Boolean(errors.credits)} aria-describedby={description("credits")} />
            <FieldError field="credits" errors={errors} />
          </div>
          <div className="field form-wide">
            <label htmlFor="name">Nombre de la asignatura</label>
            <input id="name" name="name" defaultValue={subject?.name ?? ""} required aria-invalid={Boolean(errors.name)} aria-describedby={description("name")} />
            <FieldError field="name" errors={errors} />
          </div>
          <div className="field form-wide">
            <label htmlFor="program_id">Programa</label>
            <select id="program_id" name="program_id" defaultValue={subject?.program_id ?? ""} required aria-invalid={Boolean(errors.program_id)} aria-describedby={description("program_id")}>
              <option value="">Selecciona un programa</option>
              {programs.map(program => <option key={program.id} value={program.id} disabled={!program.is_active}>{program.name}</option>)}
            </select>
            <FieldError field="program_id" errors={errors} />
          </div>
          <div className="field form-wide">
            <label className="checkbox-label"><input name="is_active" type="checkbox" defaultChecked={subject?.is_active ?? true} /> Asignatura activa</label>
            <p className="form-note">Al inactivarla se conservan su identidad, código y relaciones históricas.</p>
            <FieldError field="is_active" errors={errors} />
          </div>
        </div>
      </fieldset>
      <div className="actions">
        <button type="submit" disabled={pending || !programs.some(program => program.is_active)} className="button">{pending ? "Guardando…" : "Guardar asignatura"}</button>
        <Link href="/asignaturas" className="text-link">Cancelar</Link>
      </div>
    </form>
  );
}
