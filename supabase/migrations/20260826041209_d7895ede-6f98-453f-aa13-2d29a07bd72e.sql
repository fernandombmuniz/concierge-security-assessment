-- ============ papéis (preparação da futura área interna) ============
create type public.app_role as enum ('admin', 'manager', 'account_manager');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create policy "own roles readable"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
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

-- ============ utilitário updated_at ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ account managers ============
create table public.account_managers (
  id uuid primary key default gen_random_uuid(),
  public_ref text not null unique,
  name text not null,
  email text not null,
  user_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant all on public.account_managers to service_role;
alter table public.account_managers enable row level security;

create policy "managers see own record"
  on public.account_managers for select
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create trigger account_managers_updated_at
  before update on public.account_managers
  for each row execute function public.set_updated_at();

-- ============ assessments ============
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  account_manager_id uuid references public.account_managers(id) on delete set null,
  public_ref text,
  source text,
  status text not null default 'in_progress',
  edit_token text not null,
  company_name text,
  sector text,
  respondent_name text,
  respondent_role text,
  respondent_email text,
  users_count integer,
  units_count integer,
  overall_score numeric,
  network_score numeric,
  endpoint_score numeric,
  continuity_score numeric,
  identity_score numeric,
  priority_domain text,
  priority_domain_label text,
  maturity_level text,
  coverage_percentage numeric,
  findings jsonb,
  scoring_snapshot jsonb,
  current_step integer not null default 0,
  methodology_version text not null default 'v2.4',
  privacy_notice_version text,
  consent_at timestamptz,
  notification_status text not null default 'pending',
  notification_sent_at timestamptz,
  notification_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_account_manager_idx on public.assessments(account_manager_id);
create index assessments_status_idx on public.assessments(status);
create index assessments_created_at_idx on public.assessments(created_at desc);

grant all on public.assessments to service_role;
alter table public.assessments enable row level security;

create policy "account managers read own assessments"
  on public.assessments for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'manager')
    or public.has_role(auth.uid(), 'admin')
    or account_manager_id in (select id from public.account_managers where user_id = auth.uid())
  );

create trigger assessments_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- ============ respostas completas por etapa ============
create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  section text not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, section)
);

create index assessment_responses_assessment_idx on public.assessment_responses(assessment_id);

grant all on public.assessment_responses to service_role;
alter table public.assessment_responses enable row level security;

create policy "account managers read own assessment responses"
  on public.assessment_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_responses.assessment_id
        and (
          public.has_role(auth.uid(), 'manager')
          or public.has_role(auth.uid(), 'admin')
          or a.account_manager_id in (select id from public.account_managers where user_id = auth.uid())
        )
    )
  );

create trigger assessment_responses_updated_at
  before update on public.assessment_responses
  for each row execute function public.set_updated_at();

-- ============ notificações internas (idempotência) ============
create table public.assessment_notifications (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  kind text not null default 'internal_report',
  recipient_email text,
  recipient_type text,
  status text not null default 'pending',
  error text,
  attempts integer not null default 0,
  report_html text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, kind)
);

grant all on public.assessment_notifications to service_role;
alter table public.assessment_notifications enable row level security;

create trigger assessment_notifications_updated_at
  before update on public.assessment_notifications
  for each row execute function public.set_updated_at();

-- ============ configuração interna do servidor ============
create table public.app_config (
  key text primary key,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant all on public.app_config to service_role;
alter table public.app_config enable row level security;

create trigger app_config_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();
