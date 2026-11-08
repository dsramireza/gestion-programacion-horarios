import { UUID } from "../catalog/validation";
import type { GroupErrors, GroupInput } from "./types";
export function normalizedGroupCode(code: string, subjectCode: string) {
  const normalized = code.trim().toUpperCase();
  const full = /^(.+-\d+)-?(G\d+)$/.exec(normalized);
  if (full && full[1] === subjectCode) return full[2];
  return subjectCode && normalized.startsWith(subjectCode) ? normalized.slice(subjectCode.length) : normalized;
}
export function groupCodeError(code: string, subjectCode: string) {
  const normalized = code.trim().toUpperCase();
  const full = /^(.+-\d+)-?(G\d+)$/.exec(normalized);
  if (full && subjectCode && full[1] !== subjectCode) return "El código completo no coincide con la asignatura seleccionada. Ingresa solo el grupo, por ejemplo G1.";
  if (subjectCode && normalized === subjectCode) return "Falta el sufijo del grupo, por ejemplo G1.";
  return undefined;
}
export function validateGroup(value: unknown, subjectCode?: string) {
  const raw: Record<string,unknown> = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
  const integer = (input: unknown) => typeof input === "number" ? input : typeof input === "string" && /^\d+$/.test(input) ? Number(input) : NaN;
  const data: GroupInput = {
    subject_id: typeof raw.subject_id === "string" ? raw.subject_id : "", semester_id: typeof raw.semester_id === "string" ? raw.semester_id : "",
    code: typeof raw.code === "string" ? raw.code.trim().toUpperCase() : "", student_count: integer(raw.student_count),
    expected_parameter_revision_id: typeof raw.expected_parameter_revision_id === "string" ? raw.expected_parameter_revision_id : "",
    expected_revision_number: raw.expected_revision_number == null ? null : integer(raw.expected_revision_number),
  };
  const errors: GroupErrors = {};
  if (Object.keys(raw).some(key => !Object.hasOwn(data,key))) errors.form = "El grupo solo admite contexto, código y conteo. Los límites y el estado los calcula el servidor.";
  if (!UUID.test(data.subject_id)) errors.subject_id = "Selecciona una asignatura válida.";
  if (!UUID.test(data.semester_id)) errors.semester_id = "Selecciona un semestre válido.";
  if (!data.code) errors.code = "El código del grupo es obligatorio.";
  else if (subjectCode) {
    errors.code = groupCodeError(data.code,subjectCode);
    if (!errors.code) { delete errors.code; data.code = normalizedGroupCode(data.code,subjectCode); }
  }
  if (!Number.isInteger(data.student_count) || data.student_count<0 || data.student_count>2147483647) errors.student_count = "El conteo debe ser un entero no negativo dentro del máximo del semestre.";
  if (!UUID.test(data.expected_parameter_revision_id)) errors.expected_parameter_revision_id = "Recarga los parámetros del semestre.";
  if (data.expected_revision_number !== null && (!Number.isInteger(data.expected_revision_number) || data.expected_revision_number<1)) errors.expected_revision_number = "Recarga la revisión del grupo.";
  return { data, errors };
}
