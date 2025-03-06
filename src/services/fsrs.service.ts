/**
 * FSRS Service
 * 
 * This service handles all interactions with the ts-fsrs package for spaced repetition calculations.
 * It provides methods for calculating review schedules and converting between database models and FSRS models.
 */

import { FSRS, Rating, Card as FSRSCard, createEmptyCard } from 'ts-fsrs';

// Define the review metrics interface
export interface ReviewMetrics {
  again: Date;
  hard: Date;
  good: Date;
  easy: Date;
}

// Define the processed review result interface
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

/**
 * FSRS Service
 */
export const fsrsService = {
  /**
   * Get an instance of FSRS with custom configuration
   */
  getFSRS(): FSRS {
    return new FSRS({
      // Request retention: target probability of recall (default: 0.9)
      request_retention: 0.9,
      
      // Maximum interval: longest possible interval in days (default: 36500)
      maximum_interval: 365 * 2, // 2 years
    });
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
   * Calculate review metrics for a card
   * @param card The card from the database
   * @returns Object with predicted review dates for each rating
   */
  calculateReviewMetrics(card: any): ReviewMetrics {
    try {
      console.log('Calculating review metrics for card:', JSON.stringify(card, null, 2));
      
      // Validate card
      if (!card || typeof card !== 'object') {
        throw new Error('Invalid card object');
      }
      
      const fsrs = this.getFSRS();
      const now = new Date();
      
      // Create an FSRS card from our database card
      const fsrsCard = createEmptyCard();
      
      // If the card has been reviewed before, use its existing values
      // Convert all values to appropriate types to avoid issues
      const cardState = typeof card.state === 'string' ? parseInt(card.state, 10) : (card.state || 0);
      
      if (cardState > 0) {
        fsrsCard.due = card.due ? new Date(card.due) : now;
        fsrsCard.stability = parseFloat(card.stability) || 0;
        fsrsCard.difficulty = parseFloat(card.difficulty) || 0;
        fsrsCard.elapsed_days = parseFloat(card.elapsed_days) || 0;
        fsrsCard.scheduled_days = parseFloat(card.scheduled_days) || 0;
        fsrsCard.reps = parseInt(card.reps, 10) || 0;
        fsrsCard.lapses = parseInt(card.lapses, 10) || 0;
        fsrsCard.state = cardState;
        fsrsCard.last_review = card.last_review ? new Date(card.last_review) : undefined;
      }
      
      console.log('FSRS Card prepared:', JSON.stringify(fsrsCard, null, 2));
      
      // Get scheduling cards for all ratings
      const result = fsrs.repeat(fsrsCard, now);
      console.log('FSRS result keys:', Object.keys(result));
      
      // Extract the due dates for each rating
      return {
        again: result[Rating.Again].card.due instanceof Date ? result[Rating.Again].card.due : new Date(result[Rating.Again].card.due),
        hard: result[Rating.Hard].card.due instanceof Date ? result[Rating.Hard].card.due : new Date(result[Rating.Hard].card.due),
        good: result[Rating.Good].card.due instanceof Date ? result[Rating.Good].card.due : new Date(result[Rating.Good].card.due),
        easy: result[Rating.Easy].card.due instanceof Date ? result[Rating.Easy].card.due : new Date(result[Rating.Easy].card.due)
      };
    } catch (error) {
      console.error('FSRS calculation error details:', error);
      throw error;
    }
  },
  
  /**
   * Process a review for a card
   * @param card The card from the database
   * @param rating The user's rating (1-4)
   * @param reviewedAt The time of the review (defaults to now)
   * @returns Updated card parameters and log data
   */
  processReview(card: any, rating: number, reviewedAt?: Date): ProcessedReview {
    try {
      console.log('Processing review with card:', JSON.stringify(card, null, 2));
      console.log('Rating:', rating);
      
      // Validate rating
      if (typeof rating !== 'number' || isNaN(rating) || rating < 1 || rating > 4) {
        throw new Error(`Invalid rating: ${rating}. Must be a number between 1-4.`);
      }
      
      // Validate card
      if (!card || typeof card !== 'object') {
        throw new Error('Invalid card object');
      }
      
      const fsrs = this.getFSRS();
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
      const fsrsCard = createEmptyCard();
      
      // If the card has been reviewed before, use its existing values
      // Convert all values to appropriate types to avoid issues
      const cardState = typeof card.state === 'string' ? parseInt(card.state, 10) : (card.state || 0);
      
      if (cardState > 0) {
        fsrsCard.due = card.due ? new Date(card.due) : now;
        fsrsCard.stability = parseFloat(card.stability) || 0;
        fsrsCard.difficulty = parseFloat(card.difficulty) || 0;
        fsrsCard.elapsed_days = parseFloat(card.elapsed_days) || 0;
        fsrsCard.scheduled_days = parseFloat(card.scheduled_days) || 0;
        fsrsCard.reps = parseInt(card.reps, 10) || 0;
        fsrsCard.lapses = parseInt(card.lapses, 10) || 0;
        fsrsCard.state = cardState;
        fsrsCard.last_review = card.last_review ? new Date(card.last_review) : undefined;
      }
      
      console.log('FSRS Card prepared:', JSON.stringify(fsrsCard, null, 2));
      
      // Get the result for the specific rating
      const result = fsrs.repeat(fsrsCard, now);
      console.log('FSRS result keys:', Object.keys(result));
      
      const ratedResult = result[fsrsRating];
      console.log('Rated result:', JSON.stringify(ratedResult, null, 2));
      
      // Calculate last_elapsed_days (days between previous reviews)
      const lastElapsedDays = card.lastReview 
        ? (now.getTime() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      
      // Create log data
      const logData: ReviewLogData = {
        rating: rating,
        state: cardState,
        due: card.due ? new Date(card.due) : null,
        stability: parseFloat(card.stability) || 0,
        difficulty: parseFloat(card.difficulty) || 0,
        elapsed_days: ratedResult.log.elapsed_days,
        last_elapsed_days: lastElapsedDays,
        scheduled_days: ratedResult.card.scheduled_days,
        review: now
      };
      
      // Return the updated card parameters and log data
      return {
        due: ratedResult.card.due instanceof Date ? ratedResult.card.due : new Date(ratedResult.card.due),
        stability: ratedResult.card.stability,
        difficulty: ratedResult.card.difficulty,
        elapsed_days: ratedResult.card.elapsed_days,
        scheduled_days: ratedResult.card.scheduled_days,
        reps: ratedResult.card.reps,
        lapses: ratedResult.card.lapses,
        state: ratedResult.card.state,
        last_review: now instanceof Date ? now : new Date(now),
        logData: logData
      };
    } catch (error) {
      console.error('FSRS calculation error details:', error);
      throw error;
    }
  }
}; 