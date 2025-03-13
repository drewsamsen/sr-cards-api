/**
 * FSRS Service
 * 
 * This service handles all interactions with the ts-fsrs package for spaced repetition calculations.
 * It provides methods for calculating review schedules and converting between database models and FSRS models.
 */

import { FSRS, Rating, Card as FSRSCard, createEmptyCard, generatorParameters, FSRSParameters } from 'ts-fsrs';
import { userSettingsService } from './user-settings.service';

// Set to true to enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

// Default FSRS parameters to use as fallback
const DEFAULT_FSRS_PARAMS = {
  request_retention: 0.9,
  maximum_interval: 365 * 2, // 2 years
  w: [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621],
  enable_fuzz: false,
  enable_short_term: true
};

// Define the review metrics interface
export interface ReviewMetrics {
  again: Date;
  hard: Date;
  good: Date;
  easy: Date;
}

// Define the processed review interface
export interface ProcessedReview {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: Date;
  // Add log data
  logData: ReviewLogData;
}

// Define the review log data interface
export interface ReviewLogData {
  rating: number;
  state: number;
  due: Date | null;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review: Date;
}

// Define the database card interface to improve type safety
export interface DBCard {
  id: string;
  state: number | string;
  due: string | Date | null;
  stability: number | string;
  difficulty: number | string;
  // Support both snake_case and camelCase property names
  elapsed_days?: number | string;
  elapsedDays?: number | string;
  scheduled_days?: number | string;
  scheduledDays?: number | string;
  reps: number | string;
  lapses: number | string;
  // Support both snake_case and camelCase property names
  last_review?: string | Date | null;
  lastReview?: string | Date | null;
  [key: string]: any; // Allow for additional properties
}

// Cache for user FSRS instances
interface FSRSCache {
  [userId: string]: {
    fsrs: FSRS;
    timestamp: number;
  }
}

// Cache expiration time (30 minutes in milliseconds)
const CACHE_EXPIRATION = 30 * 60 * 1000;

/**
 * Helper function for logging errors
 * @param message Error message
 * @param error Error object
 */
function logError(message: string, error: any): void {
  if (DEBUG) {
    console.error(message, error);
  }
}

/**
 * FSRS Service
 */
