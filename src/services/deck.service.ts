import { supabaseAdmin } from '../config/supabase';
import { Deck, DeckDB, CreateDeckDTO, UpdateDeckDTO } from '../models/deck.model';
import { Card } from '../models/card.model';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';
import { fsrsService, ReviewMetrics } from './fsrs.service';
import { cardReviewService } from './card-review.service';
import { logService } from './log.service';
import { userSettingsService } from './user-settings.service';
import { DailyProgressResponse } from '../models/daily-progress.model';

// Define a type for the review result
interface ReviewResult {
  deck: Deck | null;
  cards: Card[];
  allCaughtUp?: boolean;
  totalCards?: number;
  emptyDeck?: boolean;
  dailyProgress?: DailyProgressResponse;
  dailyLimitReached?: boolean;
  message?: string;
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

    if (!data || data.length === 0) {
      return [];
    }

    // Convert snake_case DB results to camelCase for API
    const decks = data.map(deck => snakeToCamelObject(deck) as Deck);

    // Get user settings to check daily limits
    const userSettings = await userSettingsService.getUserSettings(userId);
    const newCardsLimit = userSettings?.settings?.learning?.newCardsPerDay || 5;
    const reviewCardsLimit = userSettings?.settings?.learning?.maxReviewsPerDay || 10;
    
    // Add review count, total cards count, and remaining reviews to each deck
    for (const deck of decks) {
      try {
        await this._addDeckStats(deck, userId);
      } catch (error) {
        console.error(`Error calculating stats for deck ${deck.id}:`, error);
        deck.reviewCount = 0;
        deck.totalCards = 0;
        deck.remainingReviews = 0;
      }
    }

    return decks;
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

    if (!data) {
      return null;
    }

    // Convert snake_case DB result to camelCase for API
    const deck = snakeToCamelObject(data) as Deck;
    
    try {
      // Add review count, total cards count, and remaining reviews
      await this._addDeckStats(deck, userId);
    } catch (statsError) {
      console.error(`Error calculating stats for deck ${deckId}:`, statsError);
      deck.reviewCount = 0;
      deck.totalCards = 0;
      deck.remainingReviews = 0;
    }
    
    return deck;
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

    if (!data) {
      return null;
    }

    // Convert snake_case DB result to camelCase for API
    const deck = snakeToCamelObject(data) as Deck;
    
    try {
      // Add review count, total cards count, and remaining reviews
      await this._addDeckStats(deck, userId);
    } catch (statsError) {
      console.error(`Error calculating stats for deck ${slug}:`, statsError);
      deck.reviewCount = 0;
      deck.totalCards = 0;
      deck.remainingReviews = 0;
    }
    
    return deck;
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
    const existingDeck = await this.getDeckById(deckId, userId);
    if (!existingDeck) {
      return null;
    }

