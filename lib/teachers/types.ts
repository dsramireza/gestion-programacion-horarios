export const DEDICATIONS = { TC: "Tiempo completo", MT: "Medio tiempo", HC: "Hora cátedra" } as const;
export const ACADEMIC_RANKS = { auxiliar: "Auxiliar", asistente: "Asistente", asociado: "Asociado", titular: "Titular" } as const;
export type Dedication = keyof typeof DEDICATIONS;
export type AcademicRank = keyof typeof ACADEMIC_RANKS;
export function isDedication(value: unknown): value is Dedication {
  return typeof value === "string" && Object.hasOwn(DEDICATIONS, value);
}
export function isAcademicRank(value: unknown): value is AcademicRank {
  return typeof value === "string" && Object.hasOwn(ACADEMIC_RANKS, value);
}
export type Teacher = {
  id: string; institutional_id: string; full_name: string; email: string; program_id: string;
  dedication: Dedication; academic_rank: AcademicRank; is_active: boolean; revision_number: number;
  created_at: string; updated_at: string;
};
export type TeacherInput = {
  institutional_id: string; full_name: string; email: string; program_id: string;
  dedication: string; academic_rank: string; is_active: boolean; expected_revision_number: number | null;
};
export type TeacherErrors = Partial<Record<keyof TeacherInput | "form", string>>;
export type TeacherRevision = {
  id: string; teacher_id: string; revision_number: number; actor_email: string;
  previous_values: Teacher | null; next_values: Teacher; created_at: string;
};
export type TeacherFilters = { query: string; programId: string; dedication: string; state: string };
