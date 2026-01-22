-- ROLLBACK DATABASE CHANGES
-- This script removes the tables and functions created during the troubleshooting process.

-- 1. Drop the RPC function
DROP FUNCTION IF EXISTS get_my_profile();

-- 2. Drop the documents table (if you want to revert to the state where it was missing)
-- Uncomment the next line if you are sure you want to delete the documents table
-- DROP TABLE IF EXISTS documents;

-- 3. Reset profiles default_model to the original default
-- This ensures compatibility with older code versions
ALTER TABLE profiles ALTER COLUMN default_model SET DEFAULT 'google/gemini-3-pro-preview';

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';
