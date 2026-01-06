-- Add default_model column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'claude-sonnet-4.5';

-- Update existing profiles to use the new default
UPDATE profiles SET default_model = 'claude-sonnet-4.5' WHERE default_model IS NULL;
