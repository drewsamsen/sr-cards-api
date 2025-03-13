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
    userSettings?: UserSettings | null,
    deck?: Partial<Deck> | null
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
    
    // Get the deck to check its dailyScaler if not provided
    let dailyScaler = 1.0;
    if (deck) {
      dailyScaler = deck.dailyScaler || 1.0;
    } else {
      try {
        // Only fetch the deck if not provided
        const fetchedDeck = await supabaseAdmin
          .from('decks')
          .select('daily_scaler')
          .eq('id', deckId)
          .eq('user_id', userId)
          .single();
          
        if (fetchedDeck.data && fetchedDeck.data.daily_scaler) {
          dailyScaler = fetchedDeck.data.daily_scaler;
        }
      } catch (error) {
        console.warn(`[WARN] Error getting deck dailyScaler for deck ${deckId}:`, error);
      }
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
    
    // Get the deck directly to pass to calculateDailyLimitsAndRemaining
    let deck: Partial<Deck> | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('decks')
        .select('id, daily_scaler')
        .eq('id', deckId)
        .eq('user_id', userId)
        .single();
        
      if (!error && data) {
        deck = snakeToCamelObject(data) as Partial<Deck>;
      }
    } catch (error) {
      console.warn(`[WARN] Error getting deck for getAvailableCardCounts: ${error}`);
    }
    
    // Calculate daily limits and remaining reviews
    const { dailyLimits, reviewCounts, remainingReviews } = await this.calculateDailyLimitsAndRemaining(
      deckId,
      userId,
      userSettings,
      deck
    );
    
    // Get current date for comparison
    const now = new Date().toISOString();
    
    // Count available new cards in the deck
    const { count: totalNewCards, error: newError } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .eq('state', 0);
      
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
      .gt('state', 0)
      .lte('due', now);
      
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
    
    try {
      // Fetch all decks in a single query
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
      
      // Extract all deck IDs
      const deckIds = decks.map(deck => deck.id);
      
      // Get user settings to check daily limits
      const userSettings = await userSettingsService.getUserSettings(userId);
      
      // Fetch deck statistics in a single batch query
      const deckStatsMap = await cardReviewService.getDeckStatsBatch(deckIds, userId);
      
      // Get review counts in a single batch query
      const reviewCountsMap = await logService.getReviewCountsBatch(userId, deckIds);
      
      // Get current date for comparison
      const now = new Date().toISOString();
      
      // Batch query for all new cards across all decks
      const { data: allNewCards, error: newCardsError } = await supabaseAdmin
        .from('cards')
        .select('deck_id, id')
        .eq('user_id', userId)
        .eq('state', 0)
        .in('deck_id', deckIds);
        
      if (newCardsError) {
        console.error('[ERROR] Error fetching new cards:', newCardsError);
        throw newCardsError;
      }
      
      // Batch query for all review cards across all decks
      const { data: allReviewCards, error: reviewCardsError } = await supabaseAdmin
        .from('cards')
        .select('deck_id, id')
        .eq('user_id', userId)
        .gt('state', 0)
        .lte('due', now)
        .in('deck_id', deckIds);
        
      if (reviewCardsError) {
        console.error('[ERROR] Error fetching review cards:', reviewCardsError);
        throw reviewCardsError;
      }
      
      // Count new cards per deck
      const newCardsByDeck = new Map<string, number>();
      allNewCards?.forEach(card => {
        const count = newCardsByDeck.get(card.deck_id) || 0;
        newCardsByDeck.set(card.deck_id, count + 1);
      });
      
      // Count review cards per deck
      const reviewCardsByDeck = new Map<string, number>();
      allReviewCards?.forEach(card => {
        const count = reviewCardsByDeck.get(card.deck_id) || 0;
        reviewCardsByDeck.set(card.deck_id, count + 1);
      });
      
      // Process each deck
      const processedDecks = decks.map(deck => {
        try {
          // Get deck statistics
          const deckStats = deckStatsMap.get(deck.id) || { 
            deckId: deck.id, 
            totalCards: 0, 
            reviewReadyCards: 0,
            newCards: 0,
            dueReviewCards: 0
          };
          
          // Get review counts
          const reviewCounts = reviewCountsMap.get(deck.id) || {
            newCardsCount: 0,
            reviewCardsCount: 0
          };
          
          // Set the statistics on the deck object
          deck.totalCards = deckStats.totalCards;
          deck.newCards = deckStats.newCards;
          deck.dueCards = deckStats.dueReviewCards;
          
          // Calculate daily limits
          const dailyScaler = deck.dailyScaler || 1.0;
          const dailyLimits = this._calculateDailyLimits(userSettings, dailyScaler);
          
          // Calculate remaining cards based on daily limits
          const newCardsRemaining = Math.max(0, dailyLimits.newCardsLimit - reviewCounts.newCardsCount);
          const reviewCardsRemaining = Math.max(0, dailyLimits.reviewCardsLimit - reviewCounts.reviewCardsCount);
          
          // Get available cards from our batch queries
          const availableNewCards = newCardsByDeck.get(deck.id) || 0;
          const availableReviewCards = reviewCardsByDeck.get(deck.id) || 0;
          
          // Calculate available cards (minimum of cards in deck and daily remaining)
          const newCardsAvailable = Math.min(availableNewCards, newCardsRemaining);
          const reviewCardsAvailable = Math.min(availableReviewCards, reviewCardsRemaining);
          
          // Set remaining reviews
          deck.remainingReviews = newCardsAvailable + reviewCardsAvailable;
        } catch (error) {
          console.error(`Error calculating stats for deck ${deck.id}:`, error);
          deck.totalCards = 0;
          deck.newCards = 0;
          deck.dueCards = 0;
          deck.remainingReviews = 0;
        }
        
        return deck;
      });
      
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
    } catch (error) {
      console.error('[ERROR] Error in getAllDecks:', error);
      console.timeEnd('getAllDecks');
      return [];
    }
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
    console.log(`[DEBUG] getAllCardsForReview called with slug=${slug}, userId=${userId}`);
    
    try {
      const deck = await this.getDeckBySlug(slug, userId);
      
      if (!deck) {
        console.log(`[DEBUG] No deck found for slug=${slug}, userId=${userId}`);
        return { deck: null, cards: [] };
      }
      
      console.log(`[DEBUG] Found deck: ${deck.id}, name=${deck.name}`);
      
      // Get user settings to check daily limits - do this ONCE at the beginning
      console.log(`[DEBUG] Getting user settings for userId=${userId}`);
      const userSettings = await userSettingsService.getUserSettings(userId);
      
      // Store FSRS parameters to avoid repeated calls
      let fsrsParams = null;
      if (userSettings && userSettings.settings && userSettings.settings.fsrsParams) {
        fsrsParams = userSettings.settings.fsrsParams;
        console.log(`[DEBUG] Using FSRS parameters from user settings for userId=${userId}`);
      } else {
        console.warn(`[WARN] No user settings found for user ${userId}, using defaults`);
      }
      
      // Get available card counts using the centralized helper function
      console.log(`[DEBUG] Getting available card counts for deckId=${deck.id}, userId=${userId}`);
      const { 
        newCardsAvailable, 
        reviewCardsAvailable, 
        totalAvailable,
        dailyLimits,
        reviewCounts
      } = await this.getAvailableCardCounts(deck.id, userId);
      
      console.log(`[DEBUG] Card counts: new=${newCardsAvailable}, review=${reviewCardsAvailable}, total=${totalAvailable}`);
      
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
          .eq('state', 0)
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
          .gt('state', 0)
          .lte('due', now)
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
      console.log(`[DEBUG] Processing ${combinedCards.length} cards for review metrics`);
      
      // Get FSRS instance once for all cards to avoid repeated calls
      const fsrs = await fsrsService.getFSRS(userId);
      
      const cardsWithDeckInfo = [];
      
      // Process cards sequentially instead of in parallel to avoid overwhelming the system
      for (const card of combinedCards) {
        try {
          const cardWithDeckInfo = {
            ...card,
            deck_name: card.decks?.name,
            deck_slug: card.decks?.slug
          };
          
          // Remove the nested decks object before converting
          delete cardWithDeckInfo.decks;
          
          // Calculate review metrics for this card
          // Use a direct call to calculateReviewMetrics with the FSRS instance
          // to avoid repeated calls to getUserSettings
          console.log(`[DEBUG] Calculating review metrics for card ${card.id}`);
          const reviewMetrics = await fsrsService.calculateReviewMetrics(card, userId);
          
          // Convert to camelCase and add review metrics
          const camelCaseCard = snakeToCamelObject(cardWithDeckInfo) as Card;
          cardsWithDeckInfo.push({
            ...camelCaseCard,
            reviewMetrics
          });
        } catch (cardError) {
          console.error(`[ERROR] Error processing card ${card.id}:`, cardError);
          // Continue with the next card instead of failing the entire request
        }
      }
      
      console.log(`[DEBUG] Successfully processed ${cardsWithDeckInfo.length} cards`);
      
      return { 
        deck, 
        cards: cardsWithDeckInfo,
        dailyProgress
      };
    } catch (error) {
      console.error('[ERROR] Error in getAllCardsForReview:', error);
      return { deck: null, cards: [] };
    }
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
    
    // Instead of calling getAvailableCardCounts which creates a circular dependency,
    // calculate the stats directly
    const now = new Date().toISOString();
    
    // Count available new cards in the deck
    const { count: totalNewCards, error: newError } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deck.id)
      .eq('user_id', userId)
      .eq('state', 0);
      
    if (newError) {
      console.error(`[ERROR] Error counting new cards for deck ${deck.id}:`, newError);
      deck.newCards = 0;
    } else {
      deck.newCards = totalNewCards || 0;
    }
    
    // Count available review cards in the deck
    const { count: totalReviewCards, error: reviewError } = await supabaseAdmin
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deck.id)
      .eq('user_id', userId)
      .gt('state', 0)
      .lte('due', now);
      
    if (reviewError) {
      console.error(`[ERROR] Error counting review cards for deck ${deck.id}:`, reviewError);
      deck.dueCards = 0;
    } else {
      deck.dueCards = totalReviewCards || 0;
    }
    
    // Calculate daily limits and review counts - pass the deck to avoid circular dependency
    const { dailyLimits, reviewCounts } = await this.calculateDailyLimitsAndRemaining(
      deck.id,
      userId,
      userSettings,
      deck // Pass the deck to avoid another DB call
    );
    
    // Calculate remaining cards based on daily limits
    const newCardsRemaining = Math.max(0, dailyLimits.newCardsLimit - reviewCounts.newCardsCount);
    const reviewCardsRemaining = Math.max(0, dailyLimits.reviewCardsLimit - reviewCounts.reviewCardsCount);
    
    // Calculate available cards (minimum of cards in deck and daily remaining)
    const newCardsAvailable = Math.min(deck.newCards, newCardsRemaining);
    const reviewCardsAvailable = Math.min(deck.dueCards, reviewCardsRemaining);
    
    // Update the deck stats
    deck.newCards = newCardsAvailable;
    deck.dueCards = reviewCardsAvailable;
    deck.remainingReviews = newCardsAvailable + reviewCardsAvailable;
  }
}; 