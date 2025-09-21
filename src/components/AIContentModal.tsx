import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, BookOpen, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIContent {
  id: string;
  content_type: string;
  title: string;
  content: any;
  created_at: string;
}

interface AIContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle: string;
}

export const AIContentModal = ({ isOpen, onClose, materialId, materialTitle }: AIContentModalProps) => {
  const [aiContents, setAiContents] = useState<AIContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<AIContent | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && materialId) {
      fetchAIContent();
    }
  }, [isOpen, materialId]);

  const fetchAIContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_content')
      .select('*')
      .eq('study_material_id', materialId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI content:', error);
    } else {
      setAiContents(data || []);
      if (data && data.length > 0) {
        setSelectedContent(data[0]);
      }
    }
    setLoading(false);
  };

  const renderSummary = (content: any) => (
    <div className="space-y-4">
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap">{content.summary}</div>
      </div>
    </div>
  );

  const renderFlashcards = (content: any) => {
    const flashcards = content.flashcards || [];
    if (flashcards.length === 0) return <p>No flashcards available.</p>;

    const currentCard = flashcards[currentFlashcardIndex];
    
    return (
      <div className="space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          {currentFlashcardIndex + 1} of {flashcards.length}
        </div>
        
        <Card className="p-6 min-h-[200px] flex items-center justify-center cursor-pointer"
              onClick={() => setShowAnswer(!showAnswer)}>
          <div className="text-center space-y-4">
            <div className="text-lg font-medium">
              {showAnswer ? currentCard.back : currentCard.front}
            </div>
            <Badge variant="outline">
              {showAnswer ? 'Answer' : 'Question'} - Click to flip
            </Badge>
          </div>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentFlashcardIndex(Math.max(0, currentFlashcardIndex - 1));
              setShowAnswer(false);
            }}
            disabled={currentFlashcardIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            Flip Card
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setCurrentFlashcardIndex(Math.min(flashcards.length - 1, currentFlashcardIndex + 1));
              setShowAnswer(false);
            }}
            disabled={currentFlashcardIndex === flashcards.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  const renderQuiz = (content: any) => {
    const questions = content.questions || [];
    if (questions.length === 0) return <p>No quiz questions available.</p>;

    const calculateScore = () => {
      let correct = 0;
      questions.forEach((q: any, index: number) => {
        if (quizAnswers[index] === q.correctAnswer) correct++;
      });
      return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
    };

    if (showQuizResults) {
      const score = calculateScore();
      return (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">Quiz Results</h3>
            <div className="text-3xl font-bold text-primary">
              {score.correct}/{score.total} ({score.percentage}%)
            </div>
          </div>
          
          <div className="space-y-3">
            {questions.map((question: any, index: number) => {
              const userAnswer = quizAnswers[index];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <p className="font-medium">{question.question}</p>
                    <div className="grid gap-2">
                      {question.options.map((option: string, optIndex: number) => (
                        <div
                          key={optIndex}
                          className={cn(
                            "p-2 rounded text-sm",
                            optIndex === question.correctAnswer && "bg-green-100 text-green-800",
                            optIndex === userAnswer && optIndex !== question.correctAnswer && "bg-red-100 text-red-800",
                            optIndex !== question.correctAnswer && optIndex !== userAnswer && "bg-gray-50"
                          )}
                        >
                          {option}
                          {optIndex === question.correctAnswer && " ✓"}
                          {optIndex === userAnswer && optIndex !== question.correctAnswer && " ✗"}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setShowQuizResults(false);
              setQuizAnswers({});
            }}
            className="w-full"
          >
            Retake Quiz
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {questions.map((question: any, index: number) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <p className="font-medium">
                {index + 1}. {question.question}
              </p>
              <div className="grid gap-2">
                {question.options.map((option: string, optIndex: number) => (
                  <label
                    key={optIndex}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-accent/5",
                      quizAnswers[index] === optIndex && "bg-primary/10"
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      checked={quizAnswers[index] === optIndex}
                      onChange={() => setQuizAnswers(prev => ({ ...prev, [index]: optIndex }))}
                      className="text-primary"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </Card>
        ))}
        
        <Button 
          onClick={() => setShowQuizResults(true)}
          disabled={Object.keys(quizAnswers).length !== questions.length}
          className="w-full"
        >
          Submit Quiz
        </Button>
      </div>
    );
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'summary': return FileText;
      case 'flashcard': return BookOpen;
      case 'quiz': return Zap;
      default: return FileText;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Study Content - {materialTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Content Type Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {aiContents.map((content) => {
                const Icon = getContentIcon(content.content_type);
                return (
                  <Button
                    key={content.id}
                    variant={selectedContent?.id === content.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedContent(content);
                      setCurrentFlashcardIndex(0);
                      setShowAnswer(false);
                      setQuizAnswers({});
                      setShowQuizResults(false);
                    }}
                    className="flex-shrink-0"
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {content.title}
                  </Button>
                );
              })}
            </div>

            {/* Content Display */}
            {selectedContent && (
              <div className="mt-6">
                {selectedContent.content_type === 'summary' && renderSummary(selectedContent.content)}
                {selectedContent.content_type === 'flashcard' && renderFlashcards(selectedContent.content)}
                {selectedContent.content_type === 'quiz' && renderQuiz(selectedContent.content)}
              </div>
            )}

            {aiContents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No AI content generated yet.</p>
                <p className="text-sm">Generate summaries, flashcards, or quizzes from your study material.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};