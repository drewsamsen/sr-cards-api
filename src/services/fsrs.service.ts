/**
 * FSRS Service
 * 
 * This service handles all interactions with the ts-fsrs package for spaced repetition calculations.
 * It provides methods for calculating review schedules and converting between database models and FSRS models.
 */

import { FSRS, Rating } from 'ts-fsrs';

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
  
  // More service methods will be implemented here
}; 