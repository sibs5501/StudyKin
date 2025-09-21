-- Create storage buckets for group chat functionality (fix column name)
INSERT INTO storage.buckets (id, name) VALUES 
  ('group-images', 'group-images'),
  ('group-voice', 'group-voice');

-- Make buckets public
UPDATE storage.buckets SET public = true WHERE id IN ('group-images', 'group-voice');

-- Set up storage policies for group images
CREATE POLICY "Users can upload group images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'group-images');

CREATE POLICY "Users can view group images" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'group-images');

-- Set up storage policies for group voice notes
CREATE POLICY "Users can upload group voice notes" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'group-voice');

CREATE POLICY "Users can view group voice notes" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'group-voice');

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;