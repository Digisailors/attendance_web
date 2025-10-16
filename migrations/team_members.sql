create table public.team_members (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  team_lead_id character varying(20) not null,
  added_date timestamp with time zone null default now(),
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint team_members_pkey primary key (id),
  constraint fk_employee_exists foreign KEY (employee_id) references employees (id) on delete CASCADE,
  constraint fk_team_lead_exists foreign KEY (team_lead_id) references employees (employee_id) on delete CASCADE,
  constraint team_members_employee_id_fkey foreign KEY (employee_id) references employees (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_team_members_team_lead_id on public.team_members using btree (team_lead_id) TABLESPACE pg_default;

create index IF not exists idx_team_members_employee_id on public.team_members using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_team_members_is_active on public.team_members using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_team_members_added_date on public.team_members using btree (added_date) TABLESPACE pg_default;

create index IF not exists idx_team_members_team_lead_active on public.team_members using btree (team_lead_id, is_active) TABLESPACE pg_default;

create index IF not exists idx_team_members_employee_active on public.team_members using btree (employee_id, is_active) TABLESPACE pg_default;

create unique INDEX IF not exists idx_unique_active_team_member on public.team_members using btree (employee_id, team_lead_id) TABLESPACE pg_default
where
  (is_active = true);

create trigger update_team_members_updated_at BEFORE
update on team_members for EACH row
execute FUNCTION update_updated_at_column ();