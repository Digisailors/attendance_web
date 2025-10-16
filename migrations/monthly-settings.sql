create table public.monthly_settings (
  id uuid not null default gen_random_uuid (),
  month integer not null,
  year integer not null,
  total_days integer not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint monthly_settings_pkey primary key (id),
  constraint monthly_settings_month_year_key unique (month, year)
) TABLESPACE pg_default;