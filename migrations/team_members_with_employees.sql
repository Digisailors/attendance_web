create view public.team_members_with_employees as
select
  tm.id,
  tm.employee_id,
  tm.team_lead_id,
  tm.added_date,
  tm.is_active,
  tm.created_at,
  tm.updated_at,
  e.employee_id as employee_external_id,
  e.name as employee_name,
  e.designation,
  e.work_mode,
  e.status,
  e.phone_number,
  e.email_address,
  e.address,
  e.date_of_joining,
  e.experience,
  e.created_at as employee_created_at,
  e.updated_at as employee_updated_at
from
  team_members tm
  join employees e on tm.employee_id = e.id
where
  tm.is_active = true;