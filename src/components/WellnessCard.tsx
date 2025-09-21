import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Heart, 
  Leaf, 
  Clock,
  Volume2,
  VolumeX,
  Lightbulb,
  Waves
} from "lucide-react";

interface WellnessCardProps {
  awardXP?: (activityType: string, xpAmount: number, description?: string) => Promise<any>;
}

export const WellnessCard = ({ awardXP }: WellnessCardProps = {}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [cycles, setCycles] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'focus' 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer completed
      setIsRunning(false);
      if (mode === 'focus') {
        setCycles(prev => prev + 1);
        setMode('break');
        setTimeLeft(5 * 60); // 5 minute break
        
        // Award XP for completing a focus session
        if (awardXP) {
          awardXP('study_session', 20, '25');
        }
      } else {
        setMode('focus');
        setTimeLeft(25 * 60); // 25 minute focus
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const wellnessTips = [
    "Take deep breaths to reduce stress and improve focus",
    "Every 20 minutes, look at something 20 feet away for 20 seconds",
    "Stay hydrated - drink a glass of water every hour",
    "Take a 5-minute walk to refresh your mind",
    "Practice gratitude - think of 3 things you're thankful for"
  ];

  const [currentTip] = useState(wellnessTips[Math.floor(Math.random() * wellnessTips.length)]);

  return (
    <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-wellness" />
            Wellness Center
          </h3>
          <p className="text-sm text-muted-foreground">Focus, breathe, and stay balanced</p>
        </div>
        <Badge className="bg-wellness/10 text-wellness border-wellness/20 w-fit">
          <Leaf className="w-3 h-3 mr-1" />
          Mindful Learning
        </Badge>
      </div>

      {/* Pomodoro Timer */}
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="relative inline-block">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 sm:border-8 border-muted flex items-center justify-center relative overflow-hidden">
            <div 
              className={cn(
                "absolute inset-0 rounded-full transition-all duration-1000",
                mode === 'focus' ? "bg-gradient-primary" : "bg-gradient-wellness"
              )}
              style={{
                background: `conic-gradient(${mode === 'focus' ? 'hsl(var(--primary))' : 'hsl(var(--wellness))'} ${progress * 3.6}deg, transparent 0deg)`
              }}
            />
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-background rounded-full flex items-center justify-center relative z-10">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">{formatTime(timeLeft)}</div>
                <div className="text-xs text-muted-foreground capitalize">{mode}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <Button
            onClick={toggleTimer}
            className={cn(
              buttonVariants({ 
                variant: mode === 'focus' ? 'study' : 'wellness', 
                size: 'default' 
              }),
              "text-sm"
            )}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Start'}</span>
          </Button>
          
          <Button variant="outline" size="default" onClick={resetTimer}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="default"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg text-gamify">{cycles}</div>
            <div className="text-muted-foreground">Cycles</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-accent">{cycles * 25}</div>
            <div className="text-muted-foreground">Minutes</div>
          </div>
        </div>
      </div>

      {/* Wellness Actions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Button 
          onClick={() => setShowBreathing(!showBreathing)}
          className={cn(
            buttonVariants({ variant: "wellness" }),
            "w-full text-sm",
            showBreathing && "ring-2 ring-wellness/20"
          )}
        >
          <Waves className="w-4 h-4" />
          <span className="hidden sm:inline">Breathing Exercise</span>
          <span className="sm:hidden">Breathe</span>
        </Button>
        
        <Button variant="outline" className="w-full text-sm">
          <Lightbulb className="w-4 h-4" />
          <span className="hidden sm:inline">Wellness Tips</span>
          <span className="sm:hidden">Tips</span>
        </Button>
      </div>

      {/* Breathing Exercise */}
      {showBreathing && (
        <div className="text-center space-y-4 p-6 bg-wellness/5 rounded-lg border border-wellness/20">
          <div className="w-20 h-20 mx-auto bg-gradient-wellness rounded-full flex items-center justify-center animate-pulse">
            <Waves className="w-8 h-8 text-wellness-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-wellness">4-7-8 Breathing</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Inhale for 4, hold for 7, exhale for 8
            </p>
          </div>
        </div>
      )}

      {/* Wellness Tip */}
      <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-accent text-sm mb-1">Wellness Tip</h4>
            <p className="text-sm text-muted-foreground">{currentTip}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};