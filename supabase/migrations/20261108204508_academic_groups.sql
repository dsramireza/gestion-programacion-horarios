create table public.academic_groups (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  code text not null check(length(code)>0 and code=upper(btrim(code))),
  student_count integer not null check(student_count>=0),
  state text not null check(state in ('open','at_risk','closed')),
  state_reason text not null check(state_reason in ('below_minimum','within_capacity','within_tolerance')),
  parameter_revision_id uuid not null,
  revision_number integer not null check(revision_number>0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(subject_id,semester_id,code),
  foreign key(parameter_revision_id,semester_id) references public.semester_parameter_revisions(id,semester_id) on delete restrict
);
create index academic_groups_semester_idx on public.academic_groups(semester_id);
create index academic_groups_parameters_idx on public.academic_groups(parameter_revision_id,semester_id);
create table public.group_revisions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.academic_groups(id) on delete restrict,
  revision_number integer not null check(revision_number>0),
  actor_id uuid not null references public.user_profiles(id) on delete restrict,
  actor_email text not null,
  previous_values jsonb,
  next_values jsonb not null,
  validation_result text not null default 'accepted' check(validation_result='accepted'),
  created_at timestamptz not null default clock_timestamp(),
  unique(group_id,revision_number)
);
create index group_revisions_actor_idx on public.group_revisions(actor_id);
alter table public.academic_groups enable row level security;
alter table public.group_revisions enable row level security;
revoke all on public.academic_groups,public.group_revisions from public,anon,authenticated,service_role;
grant select on public.academic_groups,public.group_revisions to authenticated;
create policy groups_read_planners on public.academic_groups for select to authenticated
using ((select private.current_app_role()) in ('administrator','director')
 and exists(select 1 from public.subjects s where s.id=subject_id)
 and exists(select 1 from public.semesters s where s.id=semester_id));
create policy group_history_read_planners on public.group_revisions for select to authenticated
using ((select private.current_app_role()) in ('administrator','director')
 and exists(select 1 from public.academic_groups g where g.id=group_id));

create function private.save_academic_group(
 p_subject_id uuid,p_semester_id uuid,p_code text,p_student_count integer,
 p_expected_parameter_revision_id uuid,p_group_id uuid,p_expected_revision_number integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid := (select auth.uid());
 v_email text;
 v_semester public.semesters%rowtype;
 v_parameters public.semester_parameter_revisions%rowtype;
 v_subject public.subjects%rowtype;
 v_previous public.academic_groups%rowtype;
 v_group public.academic_groups%rowtype;
 v_code text := upper(regexp_replace(p_code,'^[[:space:]]+|[[:space:]]+$','','g'));
 v_maximum numeric;
 v_state text;
 v_reason text;
begin
 if v_actor is null or coalesce((select private.current_app_role()),'') not in ('administrator','director') then
  raise exception using errcode='42501',message='group_permission_denied';
 end if;
 select * into v_semester from public.semesters where id=p_semester_id for share;
 if not found then raise exception using errcode='23503',message='invalid_semester'; end if;
 if v_semester.current_parameter_revision_id is null or p_expected_parameter_revision_id is distinct from v_semester.current_parameter_revision_id then
  raise exception using errcode='40001',message='stale_parameters';
 end if;
 select * into strict v_parameters from public.semester_parameter_revisions where id=v_semester.current_parameter_revision_id;
 select s.* into v_subject from public.subjects s join public.programs p on p.id=s.program_id
  join public.faculties f on f.id=p.faculty_id
  where s.id=p_subject_id and f.id=v_semester.faculty_id and f.name='Facultad de Ingeniería'
   and (p_group_id is not null or (s.is_active and p.is_active)) for share of s,p;
 if not found then raise exception using errcode='23503',message='invalid_subject'; end if;
 if left(v_code,length(v_subject.code))=v_subject.code then v_code:=substr(v_code,length(v_subject.code)+1); end if;
 if v_code is null or length(v_code)=0 then raise exception using errcode='22023',message='invalid_group_code'; end if;
 v_maximum:=floor(v_parameters.group_capacity*(1+v_parameters.group_tolerance_percent/100));
 if p_student_count is null or p_student_count<0 or p_student_count>v_maximum then
  raise exception using errcode='22023',message='invalid_student_count';
 end if;
 if p_student_count<v_parameters.group_minimum then v_state:='closed'; v_reason:='below_minimum';
 elsif p_student_count<=v_parameters.group_capacity then v_state:='open'; v_reason:='within_capacity';
 else v_state:='at_risk'; v_reason:='within_tolerance'; end if;
 if p_group_id is null then
  if p_expected_revision_number is not null then raise exception using errcode='40001',message='stale_group'; end if;
  insert into public.academic_groups(subject_id,semester_id,code,student_count,state,state_reason,parameter_revision_id,revision_number)
   values(p_subject_id,p_semester_id,v_code,p_student_count,v_state,v_reason,v_parameters.id,1) returning * into v_group;
 else
  select * into v_previous from public.academic_groups where id=p_group_id for update;
  if not found then raise exception using errcode='P0002',message='group_not_found'; end if;
  if v_previous.subject_id<>p_subject_id or v_previous.semester_id<>p_semester_id then
   raise exception using errcode='22023',message='immutable_group_context';
  end if;
  if p_expected_revision_number is distinct from v_previous.revision_number then
   raise exception using errcode='40001',message='stale_group';
  end if;
  update public.academic_groups set code=v_code,student_count=p_student_count,state=v_state,state_reason=v_reason,
   parameter_revision_id=v_parameters.id,revision_number=revision_number+1,updated_at=clock_timestamp()
   where id=p_group_id returning * into v_group;
 end if;
 select u.email into strict v_email from auth.users u where u.id=v_actor;
 insert into public.group_revisions(group_id,revision_number,actor_id,actor_email,previous_values,next_values)
 values(v_group.id,v_group.revision_number,v_actor,v_email,
  case when p_group_id is null then null else to_jsonb(v_previous) end,
  to_jsonb(v_group)||jsonb_build_object('full_code',v_subject.code||v_group.code));
 return to_jsonb(v_group);
end $$;
revoke all on function private.save_academic_group(uuid,uuid,text,integer,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.save_academic_group(uuid,uuid,text,integer,uuid,uuid,integer) to authenticated;
create function public.save_academic_group(
 p_subject_id uuid,p_semester_id uuid,p_code text,p_student_count integer,
 p_expected_parameter_revision_id uuid,p_group_id uuid default null,p_expected_revision_number integer default null
) returns jsonb language sql security invoker set search_path='' as $$
 select private.save_academic_group(p_subject_id,p_semester_id,p_code,p_student_count,p_expected_parameter_revision_id,p_group_id,p_expected_revision_number)
$$;
revoke all on function public.save_academic_group(uuid,uuid,text,integer,uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.save_academic_group(uuid,uuid,text,integer,uuid,uuid,integer) to authenticated;
