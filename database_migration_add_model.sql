-- Add default_model column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'google/gemini-3-pro-preview';

-- Update existing profiles to use the new default
UPDATE profiles SET default_model = 'google/gemini-3-pro-preview' WHERE default_model IS NULL OR default_model = 'gemini-3-pro';
