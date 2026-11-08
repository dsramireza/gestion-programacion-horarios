"use client";
import Link from "next/link";
import { useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { groupCodeError,normalizedGroupCode,validateGroup } from "../../lib/groups/validation";
import type { GroupErrors,GroupSemester,GroupView } from "../../lib/groups/types";
type Subject={id:string;code:string;name:string;is_active:boolean};
export function GroupForm({semesters,subjects,group,initialSemester="",initialSubject=""}:{semesters:GroupSemester[];subjects:Subject[];group?:GroupView;initialSemester?:string;initialSubject?:string}) {
  const router=useRouter();
  const [semesterId,setSemesterId]=useState(group?.semester_id || initialSemester || semesters[0]?.id || "");
  const [subjectId,setSubjectId]=useState(group?.subject_id || initialSubject);
  const [code,setCode]=useState(group?.code ?? "");
  const [errors,setErrors]=useState<GroupErrors>({});
  const [pending,setPending]=useState(false);
  const parameters=semesters.find(semester=>semester.id===semesterId)?.parameters;
  const subject=subjects.find(subject=>subject.id===subjectId);
  const codeError=subject ? groupCodeError(code,subject.code):undefined;
  const maximum=parameters ? Math.floor(parameters.group_capacity+parameters.group_capacity*Number(parameters.group_tolerance_percent)/100):null;
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const checked=validateGroup({subject_id:subjectId,semester_id:semesterId,code,student_count:form.get("student_count"),expected_parameter_revision_id:parameters?.id ?? "",expected_revision_number:group?.revision_number ?? null},subject?.code);
    if(!checked.errors.student_count && maximum!==null && checked.data.student_count>maximum) checked.errors.student_count=`El máximo tolerado es ${maximum}. No se guardó el conteo.`;
    setErrors(checked.errors);
    if(Object.keys(checked.errors).length) return;
    setPending(true);
    try {
      const response=await fetch(group ? `/api/groups/${group.id}`:"/api/groups",{method:group ? "PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(checked.data)});
      const result=await response.json();
      if(!response.ok) {setErrors(result.errors ?? {form:"No fue posible guardar. Verifica tu sesión e inténtalo de nuevo."});return;}
      router.push(`/grupos?semester=${semesterId}&subject=${subjectId}&saved=1`);router.refresh();
    } catch {setErrors({form:"No fue posible conectar. Tus cambios no se han confirmado; inténtalo de nuevo."});}
    finally {setPending(false);}
  }
  return <form onSubmit={submit} className="subject-form" aria-busy={pending}>
    {Object.keys(errors).length ? <p role="alert" className="error-message">{errors.form ?? Object.values(errors).join(" ")}</p>:null}
    <fieldset disabled={pending}><div className="form-grid">
      <div className="field"><label htmlFor="semester_id">Semestre</label><select id="semester_id" name="semester_id" value={semesterId} onChange={event=>setSemesterId(event.target.value)} disabled={Boolean(group)} required><option value="">Selecciona un semestre</option>{semesters.map(semester=><option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></div>
      <div className="field"><label htmlFor="subject_id">Asignatura</label><select id="subject_id" name="subject_id" value={subjectId} onChange={event=>setSubjectId(event.target.value)} disabled={Boolean(group)} required><option value="">Selecciona una asignatura</option>{subjects.filter(subject=>subject.is_active || subject.id===group?.subject_id).map(subject=><option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}</select></div>
      <div className="field"><label htmlFor="code">Código del grupo</label><input id="code" name="code" value={code} onChange={event=>setCode(event.target.value)} required aria-invalid={Boolean(errors.code || codeError)} aria-describedby="group-code-hint group-code-error"/><p id="group-code-hint" className="form-note">Usa el sufijo del grupo, como G1 o G2. {subject && code.trim() && !codeError ? `Código completo: ${subject.code}${normalizedGroupCode(code,subject.code)}`:""}</p><p id="group-code-error" className="field-error">{codeError ?? errors.code}</p></div>
      <div className="field"><label htmlFor="student_count">Conteo agregado de estudiantes</label><input id="student_count" name="student_count" type="number" min="0" max={maximum ?? undefined} step="1" required defaultValue={group?.student_count ?? ""} aria-invalid={Boolean(errors.student_count)} aria-describedby="count-hint"/><p id="count-hint" className="form-note">El estado se calcula al guardar; no se registran datos individuales.</p></div>
    </div></fieldset>
    {parameters ? <p className="form-note">Límites heredados: mínimo {parameters.group_minimum}, capacidad {parameters.group_capacity}, tolerancia {parameters.group_tolerance_percent} % y máximo tolerado {maximum}. No se modifican individualmente.</p>:<p className="error-message" role="alert">El semestre no tiene parámetros disponibles.</p>}
    <div className="actions"><button className="button" type="submit" disabled={pending || !parameters}>{pending ? "Guardando…":"Guardar grupo"}</button><Link href="/grupos" className="text-link">Volver a grupos</Link></div>
  </form>;
}
