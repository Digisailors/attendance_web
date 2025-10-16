create table public.employees (
  id uuid not null default gen_random_uuid (),
  employee_id text not null,
  name text not null,
  designation text not null,
  work_mode text not null default 'Office'::text,
  phone_number text null,
  email_address text not null,
  address text null,
  date_of_joining date null,
  experience text null,
  status text not null default 'Active'::text,
  is_active boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  manager_id uuid null,
  constraint employees_pkey primary key (id),
  constraint employees_email_address_key unique (email_address),
  constraint employees_employee_id_key unique (employee_id),
  constraint employees_manager_id_fkey foreign KEY (manager_id) references employees (id)
) TABLESPACE pg_default;

create index IF not exists idx_employees_employee_id on public.employees using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_employees_email on public.employees using btree (email_address) TABLESPACE pg_default;

create index IF not exists idx_employees_is_active on public.employees using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_employees_work_mode on public.employees using btree (work_mode) TABLESPACE pg_default;

create index IF not exists idx_employees_status on public.employees using btree (status) TABLESPACE pg_default;

create index IF not exists idx_employees_name on public.employees using btree (name) TABLESPACE pg_default;

create trigger update_employees_updated_at BEFORE
update on employees for EACH row
execute FUNCTION update_updated_at_column ();