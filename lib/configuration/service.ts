import "server-only";
import { createClient } from "../supabase/server";
import { resolveAccess } from "../auth/access";
import { validateConfiguration } from "./validation";
import type { ConfigurationErrors, ConfigurationHead, ConfigurationRevision, Semester, SemesterParameters } from "./types";
import type { Subject } from "../catalog/service";
type Client = Awaited<ReturnType<typeof createClient>>;
export async function configurationContext(client: Client, subjectId: string, semesterId: string) {
  const [subject, semester, head] = await Promise.all([
    client.from("subjects").select("id,code,name,is_active").eq("id", subjectId).maybeSingle(),
    client.from("semesters").select("id,name,current_parameter_revision_id").eq("id", semesterId).maybeSingle(),
    client.from("subject_configurations").select("id,subject_id,semester_id,current_revision_id").eq("subject_id", subjectId).eq("semester_id", semesterId).maybeSingle(),
  ]);
  if (subject.error || semester.error || head.error) return { ok: false as const, status: 503 as const };
  if (!subject.data || !semester.data) return { ok: false as const, status: 404 as const };
  const [parameters, history] = await Promise.all([
    semester.data.current_parameter_revision_id
      ? client.from("semester_parameter_revisions").select("id,semester_id,revision_number,max_weekly_sessions,session_duration_minutes,group_capacity,group_minimum,group_tolerance_percent").eq("id", semester.data.current_parameter_revision_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    head.data ? client.from("subject_configuration_revisions").select("*").eq("configuration_id", head.data.id).order("revision_number", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (parameters.error || history.error) return { ok: false as const, status: 503 as const };
  const revisions = (history.data ?? []) as ConfigurationRevision[];
  return { ok: true as const, context: {
    subject: subject.data as Pick<Subject,"id" | "code" | "name" | "is_active">,
    semester: semester.data as Semester, parameters: parameters.data as SemesterParameters | null,
    configuration: head.data as ConfigurationHead | null,
    current: revisions.find(revision => revision.id === head.data?.current_revision_id) ?? null,
    revisions,
  } };
}
type SaveResult = { ok: true; revision: ConfigurationRevision } | { ok: false; status: number; errors: ConfigurationErrors };
export async function saveConfiguration(value: unknown): Promise<SaveResult> {
  const client = await createClient();
  const access = await resolveAccess(client, ["administrator"]);
  if (!access.ok) return { ok: false, status: access.status, errors: { form: "No tienes permiso para guardar la configuración." } };
  const { data, errors } = validateConfiguration(value);
  if (Object.keys(errors).length) return { ok: false, status: 422, errors };
  const result = await client.rpc("save_subject_configuration", {
    p_subject_id: data.subject_id, p_semester_id: data.semester_id, p_sessions_per_week: data.sessions_per_week,
    p_session_duration_minutes: data.session_duration_minutes, p_parameter_revision_id: data.parameter_revision_id,
    p_expected_revision_id: data.expected_revision_id,
  });
  if (result.error) {
    const message = result.error.message;
    if (result.error.code === "42501") return { ok: false, status: 403, errors: { form: "No tienes permiso para guardar la configuración." } };
    if (message === "invalid_frequency") return { ok: false, status: 422, errors: { sessions_per_week: "La frecuencia debe estar entre 1 y el máximo del semestre." } };
    if (message === "invalid_duration") return { ok: false, status: 422, errors: { session_duration_minutes: "La duración debe coincidir con los parámetros del semestre." } };
    if (message === "invalid_subject") return { ok: false, status: 422, errors: { subject_id: "La asignatura debe estar activa y pertenecer a la facultad del semestre." } };
    if (message === "invalid_semester") return { ok: false, status: 422, errors: { semester_id: "El semestre no está disponible." } };
    if (result.error.code === "40001") return { ok: false, status: 409, errors: { form: "La configuración o los parámetros cambiaron. Recarga la página antes de guardar." } };
    return { ok: false, status: 503, errors: { form: "No fue posible guardar. Inténtalo de nuevo." } };
  }
  return { ok: true, revision: result.data as ConfigurationRevision };
}
