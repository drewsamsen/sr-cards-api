import { supabaseAdmin } from '../config/supabase';

/**
 * Interface for deck statistics
 */
export interface DeckStats {
  deckId: string;
  totalCards: number;
  reviewReadyCards: number;
  newCards: number;
  dueReviewCards: number;
}

/**
 * Service for card review-related operations that are shared between services
 */
export const cardReviewService = {
  /**
   * Count cards ready for review in a specific deck
   */
  async countReviewReadyCards(deckId: string, userId: string): Promise<number> {
    const now = new Date().toISOString();
    
    const { count, error } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('deck_id', deckId)
      .or(`state.eq.0,and(state.in.(1,2,3),due.lte.${now})`);

    if (error) {
      throw error;
    }

    return count || 0;
  },

  /**
   * Count total cards in a specific deck
   */
  async countTotalCards(deckId: string, userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('deck_id', deckId);

    if (error) {
      throw error;
    }

    return count || 0;
  },

  /**
   * Get statistics for multiple decks in a single query
   * This optimizes the database calls by fetching all stats at once
   */
  async getDeckStatsBatch(deckIds: string[], userId: string): Promise<Map<string, DeckStats>> {
    if (!deckIds.length) {
      return new Map();
    }

    const now = new Date().toISOString();
    const result = new Map<string, DeckStats>();
    
    // Initialize the result map with empty stats for all deck IDs
    deckIds.forEach(deckId => {
      result.set(deckId, {
        deckId,
        totalCards: 0,
        reviewReadyCards: 0,
        newCards: 0,
        dueReviewCards: 0
      });
    });

    try {
      // Execute a single query to get total cards per deck
      const { data: totalData, error: totalError } = await supabaseAdmin.rpc(
        'get_deck_stats_batch',
        {
          p_user_id: userId,
          p_deck_ids: deckIds,
          p_current_time: now
        }
      );

      if (totalError) {
        console.error('[ERROR] Error getting batch deck stats:', totalError);
        return result;
      }

      // Process the results
      if (totalData && totalData.length > 0) {
        totalData.forEach((item: any) => {
          const deckId = item.deck_id;
          if (result.has(deckId)) {
            result.set(deckId, {
              deckId,
              totalCards: Number(item.total_cards || 0),
              reviewReadyCards: Number(item.review_ready_cards || 0),
              newCards: Number(item.new_cards || 0),
              dueReviewCards: Number(item.due_review_cards || 0)
            });
          }
        });
      }

      return result;
    } catch (error) {
      console.error('[ERROR] Exception in getDeckStatsBatch:', error);
      return result;
    }
  }
}; 