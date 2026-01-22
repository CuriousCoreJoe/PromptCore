-- RPC Function to fetch profile (Bypass REST interface)
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM profiles WHERE id = auth.uid();
$$;
