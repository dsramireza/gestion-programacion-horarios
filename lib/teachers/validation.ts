import { institutionalEmail } from "../auth/roles";
import { UUID } from "../catalog/validation";
import { isAcademicRank, isDedication, type TeacherErrors, type TeacherInput } from "./types";

const FIELDS: readonly (keyof TeacherInput)[] = [
  "institutional_id", "full_name", "email", "program_id", "dedication", "academic_rank", "is_active", "expected_revision_number",
];
export function validateTeacher(value: unknown): { data: TeacherInput; errors: TeacherErrors } {
  const raw: Record<string, unknown> = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const text = (input: unknown) => typeof input === "string" ? input.trim() : "";
  const revision = raw.expected_revision_number;
  const data: TeacherInput = {
    institutional_id: text(raw.institutional_id).toUpperCase(),
    full_name: text(raw.full_name),
    email: text(raw.email).toLowerCase(),
    program_id: typeof raw.program_id === "string" ? raw.program_id : "",
    dedication: typeof raw.dedication === "string" ? raw.dedication : "",
    academic_rank: typeof raw.academic_rank === "string" ? raw.academic_rank : "",
    is_active: raw.is_active === true,
    expected_revision_number: revision == null || revision === "" ? null
      : typeof revision === "number" ? revision : typeof revision === "string" && /^\d+$/.test(revision) ? Number(revision) : NaN,
  };
  const errors: TeacherErrors = {};
  if (Object.keys(raw).some(key => !FIELDS.includes(key as keyof TeacherInput))) errors.form = "El docente solo admite sus datos académicos y de dedicación.";
  if (!data.institutional_id) errors.institutional_id = "El identificador institucional es obligatorio.";
  if (!data.full_name) errors.full_name = "El nombre es obligatorio.";
  if (!data.email) errors.email = "El correo institucional es obligatorio.";
  else if (!institutionalEmail(data.email)) errors.email = "Usa un correo institucional @unbosque.edu.co.";
  if (!UUID.test(data.program_id)) errors.program_id = "Selecciona un programa válido.";
  if (!isDedication(data.dedication)) errors.dedication = "Selecciona una dedicación válida.";
  if (!isAcademicRank(data.academic_rank)) errors.academic_rank = "Selecciona un escalafón válido.";
  if (typeof raw.is_active !== "boolean") errors.is_active = "Indica si el docente está activo.";
  if (data.expected_revision_number !== null && (!Number.isInteger(data.expected_revision_number) || data.expected_revision_number < 1))
    errors.expected_revision_number = "La revisión no es válida. Recarga la página.";
  return { data, errors };
}
