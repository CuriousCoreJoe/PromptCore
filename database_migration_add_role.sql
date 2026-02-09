-- Add role column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Update the dev user to have 'admin' role (optional, but good for immediate testing if we know the ID)
-- UPDATE public.profiles SET role = 'admin' WHERE id = '...'; 
-- Since we don't know the ID, we'll rely on the manual update or a separate script.
