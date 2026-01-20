-- =====================================================
-- Database Cleanup: Remove Duplicate RLS Policies
-- =====================================================

-- This removes older/redundant policies that conflict with the optimized ones.

-- Chats Table: Remove legacy duplicate policies
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view chats" ON public.chats;
DROP POLICY IF EXISTS "Users can modify their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can remove their own chats" ON public.chats;

-- Messages Table: Remove any legacy duplicates
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;

-- The optimized policies from database_performance_rls.sql will remain:
-- "Users can view their own chats"
-- "Users can create their own chats"
-- "Users can update their own chats"
-- "Users can delete their own chats"
-- etc.
