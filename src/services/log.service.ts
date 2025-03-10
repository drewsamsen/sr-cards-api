import { supabaseAdmin } from '../config/supabase';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';

// Define the log interfaces
export interface ReviewLog {
  id?: string;
  cardId: string;
  userId: string;
  rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: string | null;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  review: string;
}

// Interface for review count parameters
export interface ReviewCountParams {
  userId: string;
  deckId?: string;
  timeWindow?: number; // in hours, defaults to 24
  cardType?: 'new' | 'review' | 'all'; // defaults to 'all'
}

/**
 * Interface for deck review counts
 */
export interface DeckReviewCounts {
  deckId: string;
  newCardsCount: number;
  reviewCardsCount: number;
}

export const logService = {
  /**
   * Create a new review log
   */
  async createReviewLog(logData: ReviewLog): Promise<void> {
    // Convert camelCase to snake_case for database
    const dbData = camelToSnakeObject(logData);

    const { error } = await supabaseAdmin
      .from('logs')
      .insert(dbData);

    if (error) {
      console.error('[ERROR] Error creating review log:', {
        error,
        message: error.message || '',
        details: error.details || '',
        hint: error.hint || '',
        code: error.code || ''
      });
      // Don't throw the error to prevent disrupting the review flow
      // Just log it for debugging
    }
  },

  /**
   * Get logs for a specific card
   */
  async getLogsByCardId(cardId: string, userId: string): Promise<ReviewLog[]> {
    const { data, error } = await supabaseAdmin
      .from('logs')
      .select('*')
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .order('review', { ascending: false });

    if (error) {
      throw error;
    }

    // Convert snake_case to camelCase
    return (data || []).map(log => snakeToCamelObject(log) as ReviewLog);
  },

  /**
   * Get the deck ID for a card
   */
  async getDeckIdForCard(cardId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('deck_id')
      .eq('id', cardId)
      .single();

    if (error) {
      console.error('Error getting deck ID for card:', error);
      return null;
    }

    return data?.deck_id || null;
  },

  /**
   * Count reviews by type within a time window
   * @param params Parameters for counting reviews
   * @returns Number of reviews matching the criteria
   */
  async getReviewCount(params: ReviewCountParams): Promise<number> {
    const { 
      userId, 
      deckId, 
      timeWindow = 24, 
      cardType = 'all' 
    } = params;

    // Use the new getReviewCounts method to get both counts
    const counts = await this.getReviewCounts({
      userId,
      deckId,
      timeWindow
    });

    // Return the appropriate count based on the cardType
    if (cardType === 'new') {
      return counts.newCardsCount;
    } else if (cardType === 'review') {
      return counts.reviewCardsCount;
    } else {
      // For 'all', return the sum of both counts
      return counts.newCardsCount + counts.reviewCardsCount;
    }
  },

  /**
   * Get both new cards count and review cards count in a single call
   * @param params Parameters for counting reviews
   * @returns Object containing both new cards count and review cards count
   */
  async getReviewCounts(params: Omit<ReviewCountParams, 'cardType'>): Promise<{
    newCardsCount: number;
    reviewCardsCount: number;
  }> {
    const { 
      userId, 
      deckId, 
      timeWindow = 24
    } = params;

    // Calculate the timestamp for the start of the time window
    const timeAgo = new Date();
    timeAgo.setHours(timeAgo.getHours() - timeWindow);
    
    // Use the database function with JOIN approach to get both counts in one call
    const { data, error } = await supabaseAdmin.rpc('count_reviews', {
      p_user_id: userId,
      p_time_ago: timeAgo.toISOString(),
      p_deck_id: deckId || null
    });
    
    if (error) {
      console.error('[ERROR] Error counting reviews:', {
        error,
        message: error.message || '',
        details: error.details || '',
        hint: error.hint || '',
        code: error.code || ''
      });
      return { newCardsCount: 0, reviewCardsCount: 0 };
    }
    
    // The data will be an array with a single row containing both counts
    // Convert BIGINT values to JavaScript numbers
    const counts = data?.[0] || { new_cards_count: 0, review_cards_count: 0 };
    const newCardsCount = Number(counts.new_cards_count || 0);
    const reviewCardsCount = Number(counts.review_cards_count || 0);
    
    return {
      newCardsCount,
      reviewCardsCount
    };
  },

  /**
   * Get review counts for multiple decks in a single query
   * @param userId The user ID
   * @param deckIds Array of deck IDs to get counts for
   * @param timeWindow Time window in hours (default: 24)
   * @returns Map of deck ID to review counts
   */
  async getReviewCountsBatch(
    userId: string,
    deckIds: string[],
    timeWindow: number = 24
  ): Promise<Map<string, DeckReviewCounts>> {
    if (!deckIds.length) {
      return new Map();
    }

    const result = new Map<string, DeckReviewCounts>();
    
    // Initialize the result map with zero counts for all deck IDs
    deckIds.forEach(deckId => {
      result.set(deckId, {
        deckId,
        newCardsCount: 0,
        reviewCardsCount: 0
      });
    });

    try {
      // Calculate the timestamp for the start of the time window
      const timeAgo = new Date();
      timeAgo.setHours(timeAgo.getHours() - timeWindow);
      
      // Call the database function to get counts for all decks at once
      const { data, error } = await supabaseAdmin.rpc('count_reviews_batch', {
        p_user_id: userId,
        p_time_ago: timeAgo.toISOString(),
        p_deck_ids: deckIds
      });
      
      if (error) {
        console.error('[ERROR] Error in getReviewCountsBatch:', {
          error,
          message: error.message || '',
          details: error.details || '',
          hint: error.hint || '',
          code: error.code || ''
        });
        return result;
      }
      
      // Process the results
      if (data && data.length > 0) {
        data.forEach((item: any) => {
          const deckId = item.deck_id;
          if (result.has(deckId)) {
            result.set(deckId, {
              deckId,
              newCardsCount: Number(item.new_cards_count || 0),
              reviewCardsCount: Number(item.review_cards_count || 0)
            });
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('[ERROR] Exception in getReviewCountsBatch:', error);
      return result;
    }
  }
}; 