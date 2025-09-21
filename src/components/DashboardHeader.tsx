import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AIChatModal } from "@/components/AIChatModal";
import { GroupsModal } from "@/components/GroupsModal";
import { GroupChat } from "@/components/GroupChat";
import { 
  Brain, 
  Trophy, 
  Target, 
  Flame, 
  Star,
  Settings,
  User,
  Bell,
  LogOut,
  MessageCircle,
  Users
} from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  userLevel?: number;
  userXP?: number;
  nextLevelXP?: number;
  studyStreak?: number;
}

interface DashboardHeaderProps {
  userName?: string;
  userLevel?: number;
  userXP?: number;
  nextLevelXP?: number;
  studyStreak?: number;
  onStartStudying?: () => void;
  onWellnessBreak?: () => void;
}

export const DashboardHeader = ({ 
  userLevel = 5,
  userXP = 1250,
  nextLevelXP = 1500,
  studyStreak = 7,
  onStartStudying,
  onWellnessBreak
}: Omit<DashboardHeaderProps, 'userName'>) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const xpProgress = (userXP / nextLevelXP) * 100;

  const handleSignOut = () => {
    signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-hero flex items-center justify-center">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              StudyKin
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Your AI Learning Companion</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost" 
            size="icon"
            onClick={() => setShowGroups(true)}
            className="relative hover:bg-primary/10 hover:text-primary transition-colors h-8 w-8 sm:h-10 sm:w-10"
            title="Study Groups"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" 
            size="icon"
            onClick={() => setShowAIChat(true)}
            className="relative hover:bg-primary/10 hover:text-primary transition-colors h-8 w-8 sm:h-10 sm:w-10"
            title="AI Chat Assistant"
          >
            <MessageCircle className="w-4 h-4" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          </Button>
          <Button
            variant="ghost" 
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "relative h-8 w-8 sm:h-10 sm:w-10",
              showNotifications && "bg-accent/10"
            )}
          >
            <Bell className="w-4 h-4" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gamify rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">3</span>
            </div>
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8 sm:h-10 sm:w-10">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8 sm:h-10 sm:w-10">
            <User className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSignOut}
            title="Sign Out"
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Welcome Card with Stats */}
      <Card className="p-4 sm:p-6 bg-gradient-card border-0 shadow-glow">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Welcome back, {user?.firstName || 'Student'}! 👋
              </h2>
              <p className="text-sm text-muted-foreground">Ready to level up your learning today?</p>
            </div>
            <div className="flex items-center gap-6 sm:gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center sm:justify-start">
                  <Flame className="w-4 h-4 text-gamify" />
                  <span className="text-xl sm:text-2xl font-bold text-gamify">{studyStreak}</span>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center sm:justify-start">
                  <Star className="w-4 h-4 text-accent" />
                  <span className="text-xl sm:text-2xl font-bold text-accent">Level {userLevel}</span>
                </div>
                <p className="text-xs text-muted-foreground">Current Level</p>
              </div>
            </div>
          </div>

        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress to Level {userLevel + 1}</span>
            <span className="font-medium">{userXP} / {nextLevelXP} XP</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 mt-4">
            <Button 
              className={cn(
                buttonVariants({ variant: "study", size: "default" }),
                "flex-1 justify-center"
              )}
              onClick={onStartStudying}
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Start Studying</span>
              <span className="sm:hidden">Study</span>
            </Button>
            <Button 
              className={cn(
                buttonVariants({ variant: "wellness", size: "default" }),
                "flex-1 justify-center"
              )}
              onClick={onWellnessBreak}
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Wellness Break</span>
              <span className="sm:hidden">Wellness</span>
            </Button>
            <Button 
              className={cn(
                buttonVariants({ variant: "gamify", size: "default" }),
                "flex-1 justify-center"
              )}
              onClick={() => setShowGroups(true)}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Study Groups</span>
              <span className="sm:hidden">Groups</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Achievement Badges - Now handled by GamificationCard */}

      {/* Groups Modal */}
      <GroupsModal 
        open={showGroups && !selectedGroupId} 
        onOpenChange={setShowGroups}
        onGroupSelect={(groupId) => setSelectedGroupId(groupId)}
      />
      
      {/* Group Chat Modal */}
      <GroupChat 
        open={!!selectedGroupId}
        onOpenChange={(open) => !open && setSelectedGroupId(null)}
        groupId={selectedGroupId}
        onBack={() => {
          setSelectedGroupId(null);
          setShowGroups(true);
        }}
      />

      {/* AI Chat Modal */}
      <AIChatModal 
        isOpen={showAIChat} 
        onClose={() => setShowAIChat(false)} 
      />
    </div>
  );
};