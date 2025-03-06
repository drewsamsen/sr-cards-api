import { supabaseAdmin } from '../config/supabase';
import { Card, CardDB, CreateCardDTO, UpdateCardDTO, CardReviewDTO } from '../models/card.model';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';
import { fsrsService } from './fsrs.service';

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
          name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Convert snake_case DB results to camelCase for API and add deck name
    return (data || []).map(card => {
      const cardWithDeckName = {
        ...card,
        deck_name: card.decks?.name
      };
      // Remove the nested decks object before converting
      delete cardWithDeckName.decks;
      return snakeToCamelObject(cardWithDeckName) as Card;
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
          name
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
      const cardWithDeckName = {
        ...card,
        deck_name: card.decks?.name
      };
      // Remove the nested decks object before converting
      delete cardWithDeckName.decks;
      return snakeToCamelObject(cardWithDeckName) as Card;
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
          name
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

    // Add deck name to the card object
    const cardWithDeckName = {
      ...data,
      deck_name: data.decks?.name
    };
    // Remove the nested decks object before converting
    delete cardWithDeckName.decks;
    
    // Convert snake_case DB result to camelCase for API
    return snakeToCamelObject(cardWithDeckName) as Card;
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
          name
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
      const cardWithDeckName = {
        ...card,
        deck_name: card.decks?.name
      };
      // Remove the nested decks object before converting
      delete cardWithDeckName.decks;
      return snakeToCamelObject(cardWithDeckName) as Card;
    });
  },

  /**
   * Submit a review for a card
   */
  async submitCardReview(cardId: string, reviewData: CardReviewDTO, userId: string): Promise<Card | null> {
    // First check if the card exists and belongs to the user
    const card = await this.getCardById(cardId, userId);
    if (!card) {
      return null;
    }

    // Process the review with FSRS - this will throw an error if FSRS calculation fails
    const processedReview = fsrsService.processReview(
      card,
      reviewData.rating,
      reviewData.reviewedAt ? new Date(reviewData.reviewedAt) : undefined
    );

    // Convert to snake_case for database update
    const updateData = camelToSnakeObject({
      due: processedReview.due,
      stability: processedReview.stability,
      difficulty: processedReview.difficulty,
      elapsedDays: processedReview.elapsed_days,
      scheduledDays: processedReview.scheduled_days,
      reps: processedReview.reps,
      lapses: processedReview.lapses,
      state: processedReview.state,
      lastReview: processedReview.last_review
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
          name
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Add deck name and convert to camelCase
    const cardWithDeckName = {
      ...data,
      deck_name: data.decks?.name
    };
    
    // Remove the nested decks object before converting
    delete cardWithDeckName.decks;
    
    // Convert snake_case DB result to camelCase for API
    return snakeToCamelObject(cardWithDeckName) as Card;
  }
}; 