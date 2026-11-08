import type { ConfigurationHead, ConfigurationRevision } from "./types";
export type ProgrammableGroup = { id: string; subject_id: string; semester_id: string; state: "open" | "at_risk" | "closed" };
export function groupDemand(group: ProgrammableGroup, configuration: ConfigurationHead | null, revision: ConfigurationRevision | null) {
  if (group.state === "closed") return { group_id: group.id, programmable: false as const, reason: "closed" as const };
  if (!configuration || !revision || configuration.subject_id !== group.subject_id || configuration.semester_id !== group.semester_id
    || revision.configuration_id !== configuration.id || configuration.current_revision_id !== revision.id)
    return { group_id: group.id, programmable: false as const, reason: "missing_configuration" as const };
  return { group_id: group.id, programmable: true as const, configuration_revision_id: revision.id,
    parameter_revision_id: revision.parameter_revision_id, sessions_per_week: revision.sessions_per_week,
    session_duration_minutes: revision.session_duration_minutes,
    weekly_minutes: revision.sessions_per_week * revision.session_duration_minutes };
}
