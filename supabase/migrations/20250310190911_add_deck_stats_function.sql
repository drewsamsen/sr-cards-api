-- Function to get statistics for multiple decks in a single query
CREATE OR REPLACE FUNCTION public.get_deck_stats_batch(
  p_user_id UUID,
  p_deck_ids UUID[],
  p_current_time TIMESTAMPTZ
)
RETURNS TABLE (
  deck_id UUID,
  total_cards BIGINT,
  review_ready_cards BIGINT,
  new_cards BIGINT,
  due_review_cards BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS deck_id,
    COUNT(c.id) AS total_cards,
    COUNT(CASE 
      WHEN c.state = 0 OR (c.state > 0 AND c.due <= p_current_time) 
      THEN 1 
      ELSE NULL 
    END) AS review_ready_cards,
    COUNT(CASE 
      WHEN c.state = 0 
      THEN 1 
      ELSE NULL 
    END) AS new_cards,
    COUNT(CASE 
      WHEN c.state > 0 AND c.due <= p_current_time 
      THEN 1 
      ELSE NULL 
    END) AS due_review_cards
  FROM 
    public.decks d
  LEFT JOIN 
    public.cards c ON d.id = c.deck_id AND c.user_id = p_user_id
  WHERE 
    d.user_id = p_user_id
    AND d.id = ANY(p_deck_ids)
  GROUP BY 
    d.id;
END;
$$ LANGUAGE plpgsql;

-- Add index to improve performance of the function
CREATE INDEX IF NOT EXISTS idx_cards_deck_id_user_id ON public.cards (deck_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cards_state_due ON public.cards (state, due); 