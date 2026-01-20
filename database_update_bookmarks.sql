-- Add bookmark and pin support to chats
ALTER TABLE chats ADD COLUMN is_pinned BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN is_bookmarked BOOLEAN DEFAULT false;

-- Add index for performance on filtered queries
CREATE INDEX idx_chats_user_pinned ON chats(user_id, is_pinned);
CREATE INDEX idx_chats_user_bookmarked ON chats(user_id, is_bookmarked);

-- Update RLS policies (usually not needed if table permissions are broad, but good to check)
-- Users can already update their own chats, which covers these flags.
