create table public.work_submissions (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  employee_name text not null,
  title text not null,
  work_type text not null,
  work_description text not null,
  department text null,
  priority text not null default 'Medium'::text,
  status text not null default 'Pending Team Lead'::text,
  submitted_date timestamp with time zone not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  team_lead_approved_at timestamp with time zone null,
  team_lead_rejected_at timestamp with time zone null,
  team_lead_id character varying(50) null,
  rejection_reason text null,
  approved_by_team_lead_date timestamp with time zone null,
  team_lead_comments text null,
  manager_comments text null,
  notification_id uuid null,
  manager_id character varying(50) null,
  manager_name text null,
  final_approved_date timestamp with time zone null,
  final_rejected_date timestamp with time zone null,
  constraint work_submissions_pkey primary key (id),
  constraint work_submissions_employee_id_fkey foreign KEY (employee_id) references employees (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_employee_id on public.work_submissions using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_status on public.work_submissions using btree (status) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_submitted_date on public.work_submissions using btree (submitted_date) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_team_lead_id on public.work_submissions using btree (team_lead_id) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_manager_id on public.work_submissions using btree (manager_id) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_final_approved_date on public.work_submissions using btree (final_approved_date) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_final_rejected_date on public.work_submissions using btree (final_rejected_date) TABLESPACE pg_default;

create index IF not exists idx_work_submissions_team_lead_approved_at on public.work_submissions using btree (team_lead_approved_at) TABLESPACE pg_default;

create trigger update_work_submissions_updated_at BEFORE
update on work_submissions for EACH row
execute FUNCTION update_updated_at_column ();