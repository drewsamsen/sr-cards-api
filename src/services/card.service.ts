import { supabaseAdmin } from '../config/supabase';
import { Card, CardDB, CreateCardDTO, UpdateCardDTO } from '../models/card.model';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';

export const cardService = {
  /**
   * Get all cards for a deck
   */
  async getCardsByDeckId(deckId: string, userId: string): Promise<Card[]> {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Convert snake_case DB results to camelCase for API
    return (data || []).map(card => snakeToCamelObject(card) as Card);
  },

  /**
   * Get a card by ID
   */
  async getCardById(cardId: string, userId: string): Promise<Card | null> {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('*')
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

    // Convert snake_case DB result to camelCase for API
    return data ? snakeToCamelObject(data) as Card : null;
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
      status: cardData.status || 'new',
      reviewAt: cardData.reviewAt || null
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
      .select('*')
      .eq('user_id', userId)
      .or(`status.eq.new,and(status.eq.review,review_at.lte.${now})`)
      .limit(limit);

    if (error) {
      throw error;
    }

    // Convert snake_case DB results to camelCase for API
    return (data || []).map(card => snakeToCamelObject(card) as Card);
  }
}; 