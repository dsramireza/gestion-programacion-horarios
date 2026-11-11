-- Extensión compatible: no cambia los IDs ni los valores escalares usados por HU-03/HU-04.
alter table public.semesters
  add column start_date date,
  add column end_date date,
  add column is_active boolean not null default false,
  add constraint semester_dates_coherent check (
    (start_date is null and end_date is null and not is_active)
    or (start_date is not null and end_date is not null and start_date <= end_date));
create unique index semesters_one_active_faculty_idx on public.semesters(faculty_id) where is_active;

alter table public.semester_parameter_revisions
  add column weekly_windows jsonb not null default '[{"day":1,"start_minute":420,"end_minute":1320},{"day":2,"start_minute":420,"end_minute":1320},{"day":3,"start_minute":420,"end_minute":1320},{"day":4,"start_minute":420,"end_minute":1320},{"day":5,"start_minute":420,"end_minute":1320},{"day":6,"start_minute":420,"end_minute":780}]',
  add column excluded_start_minute integer not null default 720,
  add column excluded_end_minute integer not null default 780,
  add column change_reason text,
  add column semester_snapshot jsonb,
  add column previous_revision_id uuid,
  add constraint semester_parameters_previous_fk foreign key(previous_revision_id,semester_id)
    references public.semester_parameter_revisions(id,semester_id) on delete restrict;
create index semester_parameters_previous_idx on public.semester_parameter_revisions(previous_revision_id,semester_id);

-- Fechas aprobadas. Los metadatos nuevos no se atribuyen retrospectivamente
-- al autor de la revisión inicial: su snapshot y motivo permanecen nulos.
update public.semesters s set start_date='2026-06-01',end_date='2026-12-31',is_active=true
from public.faculties f where f.id=s.faculty_id and f.name='Facultad de Ingeniería' and s.name='2026-2';

create function private.valid_semester_windows(windows jsonb,excluded_start integer,excluded_end integer,duration integer)
returns boolean language plpgsql immutable set search_path = '' as $$
declare w jsonb; days integer[] := '{}'; d integer; a integer; b integer;
begin
  if jsonb_typeof(windows) is distinct from 'array' or jsonb_array_length(windows) not between 1 and 7
    or excluded_start is null or excluded_end is null or duration is null or duration <= 0
    or excluded_start < 0 or excluded_end > 1440 or excluded_start >= excluded_end then return false; end if;
  for w in select value from jsonb_array_elements(windows) loop
    if jsonb_typeof(w) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(w)) <> 3
      or jsonb_typeof(w->'day') is distinct from 'number'
      or jsonb_typeof(w->'start_minute') is distinct from 'number'
      or jsonb_typeof(w->'end_minute') is distinct from 'number'
      or (w->>'day') !~ '^[0-9]+$' or (w->>'start_minute') !~ '^[0-9]+$' or (w->>'end_minute') !~ '^[0-9]+$'
      then return false; end if;
    d := (w->>'day')::integer; a := (w->>'start_minute')::integer; b := (w->>'end_minute')::integer;
    if d not between 1 and 7 or d=any(days) or a < 0 or b > 1440 or a >= b
      or greatest(least(b,excluded_start)-a,b-greatest(a,excluded_end),0) < duration then return false; end if;
    days := array_append(days,d);
  end loop;
  return true;
exception when numeric_value_out_of_range or invalid_text_representation then return false;
end $$;
revoke all on function private.valid_semester_windows(jsonb,integer,integer,integer) from public,anon,authenticated,service_role;
alter table public.semester_parameter_revisions add constraint semester_windows_valid
  check(private.valid_semester_windows(weekly_windows,excluded_start_minute,excluded_end_minute,session_duration_minutes));

create function private.save_semester_parameters(p_semester_id uuid,p_expected_revision_id uuid,p_values jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid()); email text; faculty uuid;
  semester_row public.semesters%rowtype; previous public.semester_parameter_revisions%rowtype;
  revision public.semester_parameter_revisions%rowtype;
  code text; first_date date; last_date date; active boolean; reason text;
  frequency integer; duration integer; capacity integer; minimum integer; tolerance numeric;
  excluded_start integer; excluded_end integer; key text;
