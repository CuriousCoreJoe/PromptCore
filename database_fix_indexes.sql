-- =====================================================
-- Database Index Optimization & Fixes
-- =====================================================

-- 1. Add missing indexes for Foreign Keys (Performance fixes)
-- Table: public.messages (chat_id)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

-- Table: public.generated_prompts (pack_id)
CREATE INDEX IF NOT EXISTS idx_generated_prompts_pack_id ON public.generated_prompts(pack_id);

-- Table: public.packs (user_id)
CREATE INDEX IF NOT EXISTS idx_packs_user_id ON public.packs(user_id);

-- 2. Note on "Unused Indexes":
-- The following indexes were recently added and are necessary for the 
-- Bookmarks, Pinning, and Folders features. Database optimizers often 
-- mark them as "unused" until enough queries have been run against them.
-- DO NOT delete these if you are using the new Sidebar features:
-- idx_chats_folder
-- idx_chats_user_bookmarked
-- idx_chats_user_pinned
-- idx_folders_user
