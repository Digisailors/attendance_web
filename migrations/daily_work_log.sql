create table public.daily_work_log (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  date date not null,
  check_in time without time zone null,
  check_out time without time zone null,
  hours numeric(4, 2) null default 0,
  project text null,
  status text not null default 'Present'::text,
  description text null,
  created_at timestamp with time zone null default now(),
  constraint daily_work_log_pkey primary key (id),
  constraint daily_work_log_employee_id_date_key unique (employee_id, date),
  constraint daily_work_log_employee_id_fkey foreign KEY (employee_id) references employees (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_daily_work_log_employee_id on public.daily_work_log using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_daily_work_log_date on public.daily_work_log using btree (date) TABLESPACE pg_default;