-- Function to get review counts for multiple decks in a single query
CREATE OR REPLACE FUNCTION public.count_reviews_batch(
  p_user_id UUID,
  p_time_ago TIMESTAMPTZ,
  p_deck_ids UUID[]
)
RETURNS TABLE (
  deck_id UUID,
  new_cards_count BIGINT,
  review_cards_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.deck_id,
    COUNT(CASE WHEN l.state = 0 THEN 1 ELSE NULL END) AS new_cards_count,
    COUNT(CASE WHEN l.state > 0 THEN 1 ELSE NULL END) AS review_cards_count
  FROM 
    public.logs l
  JOIN 
    public.cards c ON l.card_id = c.id
  WHERE 
    l.user_id = p_user_id
    AND l.review >= p_time_ago
    AND c.deck_id = ANY(p_deck_ids)
  GROUP BY 
    c.deck_id;
END;
$$ LANGUAGE plpgsql;

-- Add index to improve performance of the function
CREATE INDEX IF NOT EXISTS idx_logs_user_id_review ON public.logs (user_id, review);
CREATE INDEX IF NOT EXISTS idx_logs_card_id ON public.logs (card_id);
CREATE INDEX IF NOT EXISTS idx_logs_state ON public.logs (state); 