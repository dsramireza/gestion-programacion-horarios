import type { SemesterParameters } from "../configuration/types";
export type WeeklyWindow = { day: number; start_minute: number; end_minute: number };
export type SemesterRecord = {
  id: string; name: string; start_date: string | null; end_date: string | null;
  is_active: boolean; current_parameter_revision_id: string | null;
};
export type ParameterValues = {
  name: string; start_date: string; end_date: string; is_active: boolean;
  max_weekly_sessions: number; session_duration_minutes: number; group_capacity: number;
  group_minimum: number; group_tolerance_percent: number; weekly_windows: WeeklyWindow[];
  excluded_start_minute: number; excluded_end_minute: number; change_reason: string;
};
export type ParameterRevision = SemesterParameters & {
  weekly_windows: WeeklyWindow[]; excluded_start_minute: number; excluded_end_minute: number;
  previous_revision_id: string | null; semester_snapshot: Pick<SemesterRecord,"name"|"start_date"|"end_date"|"is_active"> | null;
  change_reason: string | null; actor_email: string; created_at: string;
};
export type ParameterInput = ParameterValues & { semester_id: string | null; expected_revision_id: string | null };
export type ParameterErrors = Partial<Record<keyof ParameterInput | "form", string>>;
export const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
export const PILOT_SESSION_MINUTES = 120;
export const INITIAL_WINDOWS: WeeklyWindow[] = Array.from({length:6},(_,index)=>({day:index+1,start_minute:420,end_minute:index===5?780:1320}));
export function minuteTime(value: number) { return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`; }
export function timeMinute(value: string) { return value==="24:00" ? 1440 : /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? Number(value.slice(0,2))*60+Number(value.slice(3)) : NaN; }
