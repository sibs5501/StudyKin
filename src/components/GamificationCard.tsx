import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserStats, UserBadge } from "@/hooks/useGameification";
import { 
  Trophy, 
  Medal, 
  Flame, 
  Target, 
  Crown, 
  Star,
  Zap,
  Award,
  Brain,
  BookOpen,
  Clock,
  Shield
} from "lucide-react";

interface GamificationCardProps {
  userStats?: UserStats | null;
  userBadges?: UserBadge[];
}

export const GamificationCard = ({ userStats, userBadges = [] }: GamificationCardProps) => {
  // Icon mapping for badges
  const iconMap: { [key: string]: any } = {
    Target,
    Star,
    Brain,
    Trophy,
    Flame,
    Shield,
    BookOpen,
    Clock,
    Crown,
    Zap
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || Target;
  };

  const getRarityFromColor = (color: string) => {
    switch (color) {
      case 'primary': return 'common';
      case 'accent': return 'rare';
      case 'wellness': return 'epic';
      case 'gamify': return 'legendary';
      default: return 'common';
    }
  };


  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-muted-foreground border-muted";
      case "rare": return "text-primary border-primary";
      case "epic": return "text-gamify border-gamify";
      case "legendary": return "text-accent border-accent";
      default: return "text-muted-foreground border-muted";
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-muted/10";
      case "rare": return "bg-primary/10";
      case "epic": return "bg-gamify/10";
      case "legendary": return "bg-accent/10";
      default: return "bg-muted/10";
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gamify" />
            <span className="hidden sm:inline">Achievements</span>
            <span className="sm:hidden">Progress</span>
          </h3>
          <p className="text-sm text-muted-foreground">Track progress and unlock rewards</p>
        </div>
        <Badge className="bg-gamify/10 text-gamify border-gamify/20 w-fit">
          <Crown className="w-3 h-3 mr-1" />
          Level {userStats?.current_level || 1}
        </Badge>
      </div>

      {/* Daily Challenge */}
      <div className="p-3 sm:p-4 bg-gradient-gamify/10 rounded-lg border border-gamify/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gamify/20 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-gamify" />
            </div>
            <div>
              <h4 className="font-semibold text-gamify text-sm sm:text-base">Daily Challenge</h4>
              <p className="text-xs text-muted-foreground">Complete 3 practice quizzes</p>
            </div>
          </div>
          <Badge variant="outline" className="border-gamify/20 text-gamify text-xs">
            +250 XP
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span>Progress</span>
            <span className="font-medium">{userStats?.sessions_completed || 0}/3 completed</span>
          </div>
          <Progress value={Math.min(((userStats?.sessions_completed || 0) / 3) * 100, 100)} className="h-2" />
        </div>
      </div>

      {/* Achievements Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Achievements</h4>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {userBadges.slice(0, 4).map((badge) => {
            const IconComponent = getIconComponent(badge.icon);
            const rarity = getRarityFromColor(badge.color);
            return (
              <div 
                key={badge.id}
                className={cn(
                  "p-2 sm:p-3 rounded-lg border transition-all duration-300 cursor-pointer group",
                  `${getRarityBg(rarity)} ${getRarityColor(rarity)} hover:scale-105 shadow-sm`
                )}
              >
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <div className={cn(
                    "w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-all duration-300",
                    getRarityBg(rarity)
                  )}>
                    <IconComponent className={cn(
                      "w-3 h-3",
                      getRarityColor(rarity).split(' ')[0]
                    )} />
                  </div>
                  <div className="text-xs font-medium capitalize">{rarity}</div>
                </div>
                <h5 className="font-semibold text-xs sm:text-sm mb-1">{badge.name}</h5>
                <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{badge.description}</p>
              </div>
            );
          })}
          
          {/* Show placeholder if no badges */}
          {userBadges.length === 0 && (
            <>
              <div className="p-2 sm:p-3 rounded-lg border bg-muted/5 border-muted opacity-60">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center bg-muted/20">
                    <Target className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">Locked</div>
                </div>
                <h5 className="font-semibold text-xs sm:text-sm mb-1">First Steps</h5>
                <p className="text-xs text-muted-foreground leading-tight line-clamp-2">Complete your first study session</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg border bg-muted/5 border-muted opacity-60">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center bg-muted/20">
                    <Star className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">Locked</div>
                </div>
                <h5 className="font-semibold text-xs sm:text-sm mb-1">Study Rookie</h5>
                <p className="text-xs text-muted-foreground leading-tight line-clamp-2">Earn your first 100 XP</p>
              </div>
            </>
          )}
        </div>
      </div>

    </Card>
  );
};