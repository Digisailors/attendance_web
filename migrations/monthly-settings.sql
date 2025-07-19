-- Additional database setup for the backend
-- Run this in your Supabase SQL editor

-- Create monthly_settings table
CREATE TABLE IF NOT EXISTS monthly_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  total_days integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(month, year)
);

-- Enable RLS on monthly_settings
ALTER TABLE monthly_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_settings
CREATE POLICY "Allow authenticated users to read monthly_settings"
  ON monthly_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert monthly_settings"
  ON monthly_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update monthly_settings"
  ON monthly_settings
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to execute SQL (useful for dynamic table creation)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Create function to create monthly_settings table
CREATE OR REPLACE FUNCTION create_monthly_settings_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS monthly_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    month integer NOT NULL,
    year integer NOT NULL,
    total_days integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(month, year)
  );
  
  ALTER TABLE monthly_settings ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY IF NOT EXISTS "Allow authenticated users to read monthly_settings"
    ON monthly_settings
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert monthly_settings"
    ON monthly_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  CREATE POLICY IF NOT EXISTS "Allow authenticated users to update monthly_settings"
    ON monthly_settings
    FOR UPDATE
    TO authenticated
    USING (true);
END;
$$;

-- Create trigger for updating updated_at timestamp on monthly_settings
CREATE TRIGGER update_monthly_settings_updated_at 
  BEFORE UPDATE ON monthly_settings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();