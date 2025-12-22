-- Create packs table
CREATE TABLE packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  niche TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for packs
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own packs" ON packs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own packs" ON packs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own packs" ON packs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create generated_prompts table
CREATE TABLE generated_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  difficulty TEXT,
  description TEXT,
  prompt_content TEXT,
  usage_guide TEXT,
  style_var TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for generated_prompts
ALTER TABLE generated_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prompts from their packs" ON generated_prompts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = generated_prompts.pack_id
      AND packs.user_id = auth.uid()
    )
  );

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100, -- Starting credits
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free', -- free, pro, powerhouse
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();