export const fsrsService = {
  // Cache for FSRS instances by user
  fsrsCache: {} as FSRSCache,

  /**
   * Get an instance of FSRS with custom configuration
   * @param userId Optional user ID to get user-specific FSRS parameters
   */
  async getFSRS(userId?: string): Promise<FSRS> {
    // If no userId provided, log a detailed error but use default parameters
    if (!userId) {
      console.error('[ERROR] getFSRS called without a user ID. This should never happen. Stack trace:', new Error().stack);
      // Use default parameters as a fallback
      return new FSRS(generatorParameters(DEFAULT_FSRS_PARAMS));
    }

    // Check if we have a cached FSRS instance for this user
    const cachedFSRS = this.fsrsCache[userId];
    const now = Date.now();
    
    if (cachedFSRS && (now - cachedFSRS.timestamp) < CACHE_EXPIRATION) {
      return cachedFSRS.fsrs;
    }

    try {
      // Get user settings with detailed logging
      console.log(`[DEBUG] Attempting to get settings for user ${userId} in getFSRS`);
      const userSettings = await userSettingsService.getUserSettings(userId);
      
      if (!userSettings) {
        console.error(`[ERROR] User settings not found for user ${userId} in getFSRS. This is unexpected as settings should exist.`);
        // Use default parameters as a fallback
        return this._createDefaultFSRS();
      }
      
      console.log(`[DEBUG] Retrieved settings for user ${userId}:`, JSON.stringify({
        id: userSettings.id,
        userId: userSettings.userId,
        hasSettings: !!userSettings.settings,
        hasFsrsParams: !!(userSettings.settings && userSettings.settings.fsrsParams)
      }));
      
      // Ensure FSRS parameters exist
      if (!userSettings.settings || !userSettings.settings.fsrsParams) {
        console.error(`[ERROR] FSRS parameters missing in user settings for user ${userId}. Using defaults.`);
        // Use default parameters as a fallback
        return this._createDefaultFSRS();
      }
      
      // Extract FSRS parameters from user settings
      const { requestRetention, maximumInterval, w, enableFuzz, enableShortTerm } = userSettings.settings.fsrsParams;
      
      // Generate FSRS parameters
      const params: FSRSParameters = generatorParameters({
        request_retention: requestRetention,
        maximum_interval: maximumInterval,
        w: w,
        enable_fuzz: enableFuzz,
        enable_short_term: enableShortTerm
      });
      
      // Create FSRS instance with user parameters
      const userFSRS = new FSRS(params);
      
      // Cache the user's FSRS instance
      this.fsrsCache[userId] = {
        fsrs: userFSRS,
        timestamp: now
      };
      
      return userFSRS;
    } catch (error) {
      // Log the error but use default parameters as a fallback
      console.error(`[ERROR] Exception in getFSRS for user ${userId}:`, error);
      console.error(`Stack trace:`, new Error().stack);
      
      return this._createDefaultFSRS();
    }
  },
  
  /**
   * Create a default FSRS instance
   * @private
   */
  _createDefaultFSRS(): FSRS {
    return new FSRS(generatorParameters(DEFAULT_FSRS_PARAMS));
  },
  
  /**
   * Clear the FSRS cache for a specific user or all users
   * @param userId Optional user ID to clear cache for specific user
   */
  clearFSRSCache(userId?: string): void {
    if (userId) {
      delete this.fsrsCache[userId];
    } else {
      this.fsrsCache = {};
    }
  },
  
  /**
   * Get the Rating enum for use in other services
   */
  getRatings() {
    return {
      Again: Rating.Again,
      Hard: Rating.Hard,
      Good: Rating.Good,
      Easy: Rating.Easy
    };
  },

  /**
   * Helper function to ensure a value is a Date object
   * @param dateValue Date value that might be a string or Date
   * @param defaultValue Default date to use if dateValue is null/undefined
   */
  ensureDate(dateValue: string | Date | null | undefined, defaultValue: Date = new Date()): Date {
    if (!dateValue) return defaultValue;
    return dateValue instanceof Date ? dateValue : new Date(dateValue);
  },

  /**
   * Helper function to parse a numeric value from a string or number
   * @param value Value to parse
   * @param defaultValue Default value if parsing fails
   */
  parseNumber(value: string | number | null | undefined, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  },

  /**
   * Helper function to convert a database card to an FSRS card
   * @param card Database card
   * @param now Current date
   */
  convertToFSRSCard(card: DBCard, now: Date): FSRSCard {
    const fsrsCard = createEmptyCard();
    
    // If the card has been reviewed before, use its existing values
    const cardState = this.parseNumber(card.state, 0);
    
    if (cardState > 0) {
      fsrsCard.due = this.ensureDate(card.due, now);
      fsrsCard.stability = this.parseNumber(card.stability);
      fsrsCard.difficulty = this.parseNumber(card.difficulty);
      // Handle both camelCase and snake_case property names
      fsrsCard.elapsed_days = this.parseNumber(card.elapsed_days ?? card.elapsedDays);
      fsrsCard.scheduled_days = this.parseNumber(card.scheduled_days ?? card.scheduledDays);
      fsrsCard.reps = this.parseNumber(card.reps);
      fsrsCard.lapses = this.parseNumber(card.lapses);
      fsrsCard.state = cardState;
      // Handle both camelCase and snake_case property names
      fsrsCard.last_review = card.last_review ? this.ensureDate(card.last_review) : 
                            (card.lastReview ? this.ensureDate(card.lastReview) : undefined);
    }
    
    return fsrsCard;
  },
  
  /**
   * Calculate review metrics for a card
   * @param card The card from the database
   * @param userId Optional user ID to get user-specific FSRS parameters
   * @returns Object with predicted review dates for each rating
   */
  async calculateReviewMetrics(card: DBCard, userId?: string): Promise<ReviewMetrics> {
    try {
      // Validate card
      if (!card || typeof card !== 'object') {
        console.error('[ERROR] Invalid card object passed to calculateReviewMetrics:', card);
        throw new Error('Invalid card object');
      }
      
      let userIdToUse: string;
      if (!userId) {
        console.error('[ERROR] No user ID provided to calculateReviewMetrics for card:', card.id);
        // Try to use a default user ID if available in the card
        if (card.user_id) {
          console.log(`[DEBUG] Using user_id from card: ${card.user_id}`);
          userIdToUse = card.user_id as string;
        } else {
          throw new Error('User ID is required to calculate review metrics');
        }
      } else {
        userIdToUse = userId;
      }
      
      // Check if we have a cached FSRS instance for this user to avoid repeated calls to getUserSettings
      const cachedFSRS = this.fsrsCache[userIdToUse];
      const now = Date.now();
      
      let fsrs;
      if (cachedFSRS && (now - cachedFSRS.timestamp) < CACHE_EXPIRATION) {
        // Use the cached FSRS instance
        fsrs = cachedFSRS.fsrs;
      } else {
        // Get a new FSRS instance
        fsrs = await this.getFSRS(userIdToUse);
      }
      
      const currentTime = new Date();
      
      // Create an FSRS card from our database card
      const fsrsCard = this.convertToFSRSCard(card, currentTime);
      
      // Get scheduling cards for all ratings
      const result = fsrs.repeat(fsrsCard, currentTime);
      
      // Extract the due dates for each rating
      return {
        again: this.ensureDate(result[Rating.Again].card.due),
        hard: this.ensureDate(result[Rating.Hard].card.due),
        good: this.ensureDate(result[Rating.Good].card.due),
        easy: this.ensureDate(result[Rating.Easy].card.due)
      };
    } catch (error) {
      console.error(`[ERROR] FSRS calculation error for card ${card?.id}:`, error);
      console.error(`[ERROR] Stack trace:`, new Error().stack);
      
      // Return default metrics as a fallback
      const now = new Date();
      const againDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour
      const hardDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day
      const goodDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3); // 3 days
      const easyDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days
      
      console.log(`[DEBUG] Returning default metrics for card ${card?.id}`);
      return {
        again: againDate,
        hard: hardDate,
        good: goodDate,
        easy: easyDate
      };
    }
  },
  
  /**
   * Process a review for a card
   * @param card The card from the database
   * @param rating The user's rating (1-4)
   * @param userId Optional user ID to get user-specific FSRS parameters
   * @param reviewedAt The time of the review (defaults to now)
   * @returns Updated card parameters and log data
   */
  async processReview(card: DBCard, rating: number, userId?: string, reviewedAt?: Date): Promise<ProcessedReview> {
    try {
      // Validate rating
      if (typeof rating !== 'number' || isNaN(rating) || rating < 1 || rating > 4) {
        throw new Error(`Invalid rating: ${rating}. Must be a number between 1-4.`);
      }
      
      // Validate card
      if (!card || typeof card !== 'object') {
        throw new Error('Invalid card object');
      }
      
      const fsrs = await this.getFSRS(userId);
      const now = reviewedAt || new Date();
      
      // Map the rating to the FSRS Rating enum
      let fsrsRating: Rating;
      switch (rating) {
        case 1: fsrsRating = Rating.Again; break;
        case 2: fsrsRating = Rating.Hard; break;
        case 3: fsrsRating = Rating.Good; break;
        case 4: fsrsRating = Rating.Easy; break;
        default: throw new Error(`Invalid rating: ${rating}. Must be 1-4.`);
      }
      
      // Create an FSRS card from our database card
      const fsrsCard = this.convertToFSRSCard(card, now);
      
      // Get the result for the specific rating
      const result = fsrs.repeat(fsrsCard, now);
      const ratedResult = result[fsrsRating];
      
      // Calculate last_elapsed_days (days between previous reviews)
      const lastElapsedDays = card.last_review 
        ? (now.getTime() - this.ensureDate(card.last_review).getTime()) / (1000 * 60 * 60 * 24)
        : (card.lastReview 
            ? (now.getTime() - this.ensureDate(card.lastReview).getTime()) / (1000 * 60 * 60 * 24)
            : 0);
      
      // Create log data
      const logData: ReviewLogData = {
        rating: rating,
        state: this.parseNumber(card.state),
        due: card.due ? this.ensureDate(card.due) : null,
        stability: this.parseNumber(card.stability),
        difficulty: this.parseNumber(card.difficulty),
        elapsed_days: ratedResult.log.elapsed_days,
        last_elapsed_days: lastElapsedDays,
        scheduled_days: ratedResult.card.scheduled_days,
        review: now
      };
      
      // Return the updated card parameters and log data
      return {
        due: this.ensureDate(ratedResult.card.due),
        stability: ratedResult.card.stability,
        difficulty: ratedResult.card.difficulty,
        elapsed_days: ratedResult.card.elapsed_days,
        scheduled_days: ratedResult.card.scheduled_days,
        reps: ratedResult.card.reps,
        lapses: ratedResult.card.lapses,
        state: ratedResult.card.state,
        last_review: now,
        logData: logData
      };
    } catch (error) {
      logError('FSRS calculation error details:', error);
      throw error;
    }
  }
}; 