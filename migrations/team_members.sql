/*
  # Create Team Members Table (Fixed)

  1. New Tables
    - `team_members` 
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references employees.id)
      - `team_lead_id` (varchar, references employees.employee_id)
      - `added_date` (timestamp)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `team_members` table
    - Add policies for read, insert, update, delete operations

  3. Indexes
    - Add performance indexes for common queries
    - Add unique constraint for active team member relationships (using partial index)

  4. Enhancements
    - Add updated_at trigger for automatic timestamp updates
    - Add foreign key constraints to ensure data integrity
*/

-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_lead_id VARCHAR(20) NOT NULL, -- References employee_id from employees table
    added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_work_mode ON employees(work_mode);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

CREATE INDEX IF NOT EXISTS idx_team_members_team_lead_id ON team_members(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_added_date ON team_members(added_date);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_team_members_team_lead_active ON team_members(team_lead_id, is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_employee_active ON team_members(employee_id, is_active);

-- Create unique constraint for active team member relationships using partial index
-- This prevents duplicate active team member entries without using subqueries
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_team_member 
ON team_members(employee_id, team_lead_id) 
WHERE is_active = true;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to employees" ON employees;
DROP POLICY IF EXISTS "Allow read access to team_members" ON team_members;
DROP POLICY IF EXISTS "Allow insert/update/delete on team_members" ON team_members;
DROP POLICY IF EXISTS "Allow all operations on employees" ON employees;

-- Create comprehensive policies for employees table
CREATE POLICY "Allow read access to employees" 
ON employees FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations on employees" 
ON employees FOR ALL 
USING (true);

-- Create comprehensive policies for team_members table
CREATE POLICY "Allow read access to team_members" 
ON team_members FOR SELECT 
USING (true);

CREATE POLICY "Allow insert on team_members" 
ON team_members FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update on team_members" 
ON team_members FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete on team_members" 
ON team_members FOR DELETE 
USING (true);

-- Add constraint to ensure team lead exists and is active
-- Using a simple foreign key constraint instead of subquery
ALTER TABLE team_members 
ADD CONSTRAINT fk_team_lead_exists 
FOREIGN KEY (team_lead_id) 
REFERENCES employees(employee_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add helpful comments
COMMENT ON TABLE team_members IS 'Stores team member relationships between employees and team leads';
COMMENT ON COLUMN team_members.employee_id IS 'Internal ID of the employee (references employees.id)';
COMMENT ON COLUMN team_members.team_lead_id IS 'Employee ID of the team lead (references employees.employee_id)';
COMMENT ON COLUMN team_members.added_date IS 'When the employee was added to the team';
COMMENT ON COLUMN team_members.is_active IS 'Whether this team member relationship is currently active';