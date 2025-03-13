import { supabaseAdmin } from '../config/supabase';
import { Card, CardDB, CreateCardDTO, UpdateCardDTO, CardReviewDTO } from '../models/card.model';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';
import { fsrsService } from './fsrs.service';
import { logService } from './log.service';
import { userSettingsService } from './user-settings.service';
import { DailyProgressResponse } from '../models/daily-progress.model';
import { deckService } from './deck.service';

export const cardService = {
  /**
   * Internal helper method to fetch cards with common logic
   * @param filters Object containing filters to apply
   * @param options Pagination options
   * @returns Array of cards and total count
   */
  async _fetchCards(
    filters: { userId: string; deckId?: string },
    options: { limit: number; offset: number }
  ): Promise<{ cards: Card[]; total: number }> {
    // Get the total count first
    let countQuery = supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', filters.userId);
    
    // Add deck filter if provided
    if (filters.deckId) {
      countQuery = countQuery.eq('deck_id', filters.deckId);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      throw countError;
    }
    
    // Then get the paginated data
    let dataQuery = supabaseAdmin
      .from('cards')
      .select(`
        *,
        decks:deck_id (
          name,
          slug
        )
      `)
      .eq('user_id', filters.userId);
    
    // Add deck filter if provided
    if (filters.deckId) {
      dataQuery = dataQuery.eq('deck_id', filters.deckId);
    }
    
    // Add pagination and ordering
    const { data, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);
    
    if (error) {
      throw error;
    }
    
    // Convert snake_case DB results to camelCase for API and add deck name
    const cards = (data || []).map(card => {
      const cardWithDeckInfo = {
        ...card,
        deck_name: card.decks?.name,
        deck_slug: card.decks?.slug
      };
      // Remove the nested decks object before converting
      delete cardWithDeckInfo.decks;
      return snakeToCamelObject(cardWithDeckInfo) as Card;
    });
    
    return {
      cards,
      total: count || 0
    };
  },

  /**
   * Get cards with optional filtering and pagination
   * @param userId The user ID
   * @param options Optional parameters (limit, offset, deckId)
   * @returns Array of cards and total count
   */
  async getCards(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      deckId?: string;
    } = {}
  ): Promise<{ cards: Card[], total: number }> {
    return this._fetchCards(
      { 
        userId, 
        deckId: options.deckId 
      },
      { 
        limit: options.limit || 20, 
        offset: options.offset || 0 
      }
    );
  },

  /**
   * Get all cards for a user across all decks with pagination
   * @param userId The user ID
   * @param limit Maximum number of cards to return (default: 20)
   * @param offset Number of cards to skip (default: 0)
   * @returns Array of cards and total count
   */
  async getAllCardsByUserId(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ cards: Card[], total: number }> {
    return this._fetchCards(
      { userId },
      { limit, offset }
    );
  },

  /**
   * Get all cards for a deck with pagination
   * @param deckId The deck ID
   * @param userId The user ID
   * @param limit Maximum number of cards to return (default: 20)
   * @param offset Number of cards to skip (default: 0)
   * @returns Array of cards and total count
   */
  async getCardsByDeckId(
    deckId: string, 
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ cards: Card[], total: number }> {
    return this._fetchCards(
      { userId, deckId },
      { limit, offset }
    );
  },

  /**
   * Get a card by ID
   */
  async getCardById(cardId: string, userId: string): Promise<Card | null> {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select(`
        *,
        decks:deck_id (
          name,
          slug
        )
      `)
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 is the error code for "no rows returned"
        return null;
      }
      throw error;
    }

    if (!data) return null;

    // Add deck name and slug to the card object
    const cardWithDeckInfo = {
      ...data,
      deck_name: data.decks?.name,
      deck_slug: data.decks?.slug
    };
    // Remove the nested decks object before converting
    delete cardWithDeckInfo.decks;
    
    // Convert snake_case DB result to camelCase for API
    return snakeToCamelObject(cardWithDeckInfo) as Card;
  },

  /**
   * Check if a similar card front already exists in the deck
   * @param front The card front to check
   * @param deckId The deck ID
   * @param userId The user ID
   * @returns The similar card if found, null otherwise
   */
  async findSimilarCardFront(front: string, deckId: string, userId: string): Promise<Card | null> {
    try {
      // Normalize the front text for comparison
      const normalizedFront = front.trim().toLowerCase();
      
      // Get all cards in the deck
      const { data, error } = await supabaseAdmin
        .from('cards')
        .select('*')
        .eq('deck_id', deckId)
        .eq('user_id', userId);
        
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Check for similar fronts
      const similarCard = data.find(card => {
        // Normalize the card front
        const cardFront = card.front.trim().toLowerCase();
        
        // Exact match
        if (cardFront === normalizedFront) {
          return true;
        }
        
        // Very similar (e.g., only differs by punctuation or whitespace)
        const simplifiedCardFront = cardFront.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
        const simplifiedFront = normalizedFront.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
        
        if (simplifiedCardFront === simplifiedFront) {
          return true;
        }
        
        return false;
      });
      
      if (similarCard) {
        return snakeToCamelObject(similarCard) as Card;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding similar card front:', error);
      return null; // Return null on error to allow card creation to proceed
    }
  },

  /**
   * Create a new card
   */
  async createCard(cardData: CreateCardDTO, deckId: string, userId: string): Promise<Card> {
    // Check for similar card fronts
    const similarCard = await this.findSimilarCardFront(cardData.front, deckId, userId);
    if (similarCard) {
      throw new Error(`A similar card already exists in this deck: "${similarCard.front}"`);
    }
    
    // Create the DB object with snake_case keys
    const dbData = camelToSnakeObject({
      userId,
      deckId,
      front: cardData.front,
      back: cardData.back,
      // FSRS fields will use default values from the database
      state: 0, // New card
      due: null // New cards have null due date
    }) as Omit<CardDB, 'id' | 'created_at' | 'updated_at'>;

    const { data, error } = await supabaseAdmin
      .from('cards')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Convert snake_case DB result to camelCase for API
    return snakeToCamelObject(data) as Card;
  },

  /**
   * Update a card
   */
  async updateCard(cardId: string, cardData: UpdateCardDTO, userId: string): Promise<Card | null> {
    // First check if the card exists and belongs to the user
    const card = await this.getCardById(cardId, userId);
    if (!card) {
      return null;
    }

    // Convert camelCase DTO to snake_case for DB
    const dbData = camelToSnakeObject(cardData);

    const { data, error } = await supabaseAdmin
      .from('cards')
      .update(dbData)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Convert snake_case DB result to camelCase for API
    return snakeToCamelObject(data) as Card;
  },

  /**
   * Delete a card
   */
  async deleteCard(cardId: string, userId: string): Promise<boolean> {
    // First check if the card exists and belongs to the user
    const card = await this.getCardById(cardId, userId);
    if (!card) {
      return false;
    }

    const { error } = await supabaseAdmin
      .from('cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  },

  /**
   * Get cards due for review
   */
  async getCardsForReview(userId: string, limit: number = 20): Promise<Card[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select(`
        *,
        decks:deck_id (
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .or(`state.eq.0,and(state.in.(1,2,3),due.lte.${now})`)
      .limit(limit);

    if (error) {
      throw error;
    }

    // Convert snake_case DB results to camelCase for API and add deck name
    return (data || []).map(card => {
      const cardWithDeckInfo = {
        ...card,
        deck_name: card.decks?.name,
        deck_slug: card.decks?.slug
      };
      // Remove the nested decks object before converting
      delete cardWithDeckInfo.decks;
      return snakeToCamelObject(cardWithDeckInfo) as Card;
    });
  },

  /**
   * Submit a review for a card
   */
  async submitCardReview(cardId: string, reviewData: CardReviewDTO, userId: string): Promise<Card | null | { dailyLimitReached: boolean, message: string, dailyProgress: DailyProgressResponse }> {
    // First check if the card exists and belongs to the user
    const card = await this.getCardById(cardId, userId);
    
    if (!card) {
      return null;
    }

    // Get user settings
    const userSettings = await userSettingsService.getUserSettings(userId);
    if (!userSettings) {
      console.warn(`[WARN] No user settings found for user ${userId}, using defaults`);
    }
    
    // Determine if this is a new card or a review card
    const isNewCard = card.state === 0;
    
    // Get available card counts using the centralized helper function
    const { 
      newCardsAvailable, 
      reviewCardsAvailable, 
      dailyLimits,
      reviewCounts
    } = await deckService.getAvailableCardCounts(card.deckId, userId);
    
    // Create daily progress object
    const dailyProgress: DailyProgressResponse = {
      newCardsSeen: reviewCounts.newCardsCount,
      newCardsLimit: dailyLimits.newCardsLimit,
      reviewCardsSeen: reviewCounts.reviewCardsCount,
      reviewCardsLimit: dailyLimits.reviewCardsLimit,
      totalRemaining: newCardsAvailable + reviewCardsAvailable
    };
    
    // Check if the user has reached their daily limit for this type of card
    if ((isNewCard && newCardsAvailable <= 0) || 
        (!isNewCard && reviewCardsAvailable <= 0)) {
      console.debug(`[DEBUG] Daily limit reached for user ${userId} - ${isNewCard ? 'new' : 'review'} cards: ${isNewCard ? newCardsAvailable : reviewCardsAvailable} available`);
      return {
        dailyLimitReached: true,
        message: `You've reached your daily limit for ${isNewCard ? 'new' : 'review'} cards. Come back later!`,
        dailyProgress
      };
    }

    try {
      // Process the review with FSRS
      const processedReview = await fsrsService.processReview(
        card,
        reviewData.rating,
        userId, // Pass userId to use user-specific FSRS parameters
        reviewData.reviewedAt ? new Date(reviewData.reviewedAt) : undefined
      );

      // Ensure all date fields are properly formatted as ISO strings
      const updateData = camelToSnakeObject({
        due: processedReview.due instanceof Date ? processedReview.due.toISOString() : null,
        stability: processedReview.stability,
        difficulty: processedReview.difficulty,
        elapsedDays: processedReview.elapsed_days,
        scheduledDays: processedReview.scheduled_days,
        reps: processedReview.reps,
        lapses: processedReview.lapses,
        state: processedReview.state,
        lastReview: processedReview.last_review instanceof Date ? processedReview.last_review.toISOString() : null
      });

      // Update the card in the database
      const { data, error } = await supabaseAdmin
        .from('cards')
        .update(updateData)
        .eq('id', cardId)
        .eq('user_id', userId)
        .select(`
          *,
          decks:deck_id (
            name,
            slug
          )
        `)
        .single();

      if (error) {
        console.error('[ERROR] Error updating card:', {
          error,
          message: error.message || '',
          details: error.details || '',
          hint: error.hint || '',
          code: error.code || ''
        });
        throw error;
      }

      // Create a log entry for this review
      try {
        await logService.createReviewLog({
          cardId,
          userId,
          rating: reviewData.rating,
          state: processedReview.logData.state,
          due: processedReview.logData.due instanceof Date ? processedReview.logData.due.toISOString() : null,
          stability: processedReview.logData.stability,
          difficulty: processedReview.logData.difficulty,
          elapsedDays: processedReview.logData.elapsed_days,
          lastElapsedDays: processedReview.logData.last_elapsed_days,
          scheduledDays: processedReview.logData.scheduled_days,
          review: processedReview.logData.review instanceof Date ? processedReview.logData.review.toISOString() : new Date().toISOString()
        });
      } catch (logError) {
        // Log the error but don't fail the review process
        console.error('[ERROR] Failed to create review log:', {
          error: logError,
          message: logError instanceof Error ? logError.message : 'Unknown error',
          stack: logError instanceof Error ? logError.stack : ''
        });
      }

      // Add deck name and slug and convert to camelCase
      const cardWithDeckInfo = {
        ...data,
        deck_name: data.decks?.name,
        deck_slug: data.decks?.slug
      };
      
      // Remove the nested decks object before converting
      delete cardWithDeckInfo.decks;
      
      // Convert snake_case DB result to camelCase for API
      const result = snakeToCamelObject(cardWithDeckInfo) as Card;
      return result;
    } catch (error) {
      console.error('[ERROR] Error in submitCardReview:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : ''
      });
      throw error;
    }
  },

  /**
   * Search for cards by query text
   * @param userId The user ID
   * @param query The search query
   * @param options Optional parameters (limit, offset, deckId)
   * @returns Array of matching cards and total count
   */
  async searchCards(
    userId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
      deckId?: string;
    } = {}
  ): Promise<{ cards: Card[], total: number }> {
    // Set default values
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // Build the base query
    let dbQuery = supabaseAdmin
      .from('cards')
      .select(`
        *,
        decks:deck_id (
          name,
          slug
        )
      `, { count: 'exact' })
      .eq('user_id', userId);
    
    // Add search condition for front and back text
    dbQuery = dbQuery.or(`front.ilike.%${query}%,back.ilike.%${query}%`);
    
    // Add deck filter if provided
    if (options.deckId) {
      dbQuery = dbQuery.eq('deck_id', options.deckId);
    }
    
    // Execute the query with pagination
    const { data, count, error } = await dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    // Convert snake_case DB results to camelCase for API and add deck name
    const cards = (data || []).map(card => {
      const cardWithDeckInfo = {
        ...card,
        deck_name: card.decks?.name,
        deck_slug: card.decks?.slug
      };
      // Remove the nested decks object before converting
      delete cardWithDeckInfo.decks;
      return snakeToCamelObject(cardWithDeckInfo) as Card;
    });
    
    return {
      cards,
      total: count || 0
    };
  },
}; 