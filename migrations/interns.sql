create table public.interns (
  id uuid not null default gen_random_uuid (),
  name text not null,
  email text not null,
  phone_number text not null,
  college text not null,
  year_or_passed_out text not null,
  department text not null,
  domain_in_office text not null,
  paid_or_unpaid text not null,
  aadhar_path text null,
  photo_path text null,
  marksheet_path text null,
  resume_path text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  status text null default 'Active'::text,
  constraint interns_pkey primary key (id),
  constraint interns_email_key unique (email),
  constraint interns_paid_or_unpaid_check check (
    (
      paid_or_unpaid = any (array['Paid'::text, 'Unpaid'::text])
    )
  ),
  constraint interns_status_check check (
    (
      status = any (
        array[
          'Active'::text,
          'Inactive'::text,
          'Completed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_interns_email on public.interns using btree (email) TABLESPACE pg_default;

create index IF not exists idx_interns_status on public.interns using btree (status) TABLESPACE pg_default;

create index IF not exists idx_interns_created_at on public.interns using btree (created_at desc) TABLESPACE pg_default;

create trigger update_interns_updated_at BEFORE
update on interns for EACH row
execute FUNCTION update_updated_at_column ();