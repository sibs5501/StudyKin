-- Create user_stats table for tracking XP and level
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  study_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  total_study_minutes INTEGER NOT NULL DEFAULT 0,
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create badges table for different achievements
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'xp', 'streak', 'sessions', 'minutes'
  requirement_value INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges junction table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create xp_activities table for tracking XP sources
CREATE TABLE public.xp_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'study_session', 'streak_bonus', 'first_upload', 'quiz_complete', etc.
  xp_earned INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_stats
CREATE POLICY "Users can view their own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for badges (public read)
CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT USING (true);

-- RLS policies for user_badges
CREATE POLICY "Users can view their own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can earn badges" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for xp_activities
CREATE POLICY "Users can view their own XP activities" ON public.xp_activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP activities" ON public.xp_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value, color) VALUES
('First Steps', 'Complete your first study session', 'Target', 'sessions', 1, 'primary'),
('Study Rookie', 'Earn your first 100 XP', 'Star', 'xp', 100, 'accent'),
('Dedicated Learner', 'Complete 5 study sessions', 'Brain', 'sessions', 5, 'primary'),
('Study Master', 'Earn 1000 XP', 'Trophy', 'xp', 1000, 'accent'),
('Focus Champion', 'Study for 60 minutes total', 'Target', 'minutes', 60, 'wellness'),
('Streak Starter', 'Maintain a 3-day study streak', 'Flame', 'streak', 3, 'gamify'),
('Streak Legend', 'Maintain a 7-day study streak', 'Flame', 'streak', 7, 'gamify'),
('Study Warrior', 'Complete 25 study sessions', 'Shield', 'sessions', 25, 'primary'),
('Knowledge Seeker', 'Earn 2500 XP', 'BookOpen', 'xp', 2500, 'accent'),
('Marathon Learner', 'Study for 300 minutes total', 'Clock', 'minutes', 300, 'wellness'),
('Consistency King', 'Maintain a 14-day study streak', 'Crown', 'streak', 14, 'gamify'),
('Study Legend', 'Earn 5000 XP', 'Zap', 'xp', 5000, 'accent');

-- Function to calculate XP needed for next level
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- XP required grows exponentially: Level 1 = 100, Level 2 = 250, Level 3 = 450, etc.
  RETURN (level * 100) + ((level - 1) * 50);
END;
$$ LANGUAGE plpgsql;

-- Function to update user level based on total XP
CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level INTEGER := 1;
  xp_for_next INTEGER;
BEGIN
  -- Calculate new level based on total XP
  WHILE NEW.total_xp >= public.calculate_xp_for_level(new_level) LOOP
    new_level := new_level + 1;
  END LOOP;
  
  -- Set current level (subtract 1 because we went one level too far)
  NEW.current_level := new_level - 1;
  
  -- Calculate current XP within the level
  IF NEW.current_level = 1 THEN
    NEW.current_xp := NEW.total_xp;
  ELSE
    NEW.current_xp := NEW.total_xp - public.calculate_xp_for_level(NEW.current_level - 1);
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update level when XP changes
CREATE TRIGGER update_user_level_trigger
  BEFORE UPDATE OF total_xp ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_level();

-- Function to award XP and check for new badges
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_activity_type TEXT,
  p_xp_amount INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  user_stats_record RECORD;
  new_badges JSON;
  result JSON;
BEGIN
  -- Insert XP activity record
  INSERT INTO public.xp_activities (user_id, activity_type, xp_earned, description)
  VALUES (p_user_id, p_activity_type, p_xp_amount, p_description);
  
  -- Update user stats
  INSERT INTO public.user_stats (user_id, total_xp)
  VALUES (p_user_id, p_xp_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_xp = user_stats.total_xp + p_xp_amount,
    sessions_completed = CASE 
      WHEN p_activity_type = 'study_session' THEN user_stats.sessions_completed + 1
      ELSE user_stats.sessions_completed
    END,
    total_study_minutes = CASE 
      WHEN p_activity_type = 'study_session' AND p_description ~ '^[0-9]+$' THEN 
        user_stats.total_study_minutes + p_description::INTEGER
      ELSE user_stats.total_study_minutes
    END;
  
  -- Get updated user stats
  SELECT * INTO user_stats_record 
  FROM public.user_stats 
  WHERE user_id = p_user_id;
  
  -- Check for new badges and award them
  SELECT json_agg(
    json_build_object(
      'id', b.id,
      'name', b.name,
      'description', b.description,
      'icon', b.icon,
      'color', b.color
    )
  ) INTO new_badges
  FROM public.badges b
  WHERE b.id NOT IN (
    SELECT badge_id FROM public.user_badges WHERE user_id = p_user_id
  )
  AND (
    (b.requirement_type = 'xp' AND user_stats_record.total_xp >= b.requirement_value) OR
    (b.requirement_type = 'sessions' AND user_stats_record.sessions_completed >= b.requirement_value) OR
    (b.requirement_type = 'minutes' AND user_stats_record.total_study_minutes >= b.requirement_value) OR
    (b.requirement_type = 'streak' AND user_stats_record.study_streak >= b.requirement_value)
  );
  
  -- Award new badges
  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT p_user_id, b.id
  FROM public.badges b
  WHERE b.id NOT IN (
    SELECT badge_id FROM public.user_badges WHERE user_id = p_user_id
  )
  AND (
    (b.requirement_type = 'xp' AND user_stats_record.total_xp >= b.requirement_value) OR
    (b.requirement_type = 'sessions' AND user_stats_record.sessions_completed >= b.requirement_value) OR
    (b.requirement_type = 'minutes' AND user_stats_record.total_study_minutes >= b.requirement_value) OR
    (b.requirement_type = 'streak' AND user_stats_record.study_streak >= b.requirement_value)
  );
  
  -- Return result
  SELECT json_build_object(
    'xp_awarded', p_xp_amount,
    'total_xp', user_stats_record.total_xp,
    'current_level', user_stats_record.current_level,
    'new_badges', COALESCE(new_badges, '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update study streak
CREATE OR REPLACE FUNCTION public.update_study_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER;
  last_date DATE;
BEGIN
  -- Get current streak and last study date
  SELECT study_streak, last_study_date INTO current_streak, last_date
  FROM public.user_stats
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_stats (user_id, study_streak, last_study_date)
    VALUES (p_user_id, 1, CURRENT_DATE);
    RETURN 1;
  END IF;
  
  -- Update streak logic
  IF last_date IS NULL OR last_date < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Reset streak if more than 1 day gap
    current_streak := 1;
  ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Continue streak if studied yesterday
    current_streak := current_streak + 1;
  END IF;
  -- If studied today already, keep current streak
  
  -- Update the record
  UPDATE public.user_stats
  SET 
    study_streak = current_streak,
    last_study_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();