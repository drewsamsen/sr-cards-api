-- Add daily_scaler column to decks table
ALTER TABLE public.decks
ADD COLUMN IF NOT EXISTS daily_scaler DECIMAL NOT NULL DEFAULT 1.0 CHECK (daily_scaler > 0);

-- Add comment explaining the purpose of the column
COMMENT ON COLUMN public.decks.daily_scaler IS 'Multiplier for daily review and new card limits. Values < 1 reduce limits for difficult decks, values > 1 increase limits for easy decks.';
