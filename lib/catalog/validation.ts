export type SubjectInput = { code: string; name: string; program_id: string; credits: number; is_active: boolean };
export type FieldErrors = Partial<Record<keyof SubjectInput | "form", string>>;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateSubject(value: unknown): { data: SubjectInput; errors: FieldErrors } {
  const input: Record<string, unknown> = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const program_id = typeof input.program_id === "string" ? input.program_id : "";
  const rawCredits = input.credits;
  const credits = typeof rawCredits === "number" ? rawCredits : typeof rawCredits === "string" && /^\d+$/.test(rawCredits) ? Number(rawCredits) : NaN;
  const errors: FieldErrors = {};
  if (!code) errors.code = "El código de asignatura es obligatorio.";
  if (!name) errors.name = "El nombre es obligatorio.";
  if (!UUID.test(program_id)) errors.program_id = "Selecciona un programa válido.";
  if (!Number.isInteger(credits) || credits <= 0 || credits > 2147483647) errors.credits = "Los créditos deben ser un entero positivo válido.";
  if (typeof input.is_active !== "boolean") errors.is_active = "Indica si la asignatura está activa.";
  return { data: { code, name, program_id, credits, is_active: input.is_active === true }, errors };
}
