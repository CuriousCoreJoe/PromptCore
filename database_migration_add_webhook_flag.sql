-- Add signup_webhook_sent column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_webhook_sent BOOLEAN DEFAULT FALSE;
