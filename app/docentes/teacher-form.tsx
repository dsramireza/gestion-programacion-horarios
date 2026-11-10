"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Program } from "../../lib/catalog/service";
import { ACADEMIC_RANKS, DEDICATIONS, type Teacher, type TeacherErrors } from "../../lib/teachers/types";
import { validateTeacher } from "../../lib/teachers/validation";

function FieldError({ field, errors }: { field: keyof TeacherErrors; errors: TeacherErrors }) {
  return errors[field] ? <p id={`${field}-error`} className="field-error">{errors[field]}</p> : null;
}
export function TeacherForm({ programs, teacher }: { programs: Program[]; teacher?: Teacher }) {
  const router = useRouter();
  const [errors, setErrors] = useState<TeacherErrors>({});
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checked = validateTeacher({
      institutional_id: form.get("institutional_id"), full_name: form.get("full_name"), email: form.get("email"),
      program_id: form.get("program_id"), dedication: form.get("dedication"), academic_rank: form.get("academic_rank"),
      is_active: form.get("is_active") === "on", expected_revision_number: teacher?.revision_number ?? null,
    });
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    setPending(true);
    try {
      const response = await fetch(teacher ? `/api/teachers/${teacher.id}` : "/api/teachers", {
        method: teacher ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checked.data),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.errors ?? { form: "No fue posible guardar. Verifica tu sesión e inténtalo de nuevo." });
        return;
      }
      router.push("/docentes?saved=1");
      router.refresh();
    } catch {
      setErrors({ form: "No fue posible conectar. Tus cambios no se han confirmado; inténtalo de nuevo." });
    } finally { setPending(false); }
  }
  const description = (field: keyof TeacherErrors) => errors[field] ? `${field}-error` : undefined;
  return (
    <form onSubmit={submit} className="subject-form" aria-busy={pending}>
      {Object.keys(errors).length ? <p role="alert" className="error-message">{errors.form ?? "Revisa los campos indicados. No se guardaron los cambios."}</p> : null}
      <fieldset disabled={pending}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="institutional_id">Identificador institucional</label>
            <input id="institutional_id" name="institutional_id" defaultValue={teacher?.institutional_id ?? ""} required aria-invalid={Boolean(errors.institutional_id)} aria-describedby={description("institutional_id")} />
            <FieldError field="institutional_id" errors={errors} />
          </div>
          <div className="field">
            <label htmlFor="email">Correo institucional</label>
            <input id="email" name="email" type="email" defaultValue={teacher?.email ?? ""} required aria-invalid={Boolean(errors.email)} aria-describedby={["email-hint", description("email")].filter(Boolean).join(" ")} />
            <p id="email-hint" className="form-note">Debe terminar en @unbosque.edu.co y no repetirse entre docentes.</p>
            <FieldError field="email" errors={errors} />
          </div>
          <div className="field form-wide">
            <label htmlFor="full_name">Nombre completo</label>
            <input id="full_name" name="full_name" defaultValue={teacher?.full_name ?? ""} required aria-invalid={Boolean(errors.full_name)} aria-describedby={description("full_name")} />
            <FieldError field="full_name" errors={errors} />
          </div>
          <div className="field form-wide">
            <label htmlFor="program_id">Programa</label>
            <select id="program_id" name="program_id" defaultValue={teacher?.program_id ?? ""} required aria-invalid={Boolean(errors.program_id)} aria-describedby={description("program_id")}>
              <option value="">Selecciona un programa</option>
              {programs.map(program => <option key={program.id} value={program.id} disabled={!program.is_active && program.id !== teacher?.program_id}>{program.name}</option>)}
            </select>
            <FieldError field="program_id" errors={errors} />
          </div>
          <div className="field">
            <label htmlFor="dedication">Dedicación</label>
            <select id="dedication" name="dedication" defaultValue={teacher?.dedication ?? ""} required aria-invalid={Boolean(errors.dedication)} aria-describedby={description("dedication")}>
              <option value="">Selecciona la dedicación</option>
              {Object.entries(DEDICATIONS).map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}
            </select>
            <FieldError field="dedication" errors={errors} />
          </div>
          <div className="field">
            <label htmlFor="academic_rank">Escalafón</label>
            <select id="academic_rank" name="academic_rank" defaultValue={teacher?.academic_rank ?? ""} required aria-invalid={Boolean(errors.academic_rank)} aria-describedby={description("academic_rank")}>
              <option value="">Selecciona el escalafón</option>
              {Object.entries(ACADEMIC_RANKS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <FieldError field="academic_rank" errors={errors} />
          </div>
          <div className="field form-wide">
            <label className="checkbox-label"><input name="is_active" type="checkbox" defaultChecked={teacher?.is_active ?? true} /> Docente activo</label>
            <p className="form-note">Al inactivarlo se conservan sus datos y el historial usado por horarios anteriores.</p>
            <FieldError field="is_active" errors={errors} />
          </div>
        </div>
      </fieldset>
      <div className="actions">
        <button type="submit" disabled={pending || !programs.some(program => program.is_active || program.id === teacher?.program_id)} className="button">{pending ? "Guardando…" : "Guardar docente"}</button>
        <Link href="/docentes" className="text-link">Cancelar</Link>
      </div>
    </form>
  );
}
