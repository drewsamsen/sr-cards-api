import { supabaseAdmin } from '../config/supabase';
import { Deck, DeckDB, CreateDeckDTO, UpdateDeckDTO } from '../models/deck.model';
import { Card } from '../models/card.model';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';

// Define a type for the review metrics
interface ReviewMetrics {
  totalCards: number;
  cardsRemaining: number;
  progress: number;
  streakDays: number;
  nextDueDate: Date | null;
}

// Define a type for the review result
interface ReviewResult {
  deck: Deck | null;
  card: Card | null;
  reviewMetrics?: ReviewMetrics;
}

export const deckService = {
  /**
   * Get all decks for a user
   */
  async getAllDecks(userId: string): Promise<Deck[]> {
    const { data, error } = await supabaseAdmin
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Convert snake_case DB results to camelCase for API
    return (data || []).map(deck => snakeToCamelObject(deck) as Deck);
  },

  /**
   * Get a deck by ID
   */
  async getDeckById(deckId: string, userId: string): Promise<Deck | null> {
    const { data, error } = await supabaseAdmin
      .from('decks')
      .select('*')
      .eq('id', deckId)
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
    return data ? snakeToCamelObject(data) as Deck : null;
  },

  /**
   * Get a deck by slug
   */
  async getDeckBySlug(slug: string, userId: string): Promise<Deck | null> {
    const { data, error } = await supabaseAdmin
      .from('decks')
      .select('*')
      .eq('slug', slug)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    // Convert snake_case DB result to camelCase for API
    return data ? snakeToCamelObject(data) as Deck : null;
  },

  /**
   * Create a new deck
   */
  async createDeck(deckData: CreateDeckDTO, userId: string): Promise<Deck> {
    // Create the DB object with snake_case keys
    const dbData = {
      user_id: userId,
      name: deckData.name,
      description: deckData.description || null,
    };

    const { data, error } = await supabaseAdmin
      .from('decks')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Convert snake_case DB result to camelCase for API
    return snakeToCamelObject(data) as Deck;
  },

  /**
   * Update a deck
   */
  async updateDeck(deckId: string, deckData: UpdateDeckDTO, userId: string): Promise<Deck | null> {
    // First check if the deck exists and belongs to the user
    const deck = await this.getDeckById(deckId, userId);
    if (!deck) {
      return null;
    }

    // Convert camelCase DTO to snake_case for DB
    const updateData: Partial<DeckDB> = {};
    if (deckData.name !== undefined) updateData.name = deckData.name;
    if (deckData.description !== undefined) updateData.description = deckData.description;

    const { data, error } = await supabaseAdmin
      .from('decks')
      .update(updateData)
      .eq('id', deckId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Convert snake_case DB result to camelCase for API
    return snakeToCamelObject(data) as Deck;
  },

  /**
   * Delete a deck
   */
  async deleteDeck(deckId: string, userId: string): Promise<boolean> {
    // First check if the deck exists and belongs to the user
    const deck = await this.getDeckById(deckId, userId);
    if (!deck) {
      return false;
    }

    const { error } = await supabaseAdmin
      .from('decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  },

  /**
   * Get a random card from a deck for review
   */
  async getRandomCardForReview(slug: string, userId: string): Promise<ReviewResult> {
    // First, get the deck by slug
    const deck = await this.getDeckBySlug(slug, userId);
    
    if (!deck) {
      return { deck: null, card: null };
    }
    
    // Get all cards for the deck
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select(`
        *,
        decks:deck_id (
          name
        )
      `)
      .eq('deck_id', deck.id)
      .eq('user_id', userId);
      
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return { deck, card: null };
    }
    
    // Select a random card
    const randomIndex = Math.floor(Math.random() * data.length);
    const randomCard = data[randomIndex];
    
    // Add deck name and convert to camelCase
    const cardWithDeckName = {
      ...randomCard,
      deck_name: randomCard.decks?.name
    };
    
    // Remove the nested decks object before converting
    delete cardWithDeckName.decks;
    
    // Calculate additional metrics for the card
    const reviewMetrics: ReviewMetrics = {
      totalCards: data.length,
      cardsRemaining: data.length - 1, // Just a placeholder, in a real app you'd count cards not yet reviewed
      progress: Math.round((1 / data.length) * 100), // Simple progress calculation
      streakDays: 1, // Placeholder, would be calculated from user's review history
      nextDueDate: randomCard.due ? new Date(randomCard.due) : null
    };
    
    return { 
      deck, 
      card: snakeToCamelObject(cardWithDeckName) as Card,
      reviewMetrics
    };
  }
}; 