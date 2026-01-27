-- Create feedback_items table
CREATE TABLE IF NOT EXISTS feedback_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL, -- 'bug', 'suggestion', 'feedback', 'complaint'
  content TEXT NOT NULL,
  tags TEXT[],
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for feedback_items
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback items are viewable by everyone" 
  ON feedback_items FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create feedback items" 
  ON feedback_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback items" 
  ON feedback_items FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create feedback_comments table
CREATE TABLE IF NOT EXISTS feedback_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID REFERENCES feedback_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for feedback_comments
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback comments are viewable by everyone" 
  ON feedback_comments FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create comments" 
  ON feedback_comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create feedback_upvotes table
CREATE TABLE IF NOT EXISTS feedback_upvotes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_id UUID REFERENCES feedback_items(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, feedback_id)
);

-- Enable RLS for feedback_upvotes
ALTER TABLE feedback_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvotes are viewable by everyone" 
  ON feedback_upvotes FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can vote" 
  ON feedback_upvotes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove vote" 
  ON feedback_upvotes FOR DELETE 
  USING (auth.uid() = user_id);

-- Create waitlist_emails table
CREATE TABLE IF NOT EXISTS waitlist_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for waitlist_emails
-- STRICT SECURITY: No client-side access allowed
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Only service role can interact with this table (no policies for anon/authenticated)

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_items;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_upvotes;
