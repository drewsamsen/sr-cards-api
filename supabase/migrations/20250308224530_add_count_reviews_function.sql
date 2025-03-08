-- Add count_reviews function for efficient review counting
CREATE OR REPLACE FUNCTION count_reviews(
  p_user_id TEXT,
  p_time_ago TIMESTAMP,
  p_deck_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  new_cards_count BIGINT,
  review_cards_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE l.state = 0) AS new_cards_count,
    COUNT(*) FILTER (WHERE l.state > 0) AS review_cards_count
  FROM logs l
  JOIN cards c ON l.card_id = c.id
  WHERE l.user_id = p_user_id::UUID
  AND l.created_at >= p_time_ago
  AND (p_deck_id IS NULL OR c.deck_id = p_deck_id::UUID);
END;
$$ LANGUAGE plpgsql;

-- Add index to improve performance of the count_reviews function
CREATE INDEX IF NOT EXISTS idx_logs_card_id ON logs(card_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id_created_at ON logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id); 