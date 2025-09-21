-- Fix search_path security warnings for all functions
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level(level INTEGER)
RETURNS INTEGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- XP required grows exponentially: Level 1 = 100, Level 2 = 250, Level 3 = 450, etc.
  RETURN (level * 100) + ((level - 1) * 50);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_activity_type TEXT,
  p_xp_amount INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_study_streak(p_user_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;