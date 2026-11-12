import { UUID } from "../catalog/validation";
import { PILOT_SESSION_MINUTES,type ParameterErrors,type ParameterInput,type WeeklyWindow } from "./types";
const FIELDS = ["semester_id","expected_revision_id","name","start_date","end_date","is_active","max_weekly_sessions","session_duration_minutes","group_capacity","group_minimum","group_tolerance_percent","weekly_windows","excluded_start_minute","excluded_end_minute","change_reason"];
function dateValid(value: unknown): value is string {
  if (typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(value+"T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value;
}
const integer = (value: unknown): value is number => typeof value==="number" && Number.isInteger(value) && value>=0 && value<=2147483647;
export function validateParameters(value: unknown): {data: ParameterInput; errors: ParameterErrors} {
  const input = value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
  const errors: ParameterErrors = {};
  if (Object.keys(input).some(key=>!FIELDS.includes(key))) errors.form="La solicitud contiene campos no permitidos.";
  if (input.semester_id!==null && (typeof input.semester_id!=="string" || !UUID.test(input.semester_id))) errors.semester_id="Selecciona un semestre válido.";
  if (input.expected_revision_id!==null && (typeof input.expected_revision_id!=="string" || !UUID.test(input.expected_revision_id))) errors.expected_revision_id="Recarga los parámetros antes de guardar.";
  const name = typeof input.name==="string"?input.name.trim():"";
  const change_reason = typeof input.change_reason==="string"?input.change_reason.trim():"";
  if (!name || name.length>80) errors.name="El código del semestre debe tener entre 1 y 80 caracteres.";
  if (!change_reason || change_reason.length>1000) errors.change_reason="Indica un motivo de entre 1 y 1000 caracteres.";
  if (!dateValid(input.start_date)) errors.start_date="Indica una fecha inicial válida.";
  if (!dateValid(input.end_date)) errors.end_date="Indica una fecha final válida.";
  if (!errors.start_date && !errors.end_date && String(input.start_date)>String(input.end_date)) errors.end_date="La fecha final debe ser igual o posterior a la inicial.";
  if (typeof input.is_active!=="boolean") errors.is_active="Indica el estado del semestre.";
  for (const key of ["max_weekly_sessions","group_capacity"] as const) if (!integer(input[key]) || input[key]<1) errors[key]="Debe ser un entero positivo válido.";
  if (!integer(input.group_minimum) || (typeof input.group_capacity==="number" && input.group_minimum>input.group_capacity)) errors.group_minimum="El mínimo debe ser un entero entre cero y la capacidad.";
  if (input.session_duration_minutes!==PILOT_SESSION_MINUTES) errors.session_duration_minutes="La duración del piloto es de 120 minutos.";
  if (typeof input.group_tolerance_percent!=="number" || !Number.isFinite(input.group_tolerance_percent) || input.group_tolerance_percent<0
    || (typeof input.group_capacity==="number" && Math.floor(input.group_capacity*(1+input.group_tolerance_percent/100))>2147483647)) errors.group_tolerance_percent="Indica una tolerancia no negativa con un máximo de estudiantes válido.";
  const a=input.excluded_start_minute, b=input.excluded_end_minute;
  if (!integer(a) || !integer(b) || a>=b || b>1440) errors.excluded_start_minute="El bloque excluido debe tener inicio menor que fin, dentro del día.";
  const windows: WeeklyWindow[]=[]; const days=new Set<number>();
  if (!Array.isArray(input.weekly_windows) || input.weekly_windows.length<1 || input.weekly_windows.length>7) errors.weekly_windows="Habilita al menos un día y como máximo una franja por día.";
  else for (const entry of input.weekly_windows) {
    if (!entry || typeof entry!=="object" || Array.isArray(entry)) { errors.weekly_windows="Las franjas no son válidas."; continue; }
    const row=entry as Record<string,unknown>;
    if (Object.keys(row).length!==3 || !integer(row.day) || row.day<1 || row.day>7 || days.has(row.day)
      || !integer(row.start_minute) || !integer(row.end_minute) || row.start_minute>=row.end_minute || row.end_minute>1440) { errors.weekly_windows="Cada día habilitado admite una única franja con inicio menor que fin."; continue; }
    if (typeof a==="number" && typeof b==="number" && Math.max(Math.min(row.end_minute,a)-row.start_minute,row.end_minute-Math.max(row.start_minute,b),0)<PILOT_SESSION_MINUTES) errors.weekly_windows="Cada día habilitado debe permitir una sesión continua de 120 minutos fuera del bloque excluido.";
    days.add(row.day); windows.push({day:row.day,start_minute:row.start_minute,end_minute:row.end_minute});
  }
  return {data:{...input,name,change_reason,weekly_windows:windows.sort((x,y)=>x.day-y.day)} as ParameterInput,errors};
}
