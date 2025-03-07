import { supabaseAdmin } from '../config/supabase';
import { Card, CardDB, CreateCardDTO, UpdateCardDTO, CardReviewDTO } from '../models/card.model';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';
import { fsrsService } from './fsrs.service';
import { logService } from './log.service';
import { userSettingsService } from './user-settings.service';
import { DailyProgressResponse } from '../models/daily-progress.model';

export const cardService = {
  /**
   * Get all cards for a user across all decks
   */
  async getAllCardsByUserId(userId: string): Promise<Card[]> {
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
      .order('created_at', { ascending: false });

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
   * Get all cards for a deck
   */
  async getCardsByDeckId(deckId: string, userId: string): Promise<Card[]> {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select(`
        *,
        decks:deck_id (
          name,
          slug
        )
      `)
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

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
   * Create a new card
   */
  async createCard(cardData: CreateCardDTO, deckId: string, userId: string): Promise<Card> {
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

    // Check if the user has reached their daily limits
    // Get user settings
    const userSettings = await userSettingsService.getUserSettings(userId);
    if (!userSettings) {
      console.warn(`No user settings found for user ${userId}, using defaults`);
    }
    
    const newCardsLimit = userSettings?.settings?.learning?.newCardsPerDay || 5;
    const reviewCardsLimit = userSettings?.settings?.learning?.maxReviewsPerDay || 10;
    
    // Determine if this is a new card or a review card
    const isNewCard = card.state === 0;
    
    // Get counts of cards reviewed in the last 24 hours
    const newCardsCount = await logService.getReviewCount({
      userId,
      deckId: card.deckId,
      timeWindow: 24,
      cardType: 'new'
    });
    
    const reviewCardsCount = await logService.getReviewCount({
      userId,
      deckId: card.deckId,
      timeWindow: 24,
      cardType: 'review'
    });
    
    // Create daily progress object
    const dailyProgress: DailyProgressResponse = {
      newCardsSeen: newCardsCount,
      newCardsLimit,
      reviewCardsSeen: reviewCardsCount,
      reviewCardsLimit,
      totalRemaining: Math.max(0, newCardsLimit - newCardsCount) + Math.max(0, reviewCardsLimit - reviewCardsCount)
    };
    
    // Check if the user has reached their daily limit for this type of card
    if ((isNewCard && newCardsCount >= newCardsLimit) || 
        (!isNewCard && reviewCardsCount >= reviewCardsLimit)) {
      return {
        dailyLimitReached: true,
        message: `You've reached your daily limit for ${isNewCard ? 'new' : 'review'} cards. Come back later!`,
        dailyProgress
      };
    }

    // Process the review with FSRS - this will throw an error if FSRS calculation fails
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
      console.error('Failed to create review log:', logError);
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
    return snakeToCamelObject(cardWithDeckInfo) as Card;
  }
}; 