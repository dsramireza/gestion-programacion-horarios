-- Un conflicto de revisión es determinista. PT409 devuelve HTTP 409.
-- 40001 activa reintentos de transacción en PostgREST y puede impedir la respuesta.
-- https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b
create or replace function private.save_semester_parameters(p_semester_id uuid,p_expected_revision_id uuid,p_values jsonb)
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
    if p_expected_revision_id is not null then raise exception using errcode='PT409',message='stale_parameters'; end if;
    insert into public.semesters(faculty_id,name,start_date,end_date,is_active)
      values(faculty,code,first_date,last_date,false) returning * into semester_row;
  else
    select * into semester_row from public.semesters where id=p_semester_id and faculty_id=faculty for update;
    if not found then raise exception using errcode='23503',message='invalid_semester'; end if;
    if p_expected_revision_id is distinct from semester_row.current_parameter_revision_id then
      raise exception using errcode='PT409',message='stale_parameters'; end if;
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
