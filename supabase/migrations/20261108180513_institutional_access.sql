create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role in ('administrator','director','teacher','student')),
  is_active boolean not null default false,
  access_valid_after timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.access_audit (
  id bigint generated always as identity primary key,
  actor_email text not null,
  target_user_id uuid not null,
  previous_access jsonb,
  next_access jsonb not null,
  reason text not null check (length(btrim(reason)) > 0),
  created_at timestamptz not null default clock_timestamp()
);
create index access_audit_created_at_idx on public.access_audit (created_at desc);
create index access_audit_target_user_id_idx on public.access_audit (target_user_id);

revoke all on public.user_profiles, public.access_audit from public, anon, authenticated, service_role;
grant select on public.user_profiles, public.access_audit to authenticated;
alter table public.user_profiles enable row level security;
alter table public.access_audit enable row level security;

-- Solo consulta el acceso del solicitante. Se mantiene fuera del esquema expuesto.
create function private.current_app_role()
returns text language sql stable security definer set search_path = ''
as $$
  select p.role
  from public.user_profiles p
  join auth.users u on u.id = p.id
  join auth.sessions s on s.user_id = p.id
    and s.id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
  where p.id = (select auth.uid())
    and p.is_active
    and u.email ~* '^[^[:space:]@]+@unbosque[.]edu[.]co$'
    and u.email_confirmed_at is not null
    and s.created_at >= p.access_valid_after
    and (s.not_after is null or s.not_after > now())
$$;
revoke all on function private.current_app_role() from public, anon, authenticated, service_role;
grant execute on function private.current_app_role() to authenticated;

create policy user_profiles_read_self on public.user_profiles
  for select to authenticated
  using (id = (select auth.uid()) and (select private.current_app_role()) is not null);
create policy access_audit_read_administrator on public.access_audit
  for select to authenticated
  using ((select private.current_app_role()) = 'administrator');

-- Los cambios directos sin responsable/motivo administrativo se rechazan.
create function private.record_access_change()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  actor text := nullif(current_setting('app.access_actor', true), '');
  change_reason text := nullif(current_setting('app.access_reason', true), '');
begin
  if actor is null or change_reason is null then
    raise exception 'Use el procedimiento administrativo con responsable y motivo.';
  end if;
  insert into public.access_audit(actor_email, target_user_id, previous_access, next_access, reason)
  values (
    actor, new.id,
    case when tg_op = 'INSERT' then null else
      jsonb_build_object('role', old.role, 'is_active', old.is_active, 'access_valid_after', old.access_valid_after) end,
    jsonb_build_object('role', new.role, 'is_active', new.is_active, 'access_valid_after', new.access_valid_after),
    change_reason
  );
  return new;
end;
$$;
revoke all on function private.record_access_change() from public, anon, authenticated, service_role;
create trigger record_profile_access_change
after insert or update on public.user_profiles
for each row execute function private.record_access_change();

-- SECURITY INVOKER: solo el operador con acceso SQL privilegiado puede ejecutarla.
-- No se concede escritura al cliente ni se expone como RPC pública.
create function private.set_user_access(
  p_email text,
  p_role text,
  p_is_active boolean,
  p_actor_email text,
  p_reason text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  target_id uuid;
  normalized_email text := lower(btrim(p_email));
  actor text := lower(btrim(p_actor_email));
begin
  if normalized_email is null or normalized_email !~ '^[^[:space:]@]+@unbosque[.]edu[.]co$'
    or actor is null or actor !~ '^[^[:space:]@]+@unbosque[.]edu[.]co$' then
    raise exception 'Se requiere correo institucional válido.';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'Se requiere un motivo administrativo.';
  end if;
  if p_role is null or p_role not in ('administrator','director','teacher','student') or p_is_active is null then
    raise exception 'Rol o estado no válido.';
  end if;
  select id into target_id from auth.users where lower(email) = normalized_email;
  if target_id is null then raise exception 'La cuenta debe crearse primero en Supabase Auth.'; end if;
  if not exists (select 1 from auth.users where lower(email) = actor) then
    raise exception 'El responsable debe ser una cuenta institucional identificable.';
  end if;

  perform set_config('app.access_actor', actor, true);
  perform set_config('app.access_reason', btrim(p_reason), true);
  insert into public.user_profiles(id, role, is_active)
    values (target_id, p_role, p_is_active)
  on conflict(id) do update set
    role = excluded.role,
    is_active = excluded.is_active,
    access_valid_after = clock_timestamp(),
    updated_at = clock_timestamp();
  perform set_config('app.access_actor', '', true);
  perform set_config('app.access_reason', '', true);
  return target_id;
end;
$$;
revoke all on function private.set_user_access(text,text,boolean,text,text) from public, anon, authenticated, service_role;

comment on function private.set_user_access(text,text,boolean,text,text) is
'Administración por operador SQL autorizado. Los cambios invalidan las sesiones anteriores para la aplicación.';
comment on table public.user_profiles is
'Acceso administrado; no contiene contraseñas ni permite editar roles desde el cliente.';
