-- Add premium mode usage tracking columns to profiles table
-- This allows tracking how many times free users use premium modes

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vibe_code_uses_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS talk_to_source_uses_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS media_gen_uses_monthly INTEGER DEFAULT 0;

-- Add comment to explain these columns
COMMENT ON COLUMN profiles.vibe_code_uses_monthly IS 'Number of Vibe Code uses this month (for free user trial limits)';
COMMENT ON COLUMN profiles.talk_to_source_uses_monthly IS 'Number of Talk to Source uses this month (for free user trial limits)';
COMMENT ON COLUMN profiles.media_gen_uses_monthly IS 'Number of Media Gen uses this month (for free user trial limits)';
