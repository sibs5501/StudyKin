-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create group memberships table
CREATE TABLE public.group_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  UNIQUE(group_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice')),
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table for group chat display names
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups (public groups, anyone can view)
CREATE POLICY "Anyone can view groups" 
ON public.groups 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = created_by);

-- RLS Policies for group memberships
CREATE POLICY "Users can view memberships for groups they're in" 
ON public.group_memberships 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.group_memberships gm 
    WHERE gm.group_id = group_memberships.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can join groups" 
ON public.group_memberships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" 
ON public.group_memberships 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Group members can view messages" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships gm 
    WHERE gm.group_id = messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.group_memberships gm 
    WHERE gm.group_id = messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create storage buckets for group chat files
INSERT INTO storage.buckets (id, name) VALUES 
  ('group-images', 'group-images'),
  ('group-voice', 'group-voice');

-- Storage policies for group images (public access)
CREATE POLICY "Group images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'group-images');

CREATE POLICY "Group members can upload images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'group-images' AND 
  auth.uid() IS NOT NULL
);

-- Storage policies for voice notes (authenticated access)
CREATE POLICY "Authenticated users can view voice notes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'group-voice' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can upload voice notes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'group-voice' AND 
  auth.uid() IS NOT NULL
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for live chat
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_memberships REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;