import "server-only";
import { createClient } from "../supabase/server";
import { resolveAccess } from "../auth/access";
import { UUID, validateSubject, type FieldErrors } from "./validation";

export const SUBJECT_FIELDS = "id,code,name,program_id,credits,is_active,updated_at";
export type Subject = { id: string; code: string; name: string; program_id: string; credits: number; is_active: boolean; updated_at: string };
export type Program = { id: string; name: string; is_active: boolean };
export type CatalogFilters = { query: string; programId: string; state: string };
type Client = Awaited<ReturnType<typeof createClient>>;
export function querySubjects(client: Client, filters: CatalogFilters) {
  return client.rpc("search_subjects", {
    p_query: filters.query.trim(), p_program_id: filters.programId || null,
    p_is_active: filters.state === "active" ? true : filters.state === "inactive" ? false : null,
  }).select(SUBJECT_FIELDS).order("code");
}
export function validFilters(filters: CatalogFilters) {
  return (!filters.programId || UUID.test(filters.programId)) && ["", "all", "active", "inactive"].includes(filters.state);
}
type SaveResult = { ok: true; subject: Subject } | { ok: false; status: number; errors: FieldErrors };
export async function saveSubject(value: unknown, id?: string): Promise<SaveResult> {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator"]);
  if (!access.ok) return { ok: false, status: access.status, errors: { form: "No tienes permiso para guardar asignaturas." } };
  if (id !== undefined && !UUID.test(id)) return { ok: false, status: 404, errors: { form: "La asignatura no existe." } };
  const { data, errors } = validateSubject(value);
  if (Object.keys(errors).length) return { ok: false, status: 422, errors };
  const program = await client.from("programs").select("id").eq("id", data.program_id).eq("is_active", true).maybeSingle();
  if (program.error) return { ok: false, status: 503, errors: { form: "No fue posible validar el programa. Inténtalo de nuevo." } };
  if (!program.data) return { ok: false, status: 422, errors: { program_id: "El programa no está disponible en la facultad del piloto." } };
  const result = id
    ? await client.from("subjects").update(data).eq("id", id).select(SUBJECT_FIELDS).maybeSingle()
    : await client.from("subjects").insert(data).select(SUBJECT_FIELDS).single();
  if (result.error) {
    if (result.error.code === "23505") return { ok: false, status: 409, errors: { code: "El código ya pertenece a una asignatura, incluso si está inactiva." } };
    if (result.error.code === "23503") return { ok: false, status: 422, errors: { program_id: "El programa no está disponible en la facultad del piloto." } };
    if (result.error.code === "42501") return { ok: false, status: 403, errors: { form: "No tienes permiso para guardar asignaturas." } };
    return { ok: false, status: 503, errors: { form: "No fue posible guardar la asignatura. Inténtalo de nuevo." } };
  }
  if (!result.data) return { ok: false, status: 404, errors: { form: "La asignatura no existe." } };
  return { ok: true, subject: result.data as Subject };
}
