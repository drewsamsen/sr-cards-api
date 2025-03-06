-- Make the due column nullable
ALTER TABLE public.cards
  ALTER COLUMN due DROP NOT NULL;

-- Update comment to reflect that due can be null
COMMENT ON COLUMN public.cards.due IS 'Date when the card is next due for review (null for new cards)';
