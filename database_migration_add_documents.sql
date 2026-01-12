-- Create documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'pdf', 'txt', 'youtube', 'paste'
  source_url TEXT,
  content TEXT, -- Extracted text content
  is_business_context BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING ((select auth.uid()) = user_id);
