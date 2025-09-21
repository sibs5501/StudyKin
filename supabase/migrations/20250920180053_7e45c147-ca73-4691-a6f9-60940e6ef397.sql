-- Fix study group creation by resetting problematic RLS and adding safe, non-recursive policies
-- 1) Drop existing policies on groups and group_memberships (names unknown) to avoid recursive errors
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('group_memberships', 'groups')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 2) Ensure RLS is enabled
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 3) Create safe, minimal policies
-- group_memberships
-- Allow authenticated users to read memberships (needed for member counts)
CREATE POLICY "Select memberships for counts and membership lists"
ON public.group_memberships
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert/delete only their own membership rows
CREATE POLICY "Users can insert their own membership"
ON public.group_memberships
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own membership"
ON public.group_memberships
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- groups
-- Allow authenticated users to list active groups
CREATE POLICY "Anyone authenticated can view active groups"
ON public.groups
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow users to create groups they own
CREATE POLICY "Users can create groups they own"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Optional but helpful: allow group owners to update their group
CREATE POLICY "Group creator can update group"
ON public.groups
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());