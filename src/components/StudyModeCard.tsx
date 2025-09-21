import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { AIContentModal } from "./AIContentModal";
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  Brain, 
  Sparkles,
  Clock,
  CheckCircle2,
  BookOpen,
  Zap,
  Eye
} from "lucide-react";

interface StudyMaterial {
  id: string;
  title: string;
  status: string;
  content?: string;
  file_url?: string;
  created_at: string;
}

interface AIContent {
  id: string;
  content_type: string;
  title: string;
  content: any;
}

interface StudyModeCardProps {
  awardXP?: (activityType: string, xpAmount: number, description?: string) => Promise<any>;
}

export const StudyModeCard = ({ awardXP }: StudyModeCardProps = {}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [processingMaterial, setProcessingMaterial] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchStudyMaterials();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('study-materials-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'study_materials',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchStudyMaterials();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchStudyMaterials = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('study_materials')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching study materials:', error);
    } else {
      setStudyMaterials(data || []);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Read file content directly in the browser (no Storage upload)
      setUploadProgress(20);

      // Detect file types
      let content = '';
      let imageDataUrl: string | undefined;
      const isTextFile = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      try {
        if (isTextFile) {
          content = await file.text();
        } else if (isPDF) {
          // Dynamically import pdfjs to extract text client-side
          const pdfjsLib: any = await import('pdfjs-dist');
          const workerUrl = (await import('pdfjs-dist/build/pdf.worker?url')).default as string;
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;

          let extracted = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            extracted += textContent.items.map((item: any) => item.str || '').join(' ') + '\n';
          }

          content = extracted || `PDF uploaded: ${file.name}`;
        } else if (isImage) {
          // Read image as Data URL for AI OCR
          imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          content = `Image uploaded: ${file.name}. Extracting text with AI.`;
        } else {
          content = await file.text().catch(() => `File uploaded: ${file.name}.`);
        }
      } catch (readErr) {
        console.error('Error reading file:', readErr);
        content = `File uploaded: ${file.name}. Content could not be fully read; AI will attempt extraction.`;
      }

      setUploadProgress(70);

      // Create database record
      const { data: materialData, error: dbError } = await supabase
        .from('study_materials')
        .insert({
          user_id: user.id,
          title: file.name,
          content,
          file_type: file.type,
          status: 'uploaded'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(100);
      
      toast({
        title: "File uploaded successfully!",
        description: "Your study material is ready for AI processing.",
      });

      // Auto-generate summary for all file types
      if (content) {
        handleGenerateContent(materialData.id, 'summary', content, undefined, imageDataUrl);
      }

      // Award XP for first upload
      if (awardXP) {
        await awardXP('file_upload', 25, 'Uploaded study material');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateContent = async (materialId: string, contentType: string, content: string, fileUrl?: string, imageDataUrl?: string) => {
    if (!content.trim()) {
      toast({
        title: "No content found",
        description: "Please upload a text file, PDF, or image with content to process.",
        variant: "destructive",
      });
      return;
    }

    setProcessingMaterial(materialId);

    try {
      const response = await supabase.functions.invoke('ai-study-processor', {
        body: {
          materialId,
          contentType,
          content: content.substring(0, 10000), // Limit content length
          fileUrl,
          imageDataUrl, // Pass inline image data to bypass Storage
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "AI content generated!",
        description: `Your ${contentType} is ready to view.`,
      });

      // Award XP for AI content generation
      if (awardXP) {
        const xpAmounts = {
          'summary': 15,
          'flashcards': 20,
          'quiz': 25
        };
        await awardXP(`ai_${contentType}`, xpAmounts[contentType as keyof typeof xpAmounts] || 15, `Generated ${contentType}`);
      }

    } catch (error) {
      console.error('Error generating AI content:', error);
      toast({
        title: "AI processing failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingMaterial(null);
    }
  };

  const getContentSummary = (material: StudyMaterial) => {
    if (material.status === 'processing') return 'Processing...';
    if (material.status === 'uploaded') return 'Ready for AI processing';
    return 'AI content generated';
  };

  const clearStudyMaterials = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('study_materials')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setStudyMaterials([]);
      toast({
        title: "Study materials cleared",
        description: "All recent study materials have been removed.",
      });
    } catch (error) {
      console.error('Error clearing study materials:', error);
      toast({
        title: "Clear failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Study Mode
          </h3>
          <p className="text-sm text-muted-foreground">Upload notes and let AI create your study materials</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 w-fit">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center space-y-3 sm:space-y-4 hover:border-primary/50 transition-colors">
        <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold mb-1 text-sm sm:text-base">Upload Your Study Materials</h4>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            Upload PDFs, images (PNG, JPG), or text files. AI will extract content and generate summaries, quizzes, and flashcards.
          </p>
          {isUploading ? (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              <p className="text-xs text-muted-foreground">Processing your notes...</p>
            </div>
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".txt,.md,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.webp"
                onChange={handleFileUpload}
              />
              <Button 
                className={cn(buttonVariants({ variant: "study" }), "text-sm")}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4" />
                  Choose Files
                </span>
              </Button>
            </label>
          )}
        </div>
      </div>

      {/* Study Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div 
          className="p-3 sm:p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer group"
          onClick={() => studyMaterials.length > 0 && studyMaterials[0].content && handleGenerateContent(studyMaterials[0].id, 'summary', studyMaterials[0].content, studyMaterials[0].file_url)}
        >
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-accent/20 transition-colors">
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <h4 className="font-semibold mb-1 text-sm sm:text-base">Smart Summaries</h4>
          <p className="text-xs text-muted-foreground">AI-generated key points and concepts</p>
        </div>

        <div 
          className="p-3 sm:p-4 border rounded-lg hover:bg-wellness/5 transition-colors cursor-pointer group"
          onClick={() => studyMaterials.length > 0 && studyMaterials[0].content && handleGenerateContent(studyMaterials[0].id, 'flashcard', studyMaterials[0].content, studyMaterials[0].file_url)}
        >
          <div className="w-8 h-8 bg-wellness/10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-wellness/20 transition-colors">
            <BookOpen className="w-4 h-4 text-wellness" />
          </div>
          <h4 className="font-semibold mb-1 text-sm sm:text-base">Flashcards</h4>
          <p className="text-xs text-muted-foreground">Interactive cards for quick review</p>
        </div>

        <div 
          className="p-3 sm:p-4 border rounded-lg hover:bg-gamify/5 transition-colors cursor-pointer group"
          onClick={() => studyMaterials.length > 0 && studyMaterials[0].content && handleGenerateContent(studyMaterials[0].id, 'quiz', studyMaterials[0].content, studyMaterials[0].file_url)}
        >
          <div className="w-8 h-8 bg-gamify/10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-gamify/20 transition-colors">
            <Zap className="w-4 h-4 text-gamify" />
          </div>
          <h4 className="font-semibold mb-1 text-sm sm:text-base">Practice Quizzes</h4>
          <p className="text-xs text-muted-foreground">Test your knowledge with AI questions</p>
        </div>
      </div>

      {/* Recent Notes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Recent Study Materials</h4>
          {studyMaterials.length > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={clearStudyMaterials}
              className="text-xs h-7"
            >
              Clear All
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {studyMaterials.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No study materials yet</p>
              <p className="text-xs">Upload your first file to get started</p>
            </div>
          ) : (
            studyMaterials.map((material) => (
              <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    material.status === "processed" && "bg-accent",
                    material.status === "processing" && "bg-gamify animate-pulse",
                    material.status === "uploaded" && "bg-primary"
                  )} />
                  <div>
                    <p className="font-medium text-sm">{material.title}</p>
                    <p className="text-xs text-muted-foreground">{getContentSummary(material)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {material.status === "processed" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setSelectedMaterial(material);
                          setShowContentModal(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    </>
                  )}
                  {(material.status === "processing" || processingMaterial === material.id) && (
                    <Clock className="w-4 h-4 text-gamify animate-spin" />
                  )}
                  {material.status === "uploaded" && material.content && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleGenerateContent(material.id, 'summary', material.content!, material.file_url)}
                      disabled={processingMaterial === material.id}
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      Process
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Content Modal */}
      {selectedMaterial && (
        <AIContentModal
          isOpen={showContentModal}
          onClose={() => {
            setShowContentModal(false);
            setSelectedMaterial(null);
          }}
          materialId={selectedMaterial.id}
          materialTitle={selectedMaterial.title}
        />
      )}
    </Card>
  );
};