-- Create study materials table
CREATE TABLE IF NOT EXISTS public.study_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create AI-generated content table
CREATE TABLE IF NOT EXISTS public.ai_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_material_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('summary', 'flashcard', 'quiz')),
  title TEXT,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_materials
CREATE POLICY "Users can view their own study materials" 
ON public.study_materials FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study materials" 
ON public.study_materials FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study materials" 
ON public.study_materials FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study materials" 
ON public.study_materials FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for ai_content
CREATE POLICY "Users can view AI content for their materials" 
ON public.ai_content FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.study_materials sm 
  WHERE sm.id = ai_content.study_material_id 
  AND sm.user_id = auth.uid()
));

CREATE POLICY "Users can create AI content for their materials" 
ON public.ai_content FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.study_materials sm 
  WHERE sm.id = ai_content.study_material_id 
  AND sm.user_id = auth.uid()
));

-- Create storage bucket for study materials
INSERT INTO storage.buckets (id, name, public) 
VALUES ('study-materials', 'study-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own study materials" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own study materials" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_materials_updated_at
  BEFORE UPDATE ON public.study_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.study_materials REPLICA IDENTITY FULL;
ALTER TABLE public.ai_content REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.study_materials;
ALTER publication supabase_realtime ADD TABLE public.ai_content;