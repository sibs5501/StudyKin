import { useRef } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StudyModeCard } from "@/components/StudyModeCard";
import { WellnessCard } from "@/components/WellnessCard";
import { GamificationCard } from "@/components/GamificationCard";
import { useGameification } from "@/hooks/useGameification";

const Dashboard = () => {
  const studyModeRef = useRef<HTMLDivElement>(null);
  const wellnessRef = useRef<HTMLDivElement>(null);
  const { userStats, userBadges, loading, nextLevelXP, awardXP } = useGameification();

  const handleStartStudying = () => {
    studyModeRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  };

  const handleWellnessBreak = () => {
    wellnessRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-6xl">
        {/* Header Section */}
        <DashboardHeader 
          userLevel={userStats?.current_level || 1}
          userXP={userStats?.current_xp || 0}
          nextLevelXP={nextLevelXP}
          studyStreak={userStats?.study_streak || 0}
          onStartStudying={handleStartStudying}
          onWellnessBreak={handleWellnessBreak}
        />

        {/* Main Content Grid */}
        <section className="py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              <div ref={studyModeRef}>
                <StudyModeCard awardXP={awardXP} />
              </div>
              <div ref={wellnessRef}>
                <WellnessCard awardXP={awardXP} />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              <GamificationCard 
                userStats={userStats}
                userBadges={userBadges}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;