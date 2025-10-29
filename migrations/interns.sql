-- Create interns table
CREATE TABLE interns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  college TEXT NOT NULL,
  year_or_passed_out TEXT NOT NULL,
  department TEXT NOT NULL,
  domain_in_office TEXT NOT NULL,
  paid_or_unpaid TEXT NOT NULL CHECK (paid_or_unpaid IN ('Paid', 'Unpaid')),
  
  -- Document file paths in Supabase Storage
  aadhar_path TEXT,
  photo_path TEXT,
  marksheet_path TEXT,
  resume_path TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Completed'))
);

-- Create index for faster queries
CREATE INDEX idx_interns_email ON interns(email);
CREATE INDEX idx_interns_status ON interns(status);
CREATE INDEX idx_interns_created_at ON interns(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE interns ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (adjust based on your needs)
CREATE POLICY "Allow authenticated users to view interns"
  ON interns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert interns"
  ON interns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update interns"
  ON interns FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete interns"
  ON interns FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interns_updated_at
  BEFORE UPDATE ON interns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  -- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'intern-documents');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'intern-documents');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'intern-documents');