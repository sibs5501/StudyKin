-- Create the storage bucket for study materials (id and name must match the client usage)
insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do nothing;

-- Ensure RLS policies allow users to manage files within their own folder (<user_id>/...)
-- SELECT (view) own files
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can view their own study materials'
  ) then
    create policy "Users can view their own study materials"
      on storage.objects
      for select
      using (
        bucket_id = 'study-materials'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end
$$;

-- INSERT (upload) to own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own study materials'
  ) THEN
    CREATE POLICY "Users can upload their own study materials"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'study-materials'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END
$$;

-- UPDATE (rename/metadata) own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own study materials'
  ) THEN
    CREATE POLICY "Users can update their own study materials"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'study-materials'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'study-materials'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END
$$;

-- DELETE own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own study materials'
  ) THEN
    CREATE POLICY "Users can delete their own study materials"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'study-materials'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END
$$;