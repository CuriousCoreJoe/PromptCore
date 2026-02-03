-- Add Fuel Tank fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_demo_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_refill_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refill_count INTEGER DEFAULT 0;

-- Update existing users to have 500 credits if they are below
UPDATE profiles 
SET credits = 500 
WHERE credits < 500 AND subscription_status = 'free';

-- Ensure new users get 500 credits (check existing trigger or default)
ALTER TABLE profiles 
ALTER COLUMN credits SET DEFAULT 500;
