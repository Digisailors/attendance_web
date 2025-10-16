create table public.attendance (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  month integer not null,
  year integer not null,
  total_days integer null default 0,
  working_days integer null default 0,
  permissions integer null default 0,
  leaves integer null default 0,
  missed_days integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint attendance_pkey primary key (id),
  constraint attendance_employee_id_month_year_key unique (employee_id, month, year),
  constraint attendance_employee_id_fkey foreign KEY (employee_id) references employees (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_attendance_employee_id on public.attendance using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_attendance_month_year on public.attendance using btree (month, year) TABLESPACE pg_default;

create trigger update_attendance_updated_at BEFORE
update on attendance for EACH row
execute FUNCTION update_updated_at_column ();