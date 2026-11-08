export const ROLES = ["administrator", "director", "teacher", "student"] as const;
export type AppRole = (typeof ROLES)[number];
export const ROLE_LABELS: Record<AppRole, string> = {
  administrator: "Administrador", director: "Director", teacher: "Docente", student: "Estudiante-consulta",
};
export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && ROLES.some((role) => role === value);
}
export function institutionalEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@unbosque\.edu\.co$/.test(email) ? email : null;
}
