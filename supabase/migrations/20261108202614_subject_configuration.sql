create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  current_parameter_revision_id uuid,
  unique(faculty_id,name)
);
create table public.semester_parameter_revisions (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete restrict,
  revision_number integer not null check(revision_number > 0),
  max_weekly_sessions integer not null check(max_weekly_sessions > 0),
  session_duration_minutes integer not null check(session_duration_minutes > 0),
  group_capacity integer not null check(group_capacity > 0),
  group_minimum integer not null check(group_minimum >= 0 and group_minimum <= group_capacity),
  group_tolerance_percent numeric not null check(group_tolerance_percent >= 0),
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  actor_email text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(semester_id,revision_number),
  unique(id,semester_id)
);
create index semester_parameter_revisions_created_by_idx on public.semester_parameter_revisions(created_by);
alter table public.semesters add constraint semester_current_parameters_fk
  foreign key(current_parameter_revision_id,id) references public.semester_parameter_revisions(id,semester_id) on delete restrict;
create index semesters_current_parameters_idx on public.semesters(current_parameter_revision_id,id);

create table public.subject_configurations (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  current_revision_id uuid,
  unique(subject_id,semester_id)
);
create index subject_configurations_semester_id_idx on public.subject_configurations(semester_id);
create table public.subject_configuration_revisions (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references public.subject_configurations(id) on delete restrict,
  revision_number integer not null check(revision_number > 0),
  previous_revision_id uuid,
  parameter_revision_id uuid not null references public.semester_parameter_revisions(id) on delete restrict,
  sessions_per_week integer not null check(sessions_per_week > 0),
  session_duration_minutes integer not null check(session_duration_minutes > 0),
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  actor_email text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(configuration_id,revision_number),
  unique(id,configuration_id),
  foreign key(previous_revision_id,configuration_id) references public.subject_configuration_revisions(id,configuration_id) on delete restrict
);
create index subject_configuration_revisions_parameter_idx on public.subject_configuration_revisions(parameter_revision_id);
create index subject_configuration_revisions_created_by_idx on public.subject_configuration_revisions(created_by);
create index subject_configuration_revisions_previous_idx on public.subject_configuration_revisions(previous_revision_id,configuration_id);
alter table public.subject_configurations add constraint configuration_current_revision_fk
  foreign key(current_revision_id,id) references public.subject_configuration_revisions(id,configuration_id) on delete restrict;
create index subject_configurations_current_revision_idx on public.subject_configurations(current_revision_id,id);

alter table public.semesters enable row level security;
alter table public.semester_parameter_revisions enable row level security;
alter table public.subject_configurations enable row level security;
alter table public.subject_configuration_revisions enable row level security;
revoke all on public.semesters,public.semester_parameter_revisions,public.subject_configurations,public.subject_configuration_revisions from public,anon,authenticated,service_role;
grant select on public.semesters,public.semester_parameter_revisions,public.subject_configurations,public.subject_configuration_revisions to authenticated;
create policy semesters_read_planners on public.semesters for select to authenticated
using ((select private.current_app_role()) in ('administrator','director') and exists(select 1 from public.faculties f where f.id=faculty_id));
create policy semester_parameters_read_planners on public.semester_parameter_revisions for select to authenticated
using ((select private.current_app_role()) in ('administrator','director') and exists(select 1 from public.semesters s where s.id=semester_id));
create policy configurations_read_planners on public.subject_configurations for select to authenticated
using ((select private.current_app_role()) in ('administrator','director')
  and exists(select 1 from public.subjects s where s.id=subject_id)
  and exists(select 1 from public.semesters s where s.id=semester_id));
create policy configuration_revisions_read_planners on public.subject_configuration_revisions for select to authenticated
using ((select private.current_app_role()) in ('administrator','director')
  and exists(select 1 from public.subject_configurations c where c.id=configuration_id));

