create table public.leave_requests (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  employee_name text not null,
  employee_email text not null,
  team_lead_id text null,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'Pending'::text,
  team_lead_comments text null,
  approved_at timestamp with time zone null,
  rejected_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  manager_id uuid null,
  manager_comments text null,
  team_lead_ids text[] null,
  leave_group_id text null,
  month integer null,
  year integer null,
  constraint leave_requests_pkey primary key (id),
  constraint fk_employee_id foreign KEY (employee_id) references employees (id) on delete CASCADE,
  constraint fk_leave_manager_id foreign KEY (manager_id) references employees (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_leave_requests_employee_id on public.leave_requests using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_leave_requests_team_lead_id on public.leave_requests using btree (team_lead_id) TABLESPACE pg_default;

create index IF not exists idx_leave_requests_status on public.leave_requests using btree (status) TABLESPACE pg_default;

create index IF not exists idx_leave_requests_team_lead_ids on public.leave_requests using gin (team_lead_ids) TABLESPACE pg_default;

create index IF not exists idx_leave_requests_status_created on public.leave_requests using btree (status, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_leave_requests_employee_status on public.leave_requests using btree (employee_id, status, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_leave_requests_month_year on public.leave_requests using btree (month, year) TABLESPACE pg_default;

create trigger update_leave_requests_updated_at BEFORE
update on leave_requests for EACH row
execute FUNCTION update_updated_at_column ();