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
    } catch (error) {
      console.error('Error calculating FSRS metrics:', error);
      
      // Fallback to simple intervals if FSRS calculation fails
      const now = new Date();
      
      const againDate = new Date(now);
      againDate.setDate(againDate.getDate() + 1);
      
      const hardDate = new Date(now);
      hardDate.setDate(hardDate.getDate() + 3);
      
      const goodDate = new Date(now);
      goodDate.setDate(goodDate.getDate() + 7);
      
      const easyDate = new Date(now);
      easyDate.setDate(easyDate.getDate() + 14);
      
      return {
        again: againDate,
        hard: hardDate,
        good: goodDate,
        easy: easyDate
      };
    }
  }
}; 