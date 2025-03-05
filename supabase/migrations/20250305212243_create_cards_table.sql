-- Create cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON public.cards(deck_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own cards
CREATE POLICY cards_select_policy ON public.cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert cards where they are the owner
CREATE POLICY cards_insert_policy ON public.cards
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE id = deck_id AND user_id = auth.uid()
    )
  );

-- Users can only update their own cards
CREATE POLICY cards_update_policy ON public.cards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE id = deck_id AND user_id = auth.uid()
    )
  );

-- Users can only delete their own cards
CREATE POLICY cards_delete_policy ON public.cards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment on table and columns
COMMENT ON TABLE public.cards IS 'Flashcards belonging to decks';
COMMENT ON COLUMN public.cards.id IS 'Unique identifier for the card';
COMMENT ON COLUMN public.cards.user_id IS 'User who owns the card';
COMMENT ON COLUMN public.cards.deck_id IS 'Deck the card belongs to';
COMMENT ON COLUMN public.cards.front IS 'Front content of the flashcard';
COMMENT ON COLUMN public.cards.back IS 'Back content of the flashcard';
COMMENT ON COLUMN public.cards.status IS 'Learning status of the card: new, learning, or review';
COMMENT ON COLUMN public.cards.review_at IS 'Timestamp for when the card should be reviewed next';
COMMENT ON COLUMN public.cards.created_at IS 'Time when the card was created';
COMMENT ON COLUMN public.cards.updated_at IS 'Time when the card was last updated';
