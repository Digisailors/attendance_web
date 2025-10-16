create table public.permission_requests (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  employee_name text not null,
  employee_email text not null,
  team_lead_id text null,
  permission_type text not null,
  date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  reason text not null,
  status text not null default 'Pending Team Lead'::text,
  team_lead_comments text null,
  approved_at timestamp with time zone null,
  rejected_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  manager_id uuid null,
  manager_comments text null,
  team_lead_ids text[] null,
  month integer null,
  year integer null,
  leave_group_id text null,
  processed_by_team_lead_id uuid null,
  constraint permission_requests_pkey primary key (id),
  constraint fk_employee_id foreign KEY (employee_id) references employees (id) on delete CASCADE,
  constraint fk_permission_manager_id foreign KEY (manager_id) references employees (id) on delete set null,
  constraint permission_requests_processed_by_team_lead_id_fkey foreign KEY (processed_by_team_lead_id) references employees (id)
) TABLESPACE pg_default;

create index IF not exists idx_permission_requests_status_created on public.permission_requests using btree (status, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_permission_requests_employee_status on public.permission_requests using btree (employee_id, status, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_permission_requests_month_year on public.permission_requests using btree (month, year) TABLESPACE pg_default;

create trigger update_permission_requests_updated_at BEFORE
update on permission_requests for EACH row
execute FUNCTION update_updated_at_column ();