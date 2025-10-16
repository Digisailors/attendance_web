create table public.users (
  id uuid not null default gen_random_uuid (),
  email character varying(255) not null,
  password character varying(255) not null,
  user_type character varying(50) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_active boolean null default true,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_user_type_check check (
    (
      (user_type)::text = any (
        (
          array[
            'admin'::character varying,
            'employee'::character varying,
            'intern'::character varying,
            'team-lead'::character varying,
            'manager'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;

create index IF not exists idx_users_type on public.users using btree (user_type) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();