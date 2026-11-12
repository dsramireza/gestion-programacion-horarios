"use client";
import { useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DAYS,INITIAL_WINDOWS,PILOT_SESSION_MINUTES,minuteTime,timeMinute,type ParameterErrors,type ParameterRevision,type SemesterRecord } from "../../lib/parameters/types";
import { validateParameters } from "../../lib/parameters/validation";
export function ParameterForm({semester,current,canEdit}:{semester:SemesterRecord|null;current:ParameterRevision|null;canEdit:boolean}) {
  const router=useRouter();
  const [errors,setErrors]=useState<ParameterErrors>({});
  const [pending,setPending]=useState(false);
  const duration=current?.session_duration_minutes??PILOT_SESSION_MINUTES;
  const [enabled,setEnabled]=useState(()=>new Set((current?.weekly_windows??INITIAL_WINDOWS).map(row=>row.day)));
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const number=(key:string)=>{const value=String(form.get(key)??"");return value.trim()?Number(value):NaN;};
    const checked=validateParameters({semester_id:semester?.id??null,expected_revision_id:current?.id??null,
      name:form.get("name"),start_date:form.get("start_date"),end_date:form.get("end_date"),is_active:form.get("is_active")==="on",
      max_weekly_sessions:number("max_weekly_sessions"),session_duration_minutes:duration,group_capacity:number("group_capacity"),
      group_minimum:number("group_minimum"),group_tolerance_percent:number("group_tolerance_percent"),change_reason:form.get("change_reason"),
      excluded_start_minute:timeMinute(String(form.get("excluded_start_minute"))),excluded_end_minute:timeMinute(String(form.get("excluded_end_minute"))),
      weekly_windows:[...enabled].map(day=>({day,start_minute:timeMinute(String(form.get(`start-${day}`))),end_minute:timeMinute(String(form.get(`end-${day}`)))})),
    });
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    setPending(true);
    try {
      const response=await fetch("/api/semester-parameters",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(checked.data)});
      const result=await response.json();
      if (!response.ok) {setErrors(result.errors??{form:"No fue posible guardar. Verifica tu sesión."});return;}
      router.replace(`/parametros?semester=${result.revision.semester_id}&saved=${result.revision.id}`);
      router.refresh();
    } catch {setErrors({form:"No fue posible conectar. Los cambios no se han confirmado; inténtalo de nuevo."});}
    finally {setPending(false);}
  }
  const error=(key:keyof ParameterErrors)=>errors[key]?<p className="field-error" id={`error-${key}`}>{errors[key]}</p>:null;
  return <form onSubmit={submit} className="subject-form" aria-busy={pending}>
    {Object.keys(errors).length?<p role="alert" className="error-message">{errors.form??Object.values(errors).join(" ")}</p>:null}
    {!canEdit?<p className="form-note">Tu rol permite consultar estos parámetros. Administrador registra las modificaciones.</p>:null}
    <fieldset disabled={pending||!canEdit}><legend>Semestre</legend><div className="form-grid">
      <div className="field"><label htmlFor="name">Código del semestre</label><input id="name" name="name" required maxLength={80} defaultValue={semester?.name??""} aria-invalid={!!errors.name}/>{error("name")}</div>
      <div className="field"><label htmlFor="is_active" className="checkbox-label"><input id="is_active" name="is_active" type="checkbox" defaultChecked={semester?.is_active??false}/>Semestre activo</label>{error("is_active")}</div>
      <div className="field"><label htmlFor="start_date">Fecha inicial</label><input id="start_date" name="start_date" type="date" required defaultValue={semester?.start_date??""} aria-invalid={!!errors.start_date}/>{error("start_date")}</div>
      <div className="field"><label htmlFor="end_date">Fecha final</label><input id="end_date" name="end_date" type="date" required defaultValue={semester?.end_date??""} aria-invalid={!!errors.end_date}/>{error("end_date")}</div>
    </div></fieldset>
    <fieldset disabled={pending||!canEdit}><legend>Sesiones y límites de grupo</legend><div className="form-grid">
      <div className="field"><label htmlFor="max_weekly_sessions">Máximo de sesiones semanales por asignatura</label><input id="max_weekly_sessions" name="max_weekly_sessions" type="number" min={1} max={2147483647} step={1} required defaultValue={current?.max_weekly_sessions??4} aria-invalid={!!errors.max_weekly_sessions}/>{error("max_weekly_sessions")}</div>
      <div className="field"><label htmlFor="duration">Duración por sesión</label><output id="duration">{duration} minutos</output><p className="form-note">Duración acordada para el piloto.</p></div>
      <div className="field"><label htmlFor="group_capacity">Capacidad objetivo</label><input id="group_capacity" name="group_capacity" type="number" min={1} max={2147483647} step={1} required defaultValue={current?.group_capacity??40} aria-invalid={!!errors.group_capacity}/>{error("group_capacity")}</div>
      <div className="field"><label htmlFor="group_minimum">Mínimo de estudiantes</label><input id="group_minimum" name="group_minimum" type="number" min={0} max={2147483647} step={1} required defaultValue={current?.group_minimum??10} aria-invalid={!!errors.group_minimum}/>{error("group_minimum")}</div>
      <div className="field"><label htmlFor="group_tolerance_percent">Tolerancia (%)</label><input id="group_tolerance_percent" name="group_tolerance_percent" type="number" min={0} step="any" required defaultValue={current?.group_tolerance_percent??10} aria-invalid={!!errors.group_tolerance_percent}/>{error("group_tolerance_percent")}</div>
    </div></fieldset>
    <fieldset disabled={pending||!canEdit}><legend>Días y franjas institucionales</legend>
      <p className="form-note">Una franja por día. Horas en formato HH:mm; el fin admite 24:00. Cada día habilitado debe permitir una sesión continua de 120 minutos fuera del bloque excluido.</p>
      <div className="semester-windows">{DAYS.map((label,index)=>{const day=index+1;const window=(current?.weekly_windows??INITIAL_WINDOWS).find(row=>row.day===day);return <div className="semester-window" key={day}>
        <label className="checkbox-label" htmlFor={`day-${day}`}><input id={`day-${day}`} type="checkbox" checked={enabled.has(day)} onChange={event=>setEnabled(previous=>{const next=new Set(previous);if(event.target.checked)next.add(day);else next.delete(day);return next;})}/>{label}</label>
        <div className="field"><label htmlFor={`start-${day}`}>Inicio · {label}</label><input id={`start-${day}`} name={`start-${day}`} type="time" required={enabled.has(day)} disabled={!enabled.has(day)} defaultValue={minuteTime(window?.start_minute??420)}/></div>
        <div className="field"><label htmlFor={`end-${day}`}>Fin · {label}</label><input id={`end-${day}`} name={`end-${day}`} type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" required={enabled.has(day)} disabled={!enabled.has(day)} defaultValue={minuteTime(window?.end_minute??1320)}/></div>
      </div>;})}</div>{error("weekly_windows")}
    </fieldset>
    <fieldset disabled={pending||!canEdit}><legend>Bloque excluido para todos los días</legend><div className="form-grid">
      <div className="field"><label htmlFor="excluded_start_minute">Inicio de exclusión</label><input id="excluded_start_minute" name="excluded_start_minute" type="time" required defaultValue={minuteTime(current?.excluded_start_minute??720)}/></div>
      <div className="field"><label htmlFor="excluded_end_minute">Fin de exclusión</label><input id="excluded_end_minute" name="excluded_end_minute" type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" required defaultValue={minuteTime(current?.excluded_end_minute??780)}/></div>
    </div>{error("excluded_start_minute")}</fieldset>
    {canEdit?<><p className="form-note">Guardar crea una revisión. Las configuraciones y los grupos que usen una revisión anterior quedarán pendientes de revisión en sus módulos. Sus datos e historiales se conservan.</p>
      <div className="field"><label htmlFor="change_reason">Motivo del cambio</label><input id="change_reason" name="change_reason" required maxLength={1000} disabled={pending} aria-invalid={!!errors.change_reason}/>{error("change_reason")}</div>
      <button className="button" type="submit" disabled={pending}>{pending?"Guardando…":semester?"Guardar nueva revisión":"Crear semestre"}</button></>:null}
  </form>;
}
