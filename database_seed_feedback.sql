-- Mock Data for Feedback Board
-- IMPORTANT: Run this in your Supabase SQL Editor.
-- Note: These will be associated with the first user found in auth.users if possible, 
-- or you may need to manually update the user_id to your own if RLS prevents viewing them.

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Try to get the first available user ID
    SELECT id INTO target_user_id FROM auth.users LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        -- Insert 3 fake examples
        INSERT INTO feedback_items (id, user_id, type, content, tags, status, created_at)
        VALUES 
        (
            gen_random_uuid(), 
            target_user_id, 
            'bug', 
            'The mobile menu button is unresponsive on Safari iOS 17. Steps to reproduce: open landing page, scroll down, try to click menu.', 
            ARRAY['bug', 'mobile', 'safari'], 
            'open',
            NOW() - INTERVAL '2 days'
        ),
        (
            gen_random_uuid(), 
            target_user_id, 
            'suggestion', 
            'It would be amazing to have a "Dark Mode" toggle for the Landing Page. Currently, it''s only dark, but a light theme option would be great for visibility.', 
            ARRAY['suggestion', 'ui', 'theme'], 
            'open',
            NOW() - INTERVAL '1 day'
        ),
        (
            gen_random_uuid(), 
            target_user_id, 
            'feedback', 
            'I absolutely love the new "Vibe Code" feature! It interpreted my fuzzy description perfectly. Keep up the great work!', 
            ARRAY['feedback', 'vibe-code', 'praise'], 
            'open',
            NOW()
        );

        RAISE NOTICE 'Inserted 3 mock feedback items for user %', target_user_id;
    ELSE
        RAISE WARNING 'No users found in auth.users. Please create a user first before running this script.';
    END IF;
END $$;
