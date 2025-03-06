-- Add FSRS fields to cards table
ALTER TABLE public.cards
  -- Remove status and review_at columns and add state column
  DROP COLUMN status,
  DROP COLUMN review_at,
  ADD COLUMN state SMALLINT NOT NULL DEFAULT 0,
  ADD CONSTRAINT cards_state_check CHECK (state IN (0, 1, 2, 3)),
  
  -- Add new FSRS fields
  ADD COLUMN due TIMESTAMPTZ,
  ADD COLUMN stability FLOAT DEFAULT 0,
  ADD COLUMN difficulty FLOAT DEFAULT 0,
  ADD COLUMN elapsed_days FLOAT DEFAULT 0,
  ADD COLUMN scheduled_days FLOAT DEFAULT 0,
  ADD COLUMN reps INTEGER DEFAULT 0,
  ADD COLUMN lapses INTEGER DEFAULT 0,
  ADD COLUMN last_review TIMESTAMPTZ;

-- Set default due date for all cards to now
UPDATE public.cards
SET due = NOW();

-- Make due non-nullable after setting values
ALTER TABLE public.cards
  ALTER COLUMN due SET NOT NULL;

-- Add comments for the new columns
COMMENT ON COLUMN public.cards.state IS 'The current state of the card: 0=New, 1=Learning, 2=Review, 3=Relearning';
COMMENT ON COLUMN public.cards.due IS 'Date when the card is next due for review';
COMMENT ON COLUMN public.cards.stability IS 'A measure of how well the information is retained';
COMMENT ON COLUMN public.cards.difficulty IS 'Reflects the inherent difficulty of the card content';
COMMENT ON COLUMN public.cards.elapsed_days IS 'Days since the card was last reviewed';
COMMENT ON COLUMN public.cards.scheduled_days IS 'The interval at which the card is next scheduled';
COMMENT ON COLUMN public.cards.reps IS 'Total number of times the card has been reviewed';
COMMENT ON COLUMN public.cards.lapses IS 'Times the card was forgotten or remembered incorrectly';
COMMENT ON COLUMN public.cards.last_review IS 'The most recent review date, if applicable';

-- Create index on due date for efficient retrieval of due cards
CREATE INDEX IF NOT EXISTS cards_due_idx ON public.cards(due);

-- Create index on user_id + due for efficient retrieval of a user's due cards
CREATE INDEX IF NOT EXISTS cards_user_id_due_idx ON public.cards(user_id, due);
