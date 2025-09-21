import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserStats {
  id: string;
  user_id: string;
  current_xp: number;
  current_level: number;
  total_xp: number;
  study_streak: number;
  last_study_date: string | null;
  total_study_minutes: number;
  sessions_completed: number;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  color: string;
  created_at: string;
}

export interface UserBadge extends Badge {
  earned_at: string;
}

export interface XPActivity {
  id: string;
  user_id: string;
  activity_type: string;
  xp_earned: number;
  description: string | null;
  created_at: string;
}

export const useGameification = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [recentActivities, setRecentActivities] = useState<XPActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate XP needed for next level
  const calculateXPForLevel = (level: number): number => {
    return (level * 100) + ((level - 1) * 50);
  };

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user stats:', error);
        return;
      }

      if (data) {
        setUserStats(data);
      } else {
        // Create initial stats for new user
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user stats:', createError);
        } else {
          setUserStats(newStats);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserStats:', error);
    }
  };

  // Fetch user badges
  const fetchUserBadges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at,
          badges (
            id,
            name,
            description,
            icon,
            requirement_type,
            requirement_value,
            color,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user badges:', error);
        return;
      }

      const badges = data?.map(item => ({
        ...item.badges,
        earned_at: item.earned_at
      })) || [];

      setUserBadges(badges as UserBadge[]);
    } catch (error) {
      console.error('Error in fetchUserBadges:', error);
    }
  };

  // Fetch available badges
  const fetchAvailableBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (error) {
        console.error('Error fetching badges:', error);
        return;
      }

      setAvailableBadges(data || []);
    } catch (error) {
      console.error('Error in fetchAvailableBadges:', error);
    }
  };

  // Fetch recent XP activities
  const fetchRecentActivities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('xp_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      setRecentActivities(data || []);
    } catch (error) {
      console.error('Error in fetchRecentActivities:', error);
    }
  };

  // Award XP function
  const awardXP = async (activityType: string, xpAmount: number, description?: string) => {
    if (!user) {
      console.error('No user found for XP award');
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_activity_type: activityType,
        p_xp_amount: xpAmount,
        p_description: description
      });

      if (error) {
        console.error('Error awarding XP:', error);
        return null;
      }

      const result = data as unknown as {
        xp_awarded: number;
        total_xp: number;
        current_level: number;
        new_badges: Badge[];
      };

      // Show XP gained notification
      if (result.xp_awarded > 0) {
        toast.success(`+${result.xp_awarded} XP earned!`, {
          description: `${activityType.replace('_', ' ').toUpperCase()}`
        });
      }

      // Show new badges notification
      if (result.new_badges && result.new_badges.length > 0) {
        result.new_badges.forEach((badge: Badge) => {
          toast.success(`🏆 New Badge Unlocked!`, {
            description: `${badge.name}: ${badge.description}`
          });
        });
      }

      // Refresh data
      await Promise.all([
        fetchUserStats(),
        fetchUserBadges(),
        fetchRecentActivities()
      ]);

      return result;
    } catch (error) {
      console.error('Error in awardXP:', error);
      return null;
    }
  };

  // Update study streak
  const updateStudyStreak = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('update_study_streak', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error updating study streak:', error);
        return;
      }

      // Refresh user stats
      await fetchUserStats();
      
      return data;
    } catch (error) {
      console.error('Error in updateStudyStreak:', error);
    }
  };

  // Initialize data
  useEffect(() => {
    if (user) {
      const initializeData = async () => {
        setLoading(true);
        await Promise.all([
          fetchUserStats(),
          fetchUserBadges(),
          fetchAvailableBadges(),
          fetchRecentActivities()
        ]);
        setLoading(false);
      };

      initializeData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Calculate next level XP
  const nextLevelXP = userStats ? calculateXPForLevel(userStats.current_level + 1) : 100;

  return {
    userStats,
    userBadges,
    availableBadges,
    recentActivities,
    loading,
    nextLevelXP,
    awardXP,
    updateStudyStreak,
    refreshStats: fetchUserStats,
    refreshBadges: fetchUserBadges,
    refreshActivities: fetchRecentActivities
  };
};