-- Escritura atómica sin conceder INSERT/UPDATE directo sobre revisiones.
-- La función privilegiada permanece en private, fija search_path y comprueba
-- identidad y rol vigente; el responsable nunca llega del payload del cliente.
create function private.save_subject_configuration(
  p_subject_id uuid,p_semester_id uuid,p_sessions_per_week integer,
  p_session_duration_minutes integer,p_parameter_revision_id uuid,p_expected_revision_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  semester_row public.semesters%rowtype;
  parameters_row public.semester_parameter_revisions%rowtype;
  config_row public.subject_configurations%rowtype;
  previous_number integer := 0;
  revision_row public.subject_configuration_revisions%rowtype;
  actor uuid := (select auth.uid());
  email text;
begin
  if actor is null or (select private.current_app_role()) is distinct from 'administrator' then
    raise exception using errcode='42501',message='configuration_permission_denied';
  end if;
  select * into semester_row from public.semesters where id=p_semester_id for share;
  if not found then raise exception using errcode='23503',message='invalid_semester'; end if;
  if not exists(select 1 from public.subjects s join public.programs p on p.id=s.program_id
    join public.faculties f on f.id=p.faculty_id
    where s.id=p_subject_id and s.is_active and p.is_active and f.id=semester_row.faculty_id and f.name='Facultad de Ingeniería') then
    raise exception using errcode='23503',message='invalid_subject';
  end if;
  if semester_row.current_parameter_revision_id is null or p_parameter_revision_id is distinct from semester_row.current_parameter_revision_id then
    raise exception using errcode='40001',message='stale_parameters';
  end if;
  select * into strict parameters_row from public.semester_parameter_revisions where id=semester_row.current_parameter_revision_id;
  if p_sessions_per_week is null or p_sessions_per_week<1 or p_sessions_per_week>parameters_row.max_weekly_sessions then
    raise exception using errcode='22023',message='invalid_frequency';
  end if;
  if p_session_duration_minutes is distinct from parameters_row.session_duration_minutes then
    raise exception using errcode='22023',message='invalid_duration';
  end if;
  insert into public.subject_configurations(subject_id,semester_id) values(p_subject_id,p_semester_id)
    on conflict(subject_id,semester_id) do nothing;
  select * into strict config_row from public.subject_configurations where subject_id=p_subject_id and semester_id=p_semester_id for update;
  if p_expected_revision_id is distinct from config_row.current_revision_id then
    raise exception using errcode='40001',message='stale_configuration';
  end if;
  if config_row.current_revision_id is not null then
    select revision_number into strict previous_number from public.subject_configuration_revisions where id=config_row.current_revision_id;
  end if;
  select u.email into strict email from auth.users u where u.id=actor;
  insert into public.subject_configuration_revisions(configuration_id,revision_number,previous_revision_id,parameter_revision_id,sessions_per_week,session_duration_minutes,created_by,actor_email)
  values(config_row.id,previous_number+1,config_row.current_revision_id,parameters_row.id,p_sessions_per_week,parameters_row.session_duration_minutes,actor,email)
  returning * into revision_row;
  update public.subject_configurations set current_revision_id=revision_row.id where id=config_row.id;
  return to_jsonb(revision_row);
end $$;
revoke all on function private.save_subject_configuration(uuid,uuid,integer,integer,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function private.save_subject_configuration(uuid,uuid,integer,integer,uuid,uuid) to authenticated;
create function public.save_subject_configuration(
  p_subject_id uuid,p_semester_id uuid,p_sessions_per_week integer,
  p_session_duration_minutes integer,p_parameter_revision_id uuid,p_expected_revision_id uuid default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.save_subject_configuration(p_subject_id,p_semester_id,p_sessions_per_week,p_session_duration_minutes,p_parameter_revision_id,p_expected_revision_id)
$$;
revoke all on function public.save_subject_configuration(uuid,uuid,integer,integer,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.save_subject_configuration(uuid,uuid,integer,integer,uuid,uuid) to authenticated;

-- Período aprobado explícitamente; sin fechas, frecuencias ni grupos inventados.
insert into public.semesters(faculty_id,name)
select id,'2026-2' from public.faculties where name='Facultad de Ingeniería'
on conflict(faculty_id,name) do nothing;
insert into public.semester_parameter_revisions(semester_id,revision_number,max_weekly_sessions,session_duration_minutes,group_capacity,group_minimum,group_tolerance_percent,created_by,actor_email)
select s.id,1,4,120,40,10,10,p.id,u.email
from public.semesters s join public.faculties f on f.id=s.faculty_id
cross join public.user_profiles p join auth.users u on u.id=p.id
where s.name='2026-2' and f.name='Facultad de Ingeniería'
  and u.email='dsramireza@unbosque.edu.co' and p.role='administrator' and p.is_active
on conflict(semester_id,revision_number) do nothing;
update public.semesters s set current_parameter_revision_id=p.id
from public.semester_parameter_revisions p where p.semester_id=s.id and p.revision_number=1 and s.current_parameter_revision_id is null;
