-- Seed Mock Feedback Data
-- Run this in your Supabase SQL Editor

-- Ensure the table exists (it should have been created in the previous migration)
-- CREATE TABLE IF NOT EXISTS feedback_items (
--     id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
--     user_id UUID REFERENCES auth.users(id),
--     type TEXT CHECK (type IN ('bug', 'suggestion', 'feedback', 'complaint')),
--     content TEXT NOT NULL,
--     tags TEXT[] DEFAULT '{}',
--     status TEXT DEFAULT 'open',
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Insert 3 mock items
-- Note: user_id is NULL here for system-wide feedback, but can be set to a specific ID if needed.
-- RLS should allow reading items with NULL user_id if configured correctly.

INSERT INTO feedback_items (type, content, tags, status)
VALUES 
('bug', 'The "Copy Prompt" button occasionally fails to copy multi-line text correctly in Safari.', '{bug, safari, ui}', 'open'),
('suggestion', 'It would be great if we could Export Specs directly to a .cursorrules file.', '{feature-request, cursor, export}', 'open'),
('complaint', 'The landing page is a bit slow to load on mobile devices. Consider optimizing image assets.', '{performance, mobile, landing-page}', 'open');

-- Optional: Add some upvotes to mock data (requires valid user_ids, so we'll skip for now)
