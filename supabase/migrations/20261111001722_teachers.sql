-- HU-05: docentes con datos de dedicación y escalafón, historial inmutable e inactivación sin borrado.
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  institutional_id text not null check (length(institutional_id) > 0 and institutional_id = upper(btrim(institutional_id))),
  full_name text not null check (length(full_name) > 0 and full_name = btrim(full_name)),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@unbosque[.]edu[.]co$'),
  program_id uuid not null references public.programs(id) on delete restrict,
  dedication text not null check (dedication in ('tiempo_completo','tres_cuartos','medio_tiempo','cuarto_tiempo')),
  academic_rank text not null check (academic_rank in ('auxiliar','asistente','asociado','titular')),
  is_active boolean not null default true,
  revision_number integer not null check (revision_number > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint teachers_institutional_id_unique unique (institutional_id),
  constraint teachers_email_unique unique (email)
);
create index teachers_program_id_idx on public.teachers(program_id);

-- Cada revisión conserva los valores vigentes en ese momento. Las sesiones y publicaciones
-- de HU-08/HU-12 pueden referenciar (teacher_id, revision_number) para fijar los datos usados.
create table public.teacher_revisions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  actor_id uuid not null references public.user_profiles(id) on delete restrict,
  actor_email text not null,
  previous_values jsonb,
  next_values jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (teacher_id, revision_number)
);
create index teacher_revisions_actor_idx on public.teacher_revisions(actor_id);

alter table public.teachers enable row level security;
alter table public.teacher_revisions enable row level security;
revoke all on public.teachers, public.teacher_revisions from public, anon, authenticated, service_role;
-- Sin INSERT, UPDATE ni DELETE directos: las escrituras pasan por save_teacher.
grant select on public.teachers, public.teacher_revisions to authenticated;

create policy teachers_read_planners on public.teachers for select to authenticated
using ((select private.current_app_role()) in ('administrator','director') and exists (
  select 1 from public.programs p where p.id = program_id
));
create policy teacher_history_read_planners on public.teacher_revisions for select to authenticated
using ((select private.current_app_role()) in ('administrator','director') and exists (
  select 1 from public.teachers t where t.id = teacher_id
));

