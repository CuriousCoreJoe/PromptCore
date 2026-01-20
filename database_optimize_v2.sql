-- =====================================================
-- Database Optimization: Phase 2 (Warming up & Refining)
-- =====================================================

-- 1. Combined Index for Sidebar (Efficiency)
-- Our sidebar often queries by user + pinned + bookmarked. 
-- A combined index is much more likely to be "used" than 3 separate ones.
DROP INDEX IF EXISTS idx_chats_user_pinned;
DROP INDEX IF EXISTS idx_chats_user_bookmarked;
CREATE INDEX IF NOT EXISTS idx_chats_sidebar_lookup ON public.chats (user_id, is_pinned, is_bookmarked);

-- 2. Refining Folders RLS
-- Splitting "FOR ALL" into granular policies can sometimes satisfy Supabase's Auth Plan checker.
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own folders" ON public.folders;

CREATE POLICY "Users can view their own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- 3. Explanation of "Unused Index"
/*
  > [!NOTE]
  > "Unused Index" appears because you have very little data or queries haven't run yet.
  > This is a POSITIVE change from "Missing Index". 
  > Once you open the Sidebar and History page a few times, Supabase will see queries 
  > hitting these indexes and the labels will eventually update.
  > DO NOT drop them, or you will revert to "Missing Index" (Suboptimal Performance).
*/
