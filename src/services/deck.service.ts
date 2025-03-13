import { supabaseAdmin } from '../config/supabase';
import { Deck, DeckDB, CreateDeckDTO, UpdateDeckDTO } from '../models/deck.model';
import { Card } from '../models/card.model';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';
import { fsrsService, ReviewMetrics } from './fsrs.service';
import { cardReviewService } from './card-review.service';
import { logService } from './log.service';
import { userSettingsService, UserSettings } from './user-settings.service';
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

// Define a type for the daily limits
interface DailyLimits {
  newCardsLimit: number;
  reviewCardsLimit: number;
}

// Define a type for the review counts
interface ReviewCounts {
  newCardsCount: number;
  reviewCardsCount: number;
}

// Define a type for the available cards
interface AvailableCards {
  newCards: number;
  dueCards: number;
}

export const deckService = {
  /**
   * Calculate daily limits based on user settings and deck's dailyScaler
   * @private
   */
  _calculateDailyLimits(userSettings: UserSettings | null, dailyScaler: number): DailyLimits {
    // Get base limits from user settings
    const baseNewCardsLimit = userSettings?.settings?.learning?.newCardsPerDay || 5;
    const baseReviewCardsLimit = userSettings?.settings?.learning?.maxReviewsPerDay || 10;
    
    // Apply daily scaler to the limits and floor the values
    const newCardsLimit = Math.floor(baseNewCardsLimit * dailyScaler);
    const reviewCardsLimit = Math.floor(baseReviewCardsLimit * dailyScaler);
    
    return { newCardsLimit, reviewCardsLimit };
  },

  /**
   * Calculate daily limits and remaining reviews for a deck
   * This is a utility method that can be used by other services
   */
  async calculateDailyLimitsAndRemaining(
    deckId: string, 
    userId: string, 
    userSettings?: UserSettings | null
  ): Promise<{
    dailyLimits: DailyLimits;
    reviewCounts: ReviewCounts;
    remainingReviews: {
      newCardsRemaining: number;
      reviewCardsRemaining: number;
      totalRemaining: number;
    };
  }> {
    // Get user settings if not provided
    if (!userSettings) {
      userSettings = await userSettingsService.getUserSettings(userId);
    }
    
    // Get the deck to check its dailyScaler
    let dailyScaler = 1.0;
    try {
      const deck = await this.getDeckById(deckId, userId);
      if (deck) {
        dailyScaler = deck.dailyScaler || 1.0;
      }
    } catch (error) {
      console.warn(`[WARN] Error getting deck dailyScaler for deck ${deckId}:`, error);
    }
    
    // Calculate daily limits
    const dailyLimits = this._calculateDailyLimits(userSettings, dailyScaler);
    
    // Get counts of cards reviewed in the last 24 hours
    const reviewCounts = await logService.getReviewCounts({
      userId,
      deckId,
      timeWindow: 24
    });
    
    // Calculate remaining cards based on daily limits
    const newCardsRemaining = Math.max(0, dailyLimits.newCardsLimit - reviewCounts.newCardsCount);
    const reviewCardsRemaining = Math.max(0, dailyLimits.reviewCardsLimit - reviewCounts.reviewCardsCount);
    const totalRemaining = newCardsRemaining + reviewCardsRemaining;
    
    return {
      dailyLimits,
      reviewCounts,
      remainingReviews: {
        newCardsRemaining,
        reviewCardsRemaining,
        totalRemaining
      }
    };
  },

  /**
   * Get the number of new and review cards available for a user and deck
   * This is a centralized helper function that can be used across the application
   */
  async getAvailableCardCounts(
    deckId: string,
    userId: string
  ): Promise<{
    newCardsAvailable: number;
    reviewCardsAvailable: number;
    totalAvailable: number;
    dailyLimits: DailyLimits;
    reviewCounts: ReviewCounts;
  }> {
    // Get user settings
    const userSettings = await userSettingsService.getUserSettings(userId);
    
    // Calculate daily limits and remaining reviews
    const { dailyLimits, reviewCounts, remainingReviews } = await this.calculateDailyLimitsAndRemaining(
      deckId,
      userId,
      userSettings
    );
    
    // Get current date for comparison
    const now = new Date().toISOString();
    
    // Count available new cards in the deck
    const { count: totalNewCards, error: newError } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .eq('is_new', true);
      
    if (newError) {
      console.error(`[ERROR] Error counting new cards for deck ${deckId}:`, newError);
      throw newError;
    }
    
    // Count available review cards in the deck
    const { count: totalReviewCards, error: reviewError } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .eq('is_new', false)
      .lte('next_review_at', now);
      
    if (reviewError) {
      console.error(`[ERROR] Error counting review cards for deck ${deckId}:`, reviewError);
      throw reviewError;
    }
    
    // Calculate available cards (minimum of cards in deck and daily remaining)
    const newCardsAvailable = Math.min(totalNewCards || 0, remainingReviews.newCardsRemaining);
    const reviewCardsAvailable = Math.min(totalReviewCards || 0, remainingReviews.reviewCardsRemaining);
    const totalAvailable = newCardsAvailable + reviewCardsAvailable;
    
    return {
      newCardsAvailable,
      reviewCardsAvailable,
      totalAvailable,
      dailyLimits,
      reviewCounts
    };
  },

  /**
   * Calculate remaining reviews based on daily limits, review counts, and available cards
   * @private
   */
  _calculateRemainingReviews(
    dailyLimits: DailyLimits,
    reviewCounts: ReviewCounts,
    availableCards: AvailableCards
  ): number {
    // Calculate remaining cards based on daily limits
    const newCardsRemaining = Math.max(0, dailyLimits.newCardsLimit - reviewCounts.newCardsCount);
    const reviewCardsRemaining = Math.max(0, dailyLimits.reviewCardsLimit - reviewCounts.reviewCardsCount);
    
    // Calculate effective remaining reviews (minimum of available cards and daily limit remaining)
    const effectiveNewRemaining = Math.min(availableCards.newCards, newCardsRemaining);
    const effectiveReviewRemaining = Math.min(availableCards.dueCards, reviewCardsRemaining);
    
    // Return the total remaining reviews
    return effectiveNewRemaining + effectiveReviewRemaining;
  },

  /**
   * Get all decks for a user
   */
  async getAllDecks(userId: string): Promise<Deck[]> {
    console.time('getAllDecks');
    
    // Fetch all decks in a single query
    const { data, error } = await supabaseAdmin
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.timeEnd('getAllDecks');
      throw error;
    }

    if (!data || data.length === 0) {
      console.timeEnd('getAllDecks');
      return [];
    }

    // Convert snake_case DB results to camelCase for API
    const decks = data.map(deck => snakeToCamelObject(deck) as Deck);
    
    // Extract all deck IDs
    const deckIds = decks.map(deck => deck.id);
    
    // Get user settings to check daily limits
    const userSettings = await userSettingsService.getUserSettings(userId);
    
    // Fetch deck statistics in a single batch query
    const deckStatsMap = await cardReviewService.getDeckStatsBatch(deckIds, userId);
    
    // Process each deck
    const processedDecks = await Promise.all(decks.map(async (deck) => {
      try {
        // Get deck statistics
        const deckStats = deckStatsMap.get(deck.id) || { 
          deckId: deck.id, 
          totalCards: 0, 
          reviewReadyCards: 0,
          newCards: 0,
          dueReviewCards: 0
        };
        
        // Set the statistics on the deck object
        deck.totalCards = deckStats.totalCards;
        
        // Get available card counts using the centralized helper function
        const { 
          newCardsAvailable, 
          reviewCardsAvailable, 
          totalAvailable 
        } = await this.getAvailableCardCounts(deck.id, userId);
        
        // Set the properties for new cards, due cards, and remaining reviews
        deck.newCards = deckStats.newCards;
        deck.dueCards = deckStats.dueReviewCards;
        deck.remainingReviews = totalAvailable;
      } catch (error) {
        console.error(`Error calculating stats for deck ${deck.id}:`, error);
        deck.totalCards = 0;
        deck.newCards = 0;
        deck.dueCards = 0;
        deck.remainingReviews = 0;
      }
      
      return deck;
    }));
    
    // Validate the numbers before returning
    for (const deck of processedDecks) {
      // Ensure all values are non-negative
      deck.totalCards = Math.max(0, deck.totalCards || 0);
      deck.newCards = Math.max(0, deck.newCards || 0);
      deck.dueCards = Math.max(0, deck.dueCards || 0);
      deck.remainingReviews = Math.max(0, deck.remainingReviews || 0);
    }
    
    console.timeEnd('getAllDecks');
    return processedDecks;
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
      deck.totalCards = 0;
      deck.newCards = 0;
      deck.dueCards = 0;
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
      deck.totalCards = 0;
      deck.newCards = 0;
      deck.dueCards = 0;
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
      daily_scaler: deckData.dailyScaler || 1.0
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
    if (deckData.dailyScaler !== undefined) updateData.daily_scaler = deckData.dailyScaler;

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
    
    // Get available card counts using the centralized helper function
    const { 
      newCardsAvailable, 
      reviewCardsAvailable, 
      totalAvailable,
      dailyLimits,
      reviewCounts
    } = await this.getAvailableCardCounts(deck.id, userId);
    
    // Create daily progress object
    const dailyProgress: DailyProgressResponse = {
      newCardsSeen: reviewCounts.newCardsCount,
      newCardsLimit: dailyLimits.newCardsLimit,
      reviewCardsSeen: reviewCounts.reviewCardsCount,
      reviewCardsLimit: dailyLimits.reviewCardsLimit,
      totalRemaining: totalAvailable
    };
    
    // Check if daily limits are reached
    if (totalAvailable === 0) {
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
    
    // First, get all available new cards
    let allNewCards = [];
    if (newCardsAvailable > 0) {
      // Get all available new cards
      const { data: allNewCardsData, error: allNewCardsError } = await supabaseAdmin
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
        .eq('is_new', true)
        .limit(newCardsAvailable);
        
      if (allNewCardsError) {
        throw allNewCardsError;
      }
      
      allNewCards = allNewCardsData || [];
    }
    
    // Then, get all available review cards
    let allReviewCards = [];
    if (reviewCardsAvailable > 0) {
      // Get all available review cards
      const { data: allReviewCardsData, error: allReviewCardsError } = await supabaseAdmin
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
        .eq('is_new', false)
        .lte('next_review_at', now)
        .limit(reviewCardsAvailable);
        
      if (allReviewCardsError) {
        throw allReviewCardsError;
      }
      
      allReviewCards = allReviewCardsData || [];
    }
    
    // Combine new cards and review cards and shuffle the combined array
    const combinedCards = [...allNewCards, ...allReviewCards].sort(() => Math.random() - 0.5);
    
    // Check if there are no cards ready for review
    if (!combinedCards || combinedCards.length === 0) {
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
    const cardsWithDeckInfoPromises = combinedCards.map(async (card) => {
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
   * Helper method to add stats (totalCards, newCards, dueCards, remainingReviews) to a deck
   * @private
   */
  async _addDeckStats(deck: Deck, userId: string, userSettings?: UserSettings | null): Promise<void> {
    // Get user settings to check daily limits if not provided
    if (!userSettings) {
      userSettings = await userSettingsService.getUserSettings(userId);
    }
    
    // Get count of total cards
    deck.totalCards = await cardReviewService.countTotalCards(deck.id, userId);
    
    // Get available card counts using the centralized helper function
    const { 
      newCardsAvailable, 
      reviewCardsAvailable, 
      totalAvailable 
    } = await this.getAvailableCardCounts(deck.id, userId);
    
    // Set the properties for new cards and due cards
    deck.newCards = newCardsAvailable;
    deck.dueCards = reviewCardsAvailable;
    deck.remainingReviews = totalAvailable;
  }
}; 