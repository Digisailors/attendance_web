create table public.intern_work_logs (
  id uuid not null default gen_random_uuid (),
  intern_id character varying(255) not null,
  intern_name character varying(255) null,
  date date not null default CURRENT_DATE,
  check_in timestamp with time zone null,
  check_out timestamp with time zone null,
  work_type character varying(100) null,
  description text null,
  department character varying(100) null,
  total_hours numeric(5, 2) null,
  overtime_hours numeric(5, 2) null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint intern_work_logs_pkey primary key (id),
  constraint intern_work_logs_unique_date unique (intern_id, date),
  constraint work_type_check check (
    (
      (work_type)::text = any (
        array[
          ('Offline'::character varying)::text,
          ('Online'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_intern_work_logs_intern_id on public.intern_work_logs using btree (intern_id) TABLESPACE pg_default;

create index IF not exists idx_intern_work_logs_date on public.intern_work_logs using btree (date) TABLESPACE pg_default;

create index IF not exists idx_intern_work_logs_department on public.intern_work_logs using btree (department) TABLESPACE pg_default;

create trigger trigger_calculate_hours_on_insert BEFORE INSERT on intern_work_logs for EACH row
execute FUNCTION update_intern_work_logs_updated_at ();

create trigger trigger_update_intern_work_logs_updated_at BEFORE
update on intern_work_logs for EACH row
execute FUNCTION update_intern_work_logs_updated_at ();