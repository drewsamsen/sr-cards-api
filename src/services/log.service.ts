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
  }
}; 