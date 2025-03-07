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
      console.error('Error creating review log:', error);
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

    // Calculate the timestamp for the start of the time window
    const timeAgo = new Date();
    timeAgo.setHours(timeAgo.getHours() - timeWindow);
    
    // Start building the query
    let query = supabaseAdmin
      .from('logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', timeAgo.toISOString());
    
    // If a deck ID is provided, we need to join with the cards table
    // to filter by deck_id
    if (deckId) {
      // We need to get card IDs for the specified deck
      const { data: cardIds, error: cardError } = await supabaseAdmin
        .from('cards')
        .select('id')
        .eq('deck_id', deckId)
        .eq('user_id', userId);
      
      if (cardError) {
        console.error('Error getting card IDs for deck:', cardError);
        return 0;
      }
      
      if (!cardIds || cardIds.length === 0) {
        return 0; // No cards in this deck
      }
      
      // Add the card IDs to the query
      query = query.in('card_id', cardIds.map(card => card.id));
    }
    
    // Add filter for card type if specified
    if (cardType === 'new') {
      query = query.eq('state', 0);
    } else if (cardType === 'review') {
      query = query.gt('state', 0);
    }
    
    // Execute the query
    const { count, error } = await query;
    
    if (error) {
      console.error('Error counting reviews:', error);
      return 0;
    }
    
    return count || 0;
  }
}; 