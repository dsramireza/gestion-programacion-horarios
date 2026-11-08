create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0)
);
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  is_active boolean not null default true,
  unique (faculty_id, name)
);
create index programs_faculty_id_idx on public.programs(faculty_id);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(btrim(code)) and length(code) > 0),
  name text not null check (length(btrim(name)) > 0),
  program_id uuid not null references public.programs(id) on delete restrict,
  credits integer not null check (credits > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index subjects_program_id_idx on public.subjects(program_id);

alter table public.faculties enable row level security;
alter table public.programs enable row level security;
alter table public.subjects enable row level security;
revoke all on public.faculties, public.programs, public.subjects from public, anon, authenticated, service_role;
grant select on public.faculties, public.programs, public.subjects to authenticated;
grant insert(code,name,program_id,credits,is_active), update(code,name,program_id,credits,is_active) on public.subjects to authenticated;

create policy faculties_read_catalog on public.faculties for select to authenticated
using ((select private.current_app_role()) in ('administrator','director') and name = 'Facultad de Ingeniería');
create policy programs_read_catalog on public.programs for select to authenticated
using ((select private.current_app_role()) in ('administrator','director') and exists (
  select 1 from public.faculties f where f.id = faculty_id
));
create policy subjects_read_catalog on public.subjects for select to authenticated
using ((select private.current_app_role()) in ('administrator','director') and exists (
  select 1 from public.programs p where p.id = program_id
));
create policy subjects_insert_administrator on public.subjects for insert to authenticated
with check ((select private.current_app_role()) = 'administrator');
create policy subjects_update_administrator on public.subjects for update to authenticated
using ((select private.current_app_role()) = 'administrator')
with check ((select private.current_app_role()) = 'administrator');

create function private.validate_subject()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.code := upper(btrim(new.code));
  new.name := btrim(new.name);
  if not exists (
    select 1 from public.programs p join public.faculties f on f.id = p.faculty_id
    where p.id = new.program_id and p.is_active and f.name = 'Facultad de Ingeniería'
  ) then
    raise exception using errcode = '23503', message = 'invalid_program';
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
revoke all on function private.validate_subject() from public, anon, authenticated, service_role;
create trigger validate_subject_before_write before insert or update on public.subjects
for each row execute function private.validate_subject();

-- Argumentos enlazados: la búsqueda literal no interpola expresiones de PostgREST.
-- SECURITY INVOKER conserva RLS y no concede acceso adicional.
create function public.search_subjects(p_query text default '', p_program_id uuid default null, p_is_active boolean default null)
returns setof public.subjects language sql stable security invoker set search_path = '' as $$
  select s.* from public.subjects s
  where (p_program_id is null or s.program_id = p_program_id)
    and (p_is_active is null or s.is_active = p_is_active)
    and (strpos(lower(s.code), lower(coalesce(p_query,''))) > 0
      or strpos(lower(s.name), lower(coalesce(p_query,''))) > 0)
$$;
revoke all on function public.search_subjects(text,uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.search_subjects(text,uuid,boolean) to authenticated;

-- Única carga aprobada: 1 programa y 7 asignaturas; G1/G2 se gestionan en HU-04.
insert into public.faculties(name) values ('Facultad de Ingeniería') on conflict(name) do nothing;
insert into public.programs(faculty_id,name)
select id,'Programa de Ingeniería de Sistemas' from public.faculties where name='Facultad de Ingeniería'
on conflict(faculty_id,name) do nothing;
insert into public.subjects(code,name,credits,program_id)
select v.code,v.name,v.credits,p.id from (values
  ('ISW2026-001','Ingeniería de Software 1',3),
  ('EDD2026-002','Estructuras de Datos',4),
  ('BDD2026-003','Bases de Datos',3),
  ('RED2026-004','Redes de Computadores',3),
  ('SIS2026-005','Sistemas Operativos',4),
  ('ARC2026-006','Arquitectura de Computadores',3),
  ('IAR2026-007','Inteligencia Artificial',3)
) as v(code,name,credits)
join public.programs p on p.name='Programa de Ingeniería de Sistemas'
join public.faculties f on f.id=p.faculty_id and f.name='Facultad de Ingeniería'
on conflict(code) do nothing;
