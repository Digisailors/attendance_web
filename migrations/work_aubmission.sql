-- Create work_submissions table
CREATE TABLE IF NOT EXISTS work_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  title text NOT NULL,
  work_type text NOT NULL,
  work_description text NOT NULL,
  department text,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Pending Team Lead',
  submitted_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL, -- 'employee', 'team-lead', 'admin'
  recipient_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'work_submission', 'work_approval', 'work_rejection'
  reference_id uuid, -- Reference to work_submissions.id or other tables
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_submissions_employee_id ON work_submissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_submissions_status ON work_submissions(status);
CREATE INDEX IF NOT EXISTS idx_work_submissions_submitted_date ON work_submissions(submitted_date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type ON notifications(recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_work_submissions_updated_at BEFORE UPDATE ON work_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE work_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for work_submissions table
CREATE POLICY "Allow authenticated users to read work_submissions"
  ON work_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert work_submissions"
  ON work_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update work_submissions"
  ON work_submissions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete work_submissions"
  ON work_submissions
  FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for notifications table
CREATE POLICY "Allow authenticated users to read notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (true);
-- Add missing columns to work_submissions table
ALTER TABLE work_submissions 
ADD COLUMN IF NOT EXISTS team_lead_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_lead_rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_lead_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for better performance on team_lead_id
CREATE INDEX IF NOT EXISTS idx_work_submissions_team_lead_id ON work_submissions(team_lead_id);
/*
  # Add Manager Columns to Work Submissions

  1. New Columns
    - `manager_id` (varchar, for manager identification)
    - `manager_name` (text, for manager name)
    - `manager_comments` (text, for manager feedback)
    - `final_approved_date` (timestamp, when finally approved)
    - `final_rejected_date` (timestamp, when finally rejected)

  2. Indexes
    - Add performance indexes for manager-related queries

  3. Comments
    - Add helpful documentation for new columns
*/

-- Add manager-related columns to work_submissions table
ALTER TABLE work_submissions 
ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS manager_comments TEXT,
ADD COLUMN IF NOT EXISTS final_approved_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS final_rejected_date TIMESTAMPTZ;

-- Add indexes for better performance on manager-related queries
CREATE INDEX IF NOT EXISTS idx_work_submissions_manager_id ON work_submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_work_submissions_final_approved_date ON work_submissions(final_approved_date);
CREATE INDEX IF NOT EXISTS idx_work_submissions_final_rejected_date ON work_submissions(final_rejected_date);

-- Add helpful comments
COMMENT ON COLUMN work_submissions.manager_id IS 'ID of the manager who provided final approval/rejection';
COMMENT ON COLUMN work_submissions.manager_name IS 'Name of the manager who provided final approval/rejection';
COMMENT ON COLUMN work_submissions.manager_comments IS 'Comments provided by manager during final review';
COMMENT ON COLUMN work_submissions.final_approved_date IS 'Timestamp when submission was finally approved by manager';
COMMENT ON COLUMN work_submissions.final_rejected_date IS 'Timestamp when submission was finally rejected by manager';/*
  # Add Team Lead and Manager Columns to Work Submissions

  1. New Columns
    - `team_lead_approved_at` (timestamp, when team lead approved)
    - `team_lead_rejected_at` (timestamp, when team lead rejected)
    - `team_lead_id` (varchar, team lead identifier)
    - `team_lead_comments` (text, team lead feedback)
    - `manager_id` (varchar, manager identifier)
    - `manager_name` (text, manager name)
    - `manager_comments` (text, manager feedback)
    - `final_approved_date` (timestamp, when finally approved)
    - `final_rejected_date` (timestamp, when finally rejected)

  2. Indexes
    - Add performance indexes for manager-related queries

  3. Comments
    - Add helpful documentation for new columns
*/

-- Add team lead related columns
ALTER TABLE work_submissions 
ADD COLUMN IF NOT EXISTS team_lead_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_lead_rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_lead_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS team_lead_comments TEXT;

-- Add manager related columns
ALTER TABLE work_submissions 
ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS manager_comments TEXT,
ADD COLUMN IF NOT EXISTS final_approved_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS final_rejected_date TIMESTAMPTZ;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_submissions_team_lead_id ON work_submissions(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_work_submissions_manager_id ON work_submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_work_submissions_team_lead_approved_at ON work_submissions(team_lead_approved_at);
CREATE INDEX IF NOT EXISTS idx_work_submissions_final_approved_date ON work_submissions(final_approved_date);
CREATE INDEX IF NOT EXISTS idx_work_submissions_final_rejected_date ON work_submissions(final_rejected_date);

-- Add helpful comments
COMMENT ON COLUMN work_submissions.team_lead_approved_at IS 'Timestamp when submission was approved by team lead';
COMMENT ON COLUMN work_submissions.team_lead_rejected_at IS 'Timestamp when submission was rejected by team lead';
COMMENT ON COLUMN work_submissions.team_lead_id IS 'ID of the team lead who reviewed the submission';
COMMENT ON COLUMN work_submissions.team_lead_comments IS 'Comments provided by team lead during review';
COMMENT ON COLUMN work_submissions.manager_id IS 'ID of the manager who provided final approval/rejection';
COMMENT ON COLUMN work_submissions.manager_name IS 'Name of the manager who provided final approval/rejection';
COMMENT ON COLUMN work_submissions.manager_comments IS 'Comments provided by manager during final review';
COMMENT ON COLUMN work_submissions.final_approved_date IS 'Timestamp when submission was finally approved by manager';
COMMENT ON COLUMN work_submissions.final_rejected_date IS 'Timestamp when submission was finally rejected by manager';