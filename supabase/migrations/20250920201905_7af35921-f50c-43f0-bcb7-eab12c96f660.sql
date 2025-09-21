-- Create storage bucket for study materials if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('study-materials', 'study-materials', false)
ON CONFLICT (id) DO UPDATE SET 
  name = 'study-materials',
  public = false;

-- Ensure storage policies exist
DROP POLICY IF EXISTS "Users can upload their own study materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own study materials" ON storage.objects;

-- Create storage policies for study materials
CREATE POLICY "Users can upload their own study materials" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'study-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own study materials" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'study-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own study materials" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'study-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own study materials" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'study-materials' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);