create table public.overtime_requests (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  ot_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  total_hours numeric GENERATED ALWAYS as (
    (
      EXTRACT(
        epoch
        from
          (end_time - start_time)
      ) / (3600)::numeric
    )
  ) STORED (5, 2) null,
  reason text not null,
  ot_image_url text null,
  status text null default 'Pending'::text,
  approved_by uuid null,
  approved_at timestamp with time zone null,
  created_at timestamp with time zone null default timezone ('Asia/Kolkata'::text, now()),
  updated_at timestamp with time zone null default timezone ('Asia/Kolkata'::text, now()),
  image1 text null,
  image2 text null,
  constraint overtime_requests_pkey primary key (id),
  constraint overtime_requests_approved_by_fkey foreign KEY (approved_by) references employees (id),
  constraint overtime_requests_employee_id_fkey foreign KEY (employee_id) references employees (id) on delete CASCADE,
  constraint overtime_requests_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'approved'::text,
          'rejected'::text,
          'Final Approved'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_overtime_requests_employee_id on public.overtime_requests using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_overtime_requests_ot_date on public.overtime_requests using btree (ot_date) TABLESPACE pg_default;