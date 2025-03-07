import { supabaseAdmin } from '../config/supabase';

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
  }
}; 