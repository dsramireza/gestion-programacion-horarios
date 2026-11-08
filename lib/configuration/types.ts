export type Semester = { id: string; name: string; current_parameter_revision_id: string | null };
export type SemesterParameters = {
  id: string; semester_id: string; revision_number: number; max_weekly_sessions: number;
  session_duration_minutes: number; group_capacity: number; group_minimum: number; group_tolerance_percent: number;
};
export type ConfigurationRevision = {
  id: string; configuration_id: string; revision_number: number; previous_revision_id: string | null;
  parameter_revision_id: string; sessions_per_week: number; session_duration_minutes: number;
  created_by: string; actor_email: string; created_at: string;
};
export type ConfigurationHead = { id: string; subject_id: string; semester_id: string; current_revision_id: string | null };
export type ConfigurationInput = {
  subject_id: string; semester_id: string; sessions_per_week: number; session_duration_minutes: number;
  parameter_revision_id: string; expected_revision_id: string | null;
};
export type ConfigurationErrors = Partial<Record<keyof ConfigurationInput | "form", string>>;
