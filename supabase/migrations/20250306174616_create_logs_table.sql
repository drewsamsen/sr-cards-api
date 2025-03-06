-- Create logs table for tracking card review history
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL, -- 1=Again, 2=Hard, 3=Good, 4=Easy
  state SMALLINT NOT NULL, -- 0=New, 1=Learning, 2=Review, 3=Relearning
  due TIMESTAMPTZ,
  stability FLOAT NOT NULL DEFAULT 0,
  difficulty FLOAT NOT NULL DEFAULT 0,
  elapsed_days FLOAT NOT NULL DEFAULT 0,
  last_elapsed_days FLOAT NOT NULL DEFAULT 0,
  scheduled_days FLOAT NOT NULL DEFAULT 0,
  review TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add constraints for data validation
  CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 4),
  CONSTRAINT valid_state CHECK (state BETWEEN 0 AND 3)
);

-- Add indexes for performance
CREATE INDEX logs_card_id_idx ON logs(card_id);
CREATE INDEX logs_user_id_idx ON logs(user_id);
CREATE INDEX logs_review_idx ON logs(review);

-- Add RLS policies
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs
CREATE POLICY logs_select_policy ON logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own logs
CREATE POLICY logs_insert_policy ON logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete logs (immutable history)
