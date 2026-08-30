create extension if not exists pgcrypto;

create table if not exists public.account_managers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    public_ref text not null unique,
    email text not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.assessments (
    id uuid primary key default gen_random_uuid(),

    account_manager_id uuid
        references public.account_managers(id)
        on delete restrict,

    public_token uuid not null
        default gen_random_uuid()
        unique,

    status text not null default 'draft'
        check (
          status in (
            'draft',
            'completed',
            'reviewed',
            'archived'
          )
        ),

    company_name text,
    company_sector text,

    respondent_name text,
    respondent_role text,
    respondent_email text,

    users_count integer,
    units_count integer,

    overall_score numeric(5,2),
    network_score numeric(5,2),
    endpoint_score numeric(5,2),
    continuity_score numeric(5,2),
    identity_score numeric(5,2),

    coverage_percent numeric(5,2),

    priority_domain text,

    methodology_version text not null
        default 'v2.4',

    source_ref text,

    started_at timestamptz not null default now(),
    completed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.assessment_responses (
    id uuid primary key default gen_random_uuid(),

    assessment_id uuid not null unique
        references public.assessments(id)
        on delete cascade,

    answers jsonb not null default '{}'::jsonb,

    calculated_result jsonb not null
        default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.assessment_notifications (
    id uuid primary key default gen_random_uuid(),

    assessment_id uuid not null
        references public.assessments(id)
        on delete cascade,

    account_manager_id uuid not null
        references public.account_managers(id)
        on delete restrict,

    notification_type text not null
        default 'email',

    recipient_email text not null,

    status text not null default 'pending'
        check (
          status in (
            'pending',
            'sent',
            'failed'
          )
        ),

    provider_message_id text,
    error_message text,

    attempts integer not null default 0,

    sent_at timestamptz,

    created_at timestamptz not null default now()
);

create unique index if not exists
assessment_notification_unique
on public.assessment_notifications (
    assessment_id,
    account_manager_id,
    notification_type
);

create index if not exists
assessments_account_manager_idx
on public.assessments(account_manager_id);

create index if not exists
assessments_status_idx
on public.assessments(status);

create index if not exists
assessments_created_at_idx
on public.assessments(created_at desc);

create index if not exists
notifications_status_idx
on public.assessment_notifications(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists
account_managers_set_updated_at
on public.account_managers;

create trigger account_managers_set_updated_at
before update on public.account_managers
for each row
execute function public.set_updated_at();

drop trigger if exists
assessments_set_updated_at
on public.assessments;

create trigger assessments_set_updated_at
before update on public.assessments
for each row
execute function public.set_updated_at();

drop trigger if exists
assessment_responses_set_updated_at
on public.assessment_responses;

create trigger assessment_responses_set_updated_at
before update on public.assessment_responses
for each row
execute function public.set_updated_at();

alter table public.account_managers
enable row level security;

alter table public.assessments
enable row level security;

alter table public.assessment_responses
enable row level security;

alter table public.assessment_notifications
enable row level security;

revoke all
on table public.account_managers
from anon, authenticated;

revoke all
on table public.assessments
from anon, authenticated;

revoke all
on table public.assessment_responses
from anon, authenticated;

revoke all
on table public.assessment_notifications
from anon, authenticated;

grant select, insert, update, delete
on table public.account_managers
to service_role;

grant select, insert, update, delete
on table public.assessments
to service_role;

grant select, insert, update, delete
on table public.assessment_responses
to service_role;

grant select, insert, update, delete
on table public.assessment_notifications
to service_role;