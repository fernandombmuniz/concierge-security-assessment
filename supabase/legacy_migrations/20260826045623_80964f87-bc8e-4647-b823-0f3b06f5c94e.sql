-- 1) Move the SECURITY DEFINER role helper out of the API-exposed schema
create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

revoke all on function private.has_role(uuid, public.app_role) from public;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

-- Recreate policies that referenced public.has_role
drop policy if exists "managers see own record" on public.account_managers;
create policy "managers see own record"
  on public.account_managers for select to authenticated
  using (
    user_id = auth.uid()
    or private.has_role(auth.uid(), 'manager')
    or private.has_role(auth.uid(), 'admin')
  );

drop policy if exists "account managers read own assessments" on public.assessments;
create policy "account managers read own assessments"
  on public.assessments for select to authenticated
  using (
    private.has_role(auth.uid(), 'manager')
    or private.has_role(auth.uid(), 'admin')
    or account_manager_id in (select id from public.account_managers where user_id = auth.uid())
  );

drop policy if exists "account managers read own assessment responses" on public.assessment_responses;
create policy "account managers read own assessment responses"
  on public.assessment_responses for select to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_responses.assessment_id
        and (
          private.has_role(auth.uid(), 'manager')
          or private.has_role(auth.uid(), 'admin')
          or a.account_manager_id in (select id from public.account_managers where user_id = auth.uid())
        )
    )
  );

drop function if exists public.has_role(uuid, public.app_role);

-- 2) app_config: admin-only access (server code uses the service role and bypasses RLS)
grant select, insert, update, delete on public.app_config to authenticated;
grant all on public.app_config to service_role;

create policy "admins read app config"
  on public.app_config for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

create policy "admins insert app config"
  on public.app_config for insert to authenticated
  with check (private.has_role(auth.uid(), 'admin'));

create policy "admins update app config"
  on public.app_config for update to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

-- 3) assessment_notifications: owning account managers / admins may read
grant select on public.assessment_notifications to authenticated;
grant all on public.assessment_notifications to service_role;

create policy "managers read own assessment notifications"
  on public.assessment_notifications for select to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_notifications.assessment_id
        and (
          private.has_role(auth.uid(), 'manager')
          or private.has_role(auth.uid(), 'admin')
          or a.account_manager_id in (select id from public.account_managers where user_id = auth.uid())
        )
    )
  );

-- 4) assessments: scoped write policies for signed-in managers/admins
grant select, insert, update on public.assessments to authenticated;
grant all on public.assessments to service_role;

create policy "managers create assessments for themselves"
  on public.assessments for insert to authenticated
  with check (
    private.has_role(auth.uid(), 'admin')
    or account_manager_id in (select id from public.account_managers where user_id = auth.uid())
  );

create policy "managers update own assessments"
  on public.assessments for update to authenticated
  using (
    private.has_role(auth.uid(), 'admin')
    or private.has_role(auth.uid(), 'manager')
    or account_manager_id in (select id from public.account_managers where user_id = auth.uid())
  )
  with check (
    private.has_role(auth.uid(), 'admin')
    or private.has_role(auth.uid(), 'manager')
    or account_manager_id in (select id from public.account_managers where user_id = auth.uid())
  );