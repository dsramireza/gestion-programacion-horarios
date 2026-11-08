import { UUID } from "../catalog/validation";
import type { ConfigurationErrors, ConfigurationInput } from "./types";
export function validateConfiguration(value: unknown) {
  const raw: Record<string, unknown> = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const errors: ConfigurationErrors = {};
  const integer = (input: unknown) => typeof input === "number" ? input : typeof input === "string" && /^\d+$/.test(input) ? Number(input) : NaN;
  const data: ConfigurationInput = {
    subject_id: typeof raw.subject_id === "string" ? raw.subject_id : "",
    semester_id: typeof raw.semester_id === "string" ? raw.semester_id : "",
    parameter_revision_id: typeof raw.parameter_revision_id === "string" ? raw.parameter_revision_id : "",
    expected_revision_id: typeof raw.expected_revision_id === "string" ? raw.expected_revision_id : null,
    sessions_per_week: integer(raw.sessions_per_week), session_duration_minutes: integer(raw.session_duration_minutes),
  };
  if (!UUID.test(data.subject_id)) errors.subject_id = "Selecciona una asignatura válida.";
  if (!UUID.test(data.semester_id)) errors.semester_id = "Selecciona un semestre válido.";
  if (!UUID.test(data.parameter_revision_id)) errors.parameter_revision_id = "Los parámetros no son válidos. Recarga la página.";
  if (raw.expected_revision_id != null && (typeof raw.expected_revision_id !== "string" || !UUID.test(raw.expected_revision_id))) errors.expected_revision_id = "La revisión no es válida. Recarga la página.";
  if (!Number.isInteger(data.sessions_per_week) || data.sessions_per_week < 1 || data.sessions_per_week > 2147483647) errors.sessions_per_week = "La frecuencia debe ser un entero positivo dentro del límite del semestre.";
  if (!Number.isInteger(data.session_duration_minutes) || data.session_duration_minutes < 1 || data.session_duration_minutes > 2147483647) errors.session_duration_minutes = "La duración debe coincidir con los parámetros del semestre.";
  return { data, errors };
}
