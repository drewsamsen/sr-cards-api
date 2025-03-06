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
    const fsrs = this.getFSRS();
    const now = new Date();
    
    // Create an FSRS card from our database card
    const fsrsCard = createEmptyCard();
    
    // If the card has been reviewed before, use its existing values
    if (card.state > 0) {
      fsrsCard.due = card.due ? new Date(card.due) : now;
      fsrsCard.stability = card.stability || 0;
      fsrsCard.difficulty = card.difficulty || 0;
      fsrsCard.elapsed_days = card.elapsed_days || 0;
      fsrsCard.scheduled_days = card.scheduled_days || 0;
      fsrsCard.reps = card.reps || 0;
      fsrsCard.lapses = card.lapses || 0;
      fsrsCard.state = card.state;
      fsrsCard.last_review = card.last_review ? new Date(card.last_review) : undefined;
    }
    
    // Get scheduling cards for all ratings
    const result = fsrs.repeat(fsrsCard, now);
    
    // Extract the due dates for each rating
    return {
      again: result[Rating.Again].card.due,
      hard: result[Rating.Hard].card.due,
      good: result[Rating.Good].card.due,
      easy: result[Rating.Easy].card.due
    };
  },
  
  /**
   * Process a review for a card
   * @param card The card from the database
   * @param rating The user's rating (1-4)
   * @param reviewedAt The time of the review (defaults to now)
   * @returns Updated card parameters
   */
  processReview(card: any, rating: number, reviewedAt?: Date): ProcessedReview {
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
    if (card.state > 0) {
      fsrsCard.due = card.due ? new Date(card.due) : now;
      fsrsCard.stability = card.stability || 0;
      fsrsCard.difficulty = card.difficulty || 0;
      fsrsCard.elapsed_days = card.elapsed_days || 0;
      fsrsCard.scheduled_days = card.scheduled_days || 0;
      fsrsCard.reps = card.reps || 0;
      fsrsCard.lapses = card.lapses || 0;
      fsrsCard.state = card.state;
      fsrsCard.last_review = card.last_review ? new Date(card.last_review) : undefined;
    }
    
    // Get the result for the specific rating
    const result = fsrs.repeat(fsrsCard, now);
    const ratedResult = result[fsrsRating];
    
    // Return the updated card parameters
    return {
      due: ratedResult.card.due,
      stability: ratedResult.card.stability,
      difficulty: ratedResult.card.difficulty,
      elapsed_days: ratedResult.card.elapsed_days,
      scheduled_days: ratedResult.card.scheduled_days,
      reps: ratedResult.card.reps,
      lapses: ratedResult.card.lapses,
      state: ratedResult.card.state,
      last_review: now
    };
  }
}; 