create function private.save_teacher(
  p_institutional_id text, p_full_name text, p_email text, p_program_id uuid,
  p_dedication text, p_academic_rank text, p_is_active boolean,
  p_teacher_id uuid, p_expected_revision_number integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_email text;
  v_institutional_id text := upper(btrim(coalesce(p_institutional_id, '')));
  v_full_name text := btrim(coalesce(p_full_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_previous public.teachers%rowtype;
  v_teacher public.teachers%rowtype;
  v_constraint text;
begin
  if v_actor is null or coalesce((select private.current_app_role()), '') <> 'administrator' then
    raise exception using errcode = '42501', message = 'teacher_permission_denied';
  end if;
  if length(v_institutional_id) = 0 then raise exception using errcode = '22023', message = 'invalid_institutional_id'; end if;
  if length(v_full_name) = 0 then raise exception using errcode = '22023', message = 'invalid_full_name'; end if;
  if v_email !~ '^[^[:space:]@]+@unbosque[.]edu[.]co$' then raise exception using errcode = '22023', message = 'invalid_email'; end if;
  if p_dedication is null or p_dedication not in ('tiempo_completo','tres_cuartos','medio_tiempo','cuarto_tiempo') then raise exception using errcode = '22023', message = 'invalid_dedication'; end if;
  if p_academic_rank is null or p_academic_rank not in ('auxiliar','asistente','asociado','titular') then
    raise exception using errcode = '22023', message = 'invalid_academic_rank';
  end if;
  if p_is_active is null then raise exception using errcode = '22023', message = 'invalid_is_active'; end if;

  if p_teacher_id is not null then
    select * into v_previous from public.teachers where id = p_teacher_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'teacher_not_found'; end if;
    if p_expected_revision_number is distinct from v_previous.revision_number then
      raise exception using errcode = '40001', message = 'stale_teacher';
    end if;
  elsif p_expected_revision_number is not null then
    raise exception using errcode = '40001', message = 'stale_teacher';
  end if;

  -- Un programa inactivo solo se conserva en docentes que ya lo tenían asignado.
  perform 1 from public.programs p join public.faculties f on f.id = p.faculty_id
  where p.id = p_program_id and f.name = 'Facultad de Ingeniería'
    and (p.is_active or (p_teacher_id is not null and p.id = v_previous.program_id))
  for share of p;
  if not found then raise exception using errcode = '23503', message = 'invalid_program'; end if;

  if p_teacher_id is not null and v_previous.institutional_id = v_institutional_id and v_previous.full_name = v_full_name
    and v_previous.email = v_email and v_previous.program_id = p_program_id and v_previous.dedication = p_dedication
    and v_previous.academic_rank = p_academic_rank and v_previous.is_active = p_is_active then
    return to_jsonb(v_previous);
  end if;

  begin
    if p_teacher_id is null then
      insert into public.teachers(institutional_id, full_name, email, program_id, dedication, academic_rank, is_active, revision_number)
      values (v_institutional_id, v_full_name, v_email, p_program_id, p_dedication, p_academic_rank, p_is_active, 1)
      returning * into v_teacher;
    else
      update public.teachers set institutional_id = v_institutional_id, full_name = v_full_name, email = v_email,
        program_id = p_program_id, dedication = p_dedication, academic_rank = p_academic_rank, is_active = p_is_active,
        revision_number = revision_number + 1, updated_at = clock_timestamp()
      where id = p_teacher_id returning * into v_teacher;
    end if;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    raise exception using errcode = '23505',
      message = case when v_constraint = 'teachers_email_unique' then 'duplicate_email' else 'duplicate_institutional_id' end;
  end;

  select u.email into strict v_actor_email from auth.users u where u.id = v_actor;
  insert into public.teacher_revisions(teacher_id, revision_number, actor_id, actor_email, previous_values, next_values)
  values (v_teacher.id, v_teacher.revision_number, v_actor, v_actor_email,
    case when p_teacher_id is null then null else to_jsonb(v_previous) end, to_jsonb(v_teacher));
  return to_jsonb(v_teacher);
end $$;
revoke all on function private.save_teacher(text,text,text,uuid,text,text,boolean,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function private.save_teacher(text,text,text,uuid,text,text,boolean,uuid,integer) to authenticated;

create function public.save_teacher(
  p_institutional_id text, p_full_name text, p_email text, p_program_id uuid,
  p_dedication text, p_academic_rank text, p_is_active boolean,
  p_teacher_id uuid default null, p_expected_revision_number integer default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.save_teacher(p_institutional_id, p_full_name, p_email, p_program_id, p_dedication, p_academic_rank,
    p_is_active, p_teacher_id, p_expected_revision_number)
$$;
revoke all on function public.save_teacher(text,text,text,uuid,text,text,boolean,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.save_teacher(text,text,text,uuid,text,text,boolean,uuid,integer) to authenticated;

-- Búsqueda literal con argumentos enlazados; SECURITY INVOKER conserva RLS.
create function public.search_teachers(
  p_query text default '', p_program_id uuid default null, p_dedication text default null, p_is_active boolean default null
) returns setof public.teachers language sql stable security invoker set search_path = '' as $$
  select t.* from public.teachers t
  where (p_program_id is null or t.program_id = p_program_id)
    and (p_dedication is null or t.dedication = p_dedication)
    and (p_is_active is null or t.is_active = p_is_active)
    and (strpos(lower(t.institutional_id), lower(coalesce(p_query, ''))) > 0
      or strpos(lower(t.full_name), lower(coalesce(p_query, ''))) > 0
      or strpos(t.email, lower(coalesce(p_query, ''))) > 0)
$$;
revoke all on function public.search_teachers(text,uuid,text,boolean) from public, anon, authenticated, service_role;
grant execute on function public.search_teachers(text,uuid,text,boolean) to authenticated;

-- Sin carga inicial: los datos de docentes requieren aprobación del responsable del proyecto.