begin
  if actor is null or (select private.current_app_role()) is distinct from 'administrator' then
    raise exception using errcode='42501',message='parameters_permission_denied'; end if;
  if jsonb_typeof(p_values) is distinct from 'object' then
    raise exception using errcode='22023',message='invalid_parameters'; end if;
  for key in select jsonb_object_keys(p_values) loop
    if key <> all(array['name','start_date','end_date','is_active','max_weekly_sessions','session_duration_minutes',
      'group_capacity','group_minimum','group_tolerance_percent','weekly_windows','excluded_start_minute','excluded_end_minute','change_reason']) then
      raise exception using errcode='22023',message='invalid_parameters'; end if;
  end loop;
  if jsonb_typeof(p_values->'name') is distinct from 'string' or jsonb_typeof(p_values->'change_reason') is distinct from 'string'
    or jsonb_typeof(p_values->'is_active') is distinct from 'boolean' then
    raise exception using errcode='22023',message='invalid_parameters'; end if;
  code := btrim(p_values->>'name'); reason := btrim(p_values->>'change_reason');
  if length(code) not between 1 and 80 or length(reason) not between 1 and 1000 then
    raise exception using errcode='22023',message='invalid_parameters'; end if;
  if coalesce(p_values->>'start_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_values->>'end_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception using errcode='22023',message='invalid_dates'; end if;
  begin
    first_date := (p_values->>'start_date')::date; last_date := (p_values->>'end_date')::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception using errcode='22023',message='invalid_dates';
  end;
  if first_date > last_date then raise exception using errcode='22023',message='invalid_dates'; end if;
  active := (p_values->>'is_active')::boolean;
  for key in select unnest(array['max_weekly_sessions','session_duration_minutes','group_capacity','group_minimum','excluded_start_minute','excluded_end_minute']) loop
    if jsonb_typeof(p_values->key) is distinct from 'number' or coalesce(p_values->>key,'') !~ '^[0-9]+$' then
      raise exception using errcode='22023',message='invalid_parameters'; end if;
  end loop;
  if jsonb_typeof(p_values->'group_tolerance_percent') is distinct from 'number' then
    raise exception using errcode='22023',message='invalid_parameters'; end if;
  begin
    frequency := (p_values->>'max_weekly_sessions')::integer; duration := (p_values->>'session_duration_minutes')::integer;
    capacity := (p_values->>'group_capacity')::integer; minimum := (p_values->>'group_minimum')::integer;
    tolerance := (p_values->>'group_tolerance_percent')::numeric;
    excluded_start := (p_values->>'excluded_start_minute')::integer; excluded_end := (p_values->>'excluded_end_minute')::integer;
  exception when numeric_value_out_of_range or invalid_text_representation then
    raise exception using errcode='22023',message='invalid_parameters';
  end;
  if frequency < 1 or duration <> 120 or capacity < 1 or minimum < 0 or minimum > capacity or tolerance < 0
    or floor(capacity::numeric*(1+tolerance/100)) > 2147483647 then
    raise exception using errcode='22023',message='invalid_parameters'; end if;
  if not private.valid_semester_windows(p_values->'weekly_windows',excluded_start,excluded_end,duration) then
    raise exception using errcode='22023',message='invalid_windows'; end if;

  -- Serializa cambios del semestre y la unicidad de activo en la Facultad.
  select id into strict faculty from public.faculties where name='Facultad de Ingeniería' for update;
  if p_semester_id is null then
    if p_expected_revision_id is not null then raise exception using errcode='40001',message='stale_parameters'; end if;
    insert into public.semesters(faculty_id,name,start_date,end_date,is_active)
      values(faculty,code,first_date,last_date,false) returning * into semester_row;
  else
    select * into semester_row from public.semesters where id=p_semester_id and faculty_id=faculty for update;
    if not found then raise exception using errcode='23503',message='invalid_semester'; end if;
    if p_expected_revision_id is distinct from semester_row.current_parameter_revision_id then
      raise exception using errcode='40001',message='stale_parameters'; end if;
  end if;
  if active and exists(select 1 from public.semesters where faculty_id=faculty and is_active and id<>semester_row.id) then
    raise exception using errcode='23505',message='another_active_semester'; end if;
  if semester_row.current_parameter_revision_id is not null then
    select * into strict previous from public.semester_parameter_revisions where id=semester_row.current_parameter_revision_id;
  end if;
  select u.email into strict email from auth.users u where u.id=actor;
  insert into public.semester_parameter_revisions(semester_id,revision_number,previous_revision_id,max_weekly_sessions,
    session_duration_minutes,group_capacity,group_minimum,group_tolerance_percent,weekly_windows,excluded_start_minute,excluded_end_minute,
    semester_snapshot,change_reason,created_by,actor_email)
  values(semester_row.id,coalesce(previous.revision_number,0)+1,semester_row.current_parameter_revision_id,frequency,duration,capacity,minimum,tolerance,
    p_values->'weekly_windows',excluded_start,excluded_end,
    jsonb_build_object('name',code,'start_date',first_date,'end_date',last_date,'is_active',active),reason,actor,email)
  returning * into revision;
  update public.semesters set name=code,start_date=first_date,end_date=last_date,is_active=active,current_parameter_revision_id=revision.id
    where id=semester_row.id;
  return to_jsonb(revision);
end $$;
revoke all on function private.save_semester_parameters(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.save_semester_parameters(uuid,uuid,jsonb) to authenticated;
create function public.save_semester_parameters(p_semester_id uuid,p_expected_revision_id uuid,p_values jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.save_semester_parameters(p_semester_id,p_expected_revision_id,p_values)
$$;
revoke all on function public.save_semester_parameters(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_semester_parameters(uuid,uuid,jsonb) to authenticated;
