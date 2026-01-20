-- =====================================================
-- Database Optimization: High-Performance RLS Policies
-- =====================================================

-- This script wraps auth.uid() in a subquery (SELECT auth.uid()) 
-- to prevent row-by-row re-evaluation, as recommended by Supabase.

-- 1. Folders Table RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can create their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.folders;

CREATE POLICY "Users can view their own folders" ON public.folders 
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own folders" ON public.folders 
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own folders" ON public.folders 
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own folders" ON public.folders 
  FOR DELETE USING (user_id = (SELECT auth.uid()));


-- 2. Chats Table RLS (Update existing policies)
-- Note: Assuming standard names, if names differ in your DB, please adjust.
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;

CREATE POLICY "Users can view their own chats" ON public.chats 
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own chats" ON public.chats 
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own chats" ON public.chats 
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own chats" ON public.chats 
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- 3. Messages Table RLS
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;

CREATE POLICY "Users can view their own messages" ON public.messages 
  FOR SELECT USING (
    chat_id IN (SELECT id FROM public.chats WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can create their own messages" ON public.messages 
  FOR INSERT WITH CHECK (
    chat_id IN (SELECT id FROM public.chats WHERE user_id = (SELECT auth.uid()))
  );
