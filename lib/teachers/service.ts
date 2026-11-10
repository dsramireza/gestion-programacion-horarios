import "server-only";
import { createClient } from "../supabase/server";
import { resolveAccess } from "../auth/access";
import { UUID } from "../catalog/validation";
import { isDedication, type Teacher, type TeacherErrors, type TeacherFilters } from "./types";
import { validateTeacher } from "./validation";

export const TEACHER_FIELDS = "id,institutional_id,full_name,email,program_id,dedication,academic_rank,is_active,revision_number,created_at,updated_at";
type Client = Awaited<ReturnType<typeof createClient>>;
export function queryTeachers(client: Client, filters: TeacherFilters) {
  return client.rpc("search_teachers", {
    p_query: filters.query.trim(), p_program_id: filters.programId || null, p_dedication: filters.dedication || null,
    p_is_active: filters.state === "active" ? true : filters.state === "inactive" ? false : null,
  }).select(TEACHER_FIELDS).order("full_name");
}
export function validTeacherFilters(filters: TeacherFilters) {
  return (!filters.programId || UUID.test(filters.programId)) && (!filters.dedication || isDedication(filters.dedication))
    && ["", "all", "active", "inactive"].includes(filters.state);
}
export async function teacherWithHistory(client: Client, id: string) {
  const [teacher, history] = await Promise.all([
    client.from("teachers").select(TEACHER_FIELDS).eq("id", id).maybeSingle(),
    client.from("teacher_revisions").select("id,teacher_id,revision_number,actor_email,previous_values,next_values,created_at")
      .eq("teacher_id", id).order("revision_number", { ascending: false }),
  ]);
  return { teacher: teacher.data as Teacher | null, history: history.data ?? [], error: teacher.error || history.error };
}

const FIELD_ERRORS: Record<string, TeacherErrors> = {
  invalid_institutional_id: { institutional_id: "El identificador institucional es obligatorio." },
  invalid_full_name: { full_name: "El nombre es obligatorio." },
  invalid_email: { email: "Usa un correo institucional @unbosque.edu.co." },
  invalid_dedication: { dedication: "Selecciona una dedicación válida." },
  invalid_academic_rank: { academic_rank: "Selecciona un escalafón válido." },
  invalid_is_active: { is_active: "Indica si el docente está activo." },
  invalid_program: { program_id: "El programa no está disponible en la facultad del piloto." },
};
type SaveResult = { ok: true; teacher: Teacher } | { ok: false; status: number; errors: TeacherErrors };
export async function saveTeacher(value: unknown, id?: string): Promise<SaveResult> {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator"]);
  if (!access.ok) return { ok: false, status: access.status, errors: { form: "No tienes permiso para guardar docentes." } };
  if (id !== undefined && !UUID.test(id)) return { ok: false, status: 404, errors: { form: "El docente no existe." } };
  const { data, errors } = validateTeacher(value);
  if (Object.keys(errors).length) return { ok: false, status: 422, errors };
  if (id !== undefined && data.expected_revision_number === null)
    return { ok: false, status: 422, errors: { form: "Falta la revisión del docente. Recarga la página." } };
  const result = await client.rpc("save_teacher", {
    p_institutional_id: data.institutional_id, p_full_name: data.full_name, p_email: data.email, p_program_id: data.program_id,
    p_dedication: data.dedication, p_academic_rank: data.academic_rank, p_is_active: data.is_active,
    p_teacher_id: id ?? null, p_expected_revision_number: data.expected_revision_number,
  });
  if (result.error) {
    const message = result.error.message;
    if (result.error.code === "42501") return { ok: false, status: 403, errors: { form: "No tienes permiso para guardar docentes." } };
    if (message === "duplicate_email") return { ok: false, status: 409, errors: { email: "El correo ya pertenece a otro docente, incluso si está inactivo." } };
    if (message === "duplicate_institutional_id") return { ok: false, status: 409, errors: { institutional_id: "El identificador ya pertenece a otro docente, incluso si está inactivo." } };
    if (message === "teacher_not_found") return { ok: false, status: 404, errors: { form: "El docente no existe." } };
    if (FIELD_ERRORS[message]) return { ok: false, status: 422, errors: FIELD_ERRORS[message] };
    if (result.error.code === "40001") return { ok: false, status: 409, errors: { form: "El docente cambió mientras lo editabas. Recarga la página antes de guardar." } };
    return { ok: false, status: 503, errors: { form: "No fue posible guardar el docente. Inténtalo de nuevo." } };
  }
  return { ok: true, teacher: result.data as Teacher };
}