    // Convert camelCase DTO to snake_case for DB
    const updateData: Partial<DeckDB> = {};
    if (deckData.name !== undefined) updateData.name = deckData.name;
    if (deckData.description !== undefined) updateData.description = deckData.description;
    if (deckData.slug !== undefined) updateData.slug = deckData.slug;

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
   * Get all cards available for review from a deck, respecting daily limits
   */
  async getAllCardsForReview(slug: string, userId: string): Promise<ReviewResult> {
    const deck = await this.getDeckBySlug(slug, userId);
    
    if (!deck) {
      return { deck: null, cards: [] };
    }
    
    // Get user settings to check daily limits
    const userSettings = await userSettingsService.getUserSettings(userId);
    if (!userSettings) {
      // If no settings, use default values
      console.warn(`[WARN] No user settings found for user ${userId}, using defaults`);
    }
    
    const newCardsLimit = userSettings?.settings?.learning?.newCardsPerDay || 5;
    const reviewCardsLimit = userSettings?.settings?.learning?.maxReviewsPerDay || 10;
    
    // Get counts of cards reviewed in the last 24 hours in a single call
    const { newCardsCount, reviewCardsCount } = await logService.getReviewCounts({
      userId,
      deckId: deck.id,
      timeWindow: 24
    });
    
    // Calculate remaining cards
    const newCardsRemaining = Math.max(0, newCardsLimit - newCardsCount);
    const reviewCardsRemaining = Math.max(0, reviewCardsLimit - reviewCardsCount);
    const totalRemaining = newCardsRemaining + reviewCardsRemaining;
    
    // Create daily progress object
    const dailyProgress: DailyProgressResponse = {
      newCardsSeen: newCardsCount,
      newCardsLimit,
      reviewCardsSeen: reviewCardsCount,
      reviewCardsLimit,
      totalRemaining
    };
    
    // Check if daily limits are reached
    if (totalRemaining === 0) {
      return {
        deck,
        cards: [],
        dailyProgress,
        dailyLimitReached: true,
        message: "You've reached your daily review limit for this deck. Great work!"
      };
    }
    
    // Get current date for comparison
    const now = new Date().toISOString();
    
    // First, get all new cards (state=0)
    let newCards = [];
    if (newCardsRemaining > 0) {
      const { data: newCardsData, error: newCardsError } = await supabaseAdmin
        .from('cards')
        .select(`
          *,
          decks:deck_id (
            name,
            slug
          )
        `)
        .eq('deck_id', deck.id)
        .eq('user_id', userId)
        .eq('state', 0)
        .limit(newCardsRemaining);
        
      if (newCardsError) {
        throw newCardsError;
      }
      
      newCards = newCardsData || [];
    }
    
    // Then, get all review cards (state > 0 and due <= now)
    let reviewCards = [];
    if (reviewCardsRemaining > 0) {
      const { data: reviewCardsData, error: reviewCardsError } = await supabaseAdmin
        .from('cards')
        .select(`
          *,
          decks:deck_id (
            name,
            slug
          )
        `)
        .eq('deck_id', deck.id)
        .eq('user_id', userId)
        .gt('state', 0)
        .lte('due', now)
        .limit(reviewCardsRemaining);
        
      if (reviewCardsError) {
        throw reviewCardsError;
      }
      
      reviewCards = reviewCardsData || [];
    }
    
    // Combine new cards and review cards
    const data = [...newCards, ...reviewCards];
    
    // Check if there are no cards ready for review
    if (!data || data.length === 0) {
      // Check if there are any cards in the deck at all
      const { count, error: countError } = await supabaseAdmin
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('deck_id', deck.id)
        .eq('user_id', userId);
        
      if (countError) {
        throw countError;
      }
      
      // If there are cards but none ready for review, return a special status
      if (count && count > 0) {
        return { 
          deck, 
          cards: [],
          allCaughtUp: true,
          totalCards: count,
          dailyProgress
        };
      }
      
      // If there are no cards at all
      return { 
        deck, 
        cards: [],
        emptyDeck: true,
        dailyProgress
      };
    }
    
    // Process all cards with deck info and calculate review metrics for each card
    const cardsWithDeckInfoPromises = data.map(async (card) => {
      const cardWithDeckInfo = {
        ...card,
        deck_name: card.decks?.name,
        deck_slug: card.decks?.slug
      };
      
      // Remove the nested decks object before converting
      delete cardWithDeckInfo.decks;
      
      // Calculate review metrics for this card
      const reviewMetrics = await fsrsService.calculateReviewMetrics(card, userId);
      
      // Convert to camelCase and add review metrics
      const camelCaseCard = snakeToCamelObject(cardWithDeckInfo) as Card;
      return {
        ...camelCaseCard,
        reviewMetrics
      };
    });
    
    // Wait for all promises to resolve
    const cardsWithDeckInfo = await Promise.all(cardsWithDeckInfoPromises);
    
    return { 
      deck, 
      cards: cardsWithDeckInfo,
      dailyProgress
    };
  },

  /**
   * Get a random card from a deck for review
   * @deprecated Use getAllCardsForReview instead
   */
  async getRandomCardForReview(slug: string, userId: string): Promise<ReviewResult> {
    return this.getAllCardsForReview(slug, userId);
  },

  /**
   * Helper method to add stats (reviewCount, totalCards, remainingReviews) to a deck
   * @private
   */
  async _addDeckStats(deck: Deck, userId: string): Promise<void> {
    // Get user settings to check daily limits
    const userSettings = await userSettingsService.getUserSettings(userId);
    const newCardsLimit = userSettings?.settings?.learning?.newCardsPerDay || 5;
    const reviewCardsLimit = userSettings?.settings?.learning?.maxReviewsPerDay || 10;
    
    // Get counts of available cards
    deck.reviewCount = await cardReviewService.countReviewReadyCards(deck.id, userId);
    deck.totalCards = await cardReviewService.countTotalCards(deck.id, userId);
    
    // Get counts of cards reviewed in the last 24 hours in a single call
    const { newCardsCount, reviewCardsCount } = await logService.getReviewCounts({
      userId,
      deckId: deck.id,
      timeWindow: 24
    });
    
    // Calculate remaining cards based on daily limits
    const newCardsRemaining = Math.max(0, newCardsLimit - newCardsCount);
    const reviewCardsRemaining = Math.max(0, reviewCardsLimit - reviewCardsCount);
    
    // Count available new and review cards
    const now = new Date().toISOString();
    
    // Count available new cards
    const { count: availableNewCards, error: newError } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('deck_id', deck.id)
      .eq('state', 0);
      
    if (newError) {
      console.error(`Error counting new cards for deck ${deck.id}:`, newError);
      throw newError;
    }
    
    // Count available review cards
    const { count: availableReviewCards, error: reviewError } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('deck_id', deck.id)
      .gt('state', 0)
      .lte('due', now);
      
    if (reviewError) {
      console.error(`Error counting review cards for deck ${deck.id}:`, reviewError);
      throw reviewError;
    }
    
    // Calculate effective remaining reviews (minimum of available cards and daily limit remaining)
    const effectiveNewRemaining = Math.min(availableNewCards || 0, newCardsRemaining);
    const effectiveReviewRemaining = Math.min(availableReviewCards || 0, reviewCardsRemaining);
    
    // Set the remaining reviews property
    deck.remainingReviews = effectiveNewRemaining + effectiveReviewRemaining;
  }
}; 