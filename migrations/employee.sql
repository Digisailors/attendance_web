/*
  # Create employees and attendance tables

  1. New Tables
    - `employees`
      - `id` (uuid, primary key)
      - `employee_id` (text, unique) - Custom employee ID like "JD", "SW", etc.
      - `name` (text)
      - `designation` (text)
      - `work_mode` (text) - Office/WFH/Hybrid
      - `phone_number` (text)
      - `email_address` (text, unique)
      - `address` (text)
      - `date_of_joining` (date)
      - `experience` (text)
      - `status` (text) - Active/Warning/On Leave
      - `is_active` (boolean) - For soft delete
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `attendance`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `month` (integer)
      - `year` (integer)
      - `total_days` (integer)
      - `working_days` (integer)
      - `permissions` (integer)
      - `leaves` (integer)
      - `missed_days` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `daily_work_log`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `date` (date)
      - `check_in` (time)
      - `check_out` (time)
      - `hours` (decimal)
      - `project` (text)
      - `status` (text) - Present/Leave/Permission/Absent
      - `description` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE NOT NULL,
  name text NOT NULL,
  designation text NOT NULL,
  work_mode text NOT NULL DEFAULT 'Office',
  phone_number text,
  email_address text UNIQUE NOT NULL,
  address text,
  date_of_joining date,
  experience text,
  status text NOT NULL DEFAULT 'Active',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  total_days integer DEFAULT 0,
  working_days integer DEFAULT 0,
  permissions integer DEFAULT 0,
  leaves integer DEFAULT 0,
  missed_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Create daily_work_log table
CREATE TABLE IF NOT EXISTS daily_work_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in time,
  check_out time,
  hours decimal(4,2) DEFAULT 0,
  project text,
  status text NOT NULL DEFAULT 'Present',
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email_address);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_month_year ON attendance(month, year);
CREATE INDEX IF NOT EXISTS idx_daily_work_log_employee_id ON daily_work_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_work_log_date ON daily_work_log(date);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_log ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Allow authenticated users to read employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert employees"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update employees"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete employees"
  ON employees
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for attendance table
CREATE POLICY "Allow authenticated users to read attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert attendance"
  ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update attendance"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete attendance"
  ON attendance
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for daily_work_log table
CREATE POLICY "Allow authenticated users to read daily_work_log"
  ON daily_work_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert daily_work_log"
  ON daily_work_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update daily_work_log"
  ON daily_work_log
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete daily_work_log"
  ON daily_work_log
  FOR DELETE
  TO authenticated
  USING (true);
  
  ALTER TABLE leave_requests
ADD COLUMN manager_id uuid REFERENCES employees(id);

create table if not exists overtime_requests (
  id uuid primary key default gen_random_uuid(),

  -- Foreign key to employees table
  employee_id uuid not null references employees(id) on delete cascade,

  -- OT details
  ot_date date not null,
  start_time time not null,
  end_time time not null,

  -- Total hours (calculated from time difference)
  total_hours numeric(5,2) generated always as (
    extract(epoch from (end_time - start_time)) / 3600
  ) stored,

  -- Reason for OT
  reason text not null,

  -- Image URL (uploaded via Supabase Storage or signed URL)
  ot_image_url text,

  -- Request status
  status text default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),

  -- Approval tracking
  approved_by uuid references employees(id),
  approved_at timestamp with time zone,

  -- Audit timestamps
  created_at timestamp with time zone default timezone('Asia/Kolkata', now()),
  updated_at timestamp with time zone default timezone('Asia/Kolkata', now())
);

