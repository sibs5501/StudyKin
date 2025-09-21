-- Fix infinite recursion in group_memberships RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON public.group_memberships;

-- Create security definer function to get user role in a group
CREATE OR REPLACE FUNCTION public.get_user_role_in_group(group_id_param UUID, user_id_param UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.group_memberships 
  WHERE group_id = group_id_param AND user_id = user_id_param;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create new RLS policies without circular references
CREATE POLICY "Users can view their own group memberships" 
ON public.group_memberships 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create group memberships for themselves" 
ON public.group_memberships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group memberships" 
ON public.group_memberships 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix groups table RLS policies
DROP POLICY IF EXISTS "Anyone can view active groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators and admins can update groups" ON public.groups;

CREATE POLICY "Anyone can view active groups" 
ON public.groups 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND auth.uid() IS NOT NULL);

CREATE POLICY "Group creators can update groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Fix group_messages RLS policies 
DROP POLICY IF EXISTS "Group members can view messages" ON public.group_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON public.group_messages;

CREATE POLICY "Group members can view messages" 
ON public.group_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = group_messages.group_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Group members can send messages" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = group_messages.group_id 
    AND user_id = auth.uid()
  )
);