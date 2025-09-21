-- Ensure the storage bucket is properly initialized via the official helper
-- and that object-level RLS policies are in place for per-user access.

-- Create bucket if it doesn't exist, preferring storage.create_bucket which
-- also initializes internal storage tenant config. Falls back to insert if needed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'study-materials'
  ) THEN
    BEGIN
      -- Prefer official helper (handles internal storage config)
      PERFORM storage.create_bucket(
        id => 'study-materials',
        name => 'study-materials'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Fallback for environments where helper signature differs
      INSERT INTO storage.buckets (id, name) VALUES ('study-materials', 'study-materials');
    END;
  END IF;
END $$;

-- Recreate policies idempotently for the study-materials bucket
DROP POLICY IF EXISTS "Users can upload their own study materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own study materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own study materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own study materials" ON storage.objects;

-- Insert/upload: only into their own user folder (first folder part equals auth.uid())
CREATE POLICY "Users can upload their own study materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Read: users can read files within their own folder
CREATE POLICY "Users can view their own study materials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update: users can update files within their own folder
CREATE POLICY "Users can update their own study materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete: users can delete files within their own folder
CREATE POLICY "Users can delete their own study materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
