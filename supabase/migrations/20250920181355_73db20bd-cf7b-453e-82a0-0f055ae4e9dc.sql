-- Create storage buckets for group chat functionality
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('group-images', 'group-images', true),
  ('group-voice', 'group-voice', true);

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

CREATE POLICY "Users can delete their own group images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'group-images' AND auth.uid()::text = (storage.foldername(name))[2]);

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

CREATE POLICY "Users can delete their own group voice notes" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'group-voice' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;