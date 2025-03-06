import { FSRS, Rating, Card as FSRSCard } from 'ts-fsrs';
import { fsrsService } from '../../services/fsrs.service';

// Mock the ts-fsrs library
jest.mock('ts-fsrs', () => {
  // Create a mock FSRS card
  const mockCard = {
    due: new Date('2023-01-02'),
    stability: 1.5,
    difficulty: 0.3,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    state: 1,
    last_review: new Date('2023-01-01')
  };

  // Create mock result objects for different ratings
  const createMockResult = (daysToAdd: number) => {
    const due = new Date('2023-01-01');
    due.setDate(due.getDate() + daysToAdd);
    
    return {
      card: {
        ...mockCard,
        due,
        scheduled_days: daysToAdd
      },
      log: {
        rating: 0,
        state: 0,
        due: new Date(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        last_elapsed_days: 0,
        scheduled_days: 0,
        review: new Date()
      }
    };
  };

  // Mock Rating enum
  const MockRating = {
    Again: 1,
    Hard: 2,
    Good: 3,
    Easy: 4
  };

  // Mock FSRS class
  const MockFSRS = jest.fn().mockImplementation(() => {
    return {
      repeat: jest.fn().mockReturnValue({
        1: createMockResult(1),  // Again: 1 day
        2: createMockResult(3),  // Hard: 3 days
        3: createMockResult(7),  // Good: 7 days
        4: createMockResult(14)  // Easy: 14 days
      })
    };
  });

  // Mock createEmptyCard function
  const mockCreateEmptyCard = jest.fn().mockReturnValue({
    due: new Date(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: undefined
  });

  return {
    FSRS: MockFSRS,
    Rating: MockRating,
    createEmptyCard: mockCreateEmptyCard
  };
});

describe('FSRS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateReviewMetrics', () => {
    it('should calculate review metrics for a new card', () => {
      // Arrange
      const card = {
        id: '123',
        state: 0,
        due: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null
      };

      // Act
      const result = fsrsService.calculateReviewMetrics(card);

      // Assert
      expect(result).toHaveProperty('again');
      expect(result).toHaveProperty('hard');
      expect(result).toHaveProperty('good');
      expect(result).toHaveProperty('easy');
      
      // Check that dates are in the expected order
      expect(result.again.getTime()).toBeLessThan(result.hard.getTime());
      expect(result.hard.getTime()).toBeLessThan(result.good.getTime());
      expect(result.good.getTime()).toBeLessThan(result.easy.getTime());
    });

    it('should calculate review metrics for a previously reviewed card', () => {
      // Arrange
      const card = {
        id: '123',
        state: 2,
        due: '2023-01-01T00:00:00.000Z',
        stability: 4.5,
        difficulty: 0.3,
        elapsed_days: 0,
        scheduled_days: 4,
        reps: 3,
        lapses: 1,
        last_review: '2022-12-28T00:00:00.000Z'
      };

      // Act
      const result = fsrsService.calculateReviewMetrics(card);

      // Assert
      expect(result).toHaveProperty('again');
      expect(result).toHaveProperty('hard');
      expect(result).toHaveProperty('good');
      expect(result).toHaveProperty('easy');
    });

    it('should handle string values for numeric fields', () => {
      // Arrange
      const card = {
        id: '123',
        state: '2', // String instead of number
        due: '2023-01-01T00:00:00.000Z',
        stability: '4.5', // String instead of number
        difficulty: '0.3', // String instead of number
        elapsed_days: '0', // String instead of number
        scheduled_days: '4', // String instead of number
        reps: '3', // String instead of number
        lapses: '1', // String instead of number
        last_review: '2022-12-28T00:00:00.000Z'
      };

      // Act
      const result = fsrsService.calculateReviewMetrics(card);

      // Assert
      expect(result).toHaveProperty('again');
      expect(result).toHaveProperty('hard');
      expect(result).toHaveProperty('good');
      expect(result).toHaveProperty('easy');
    });

    it('should throw an error for invalid card object', () => {
      // Arrange
      const invalidCard = null;

      // Act & Assert
      expect(() => {
        fsrsService.calculateReviewMetrics(invalidCard as any);
      }).toThrow('Invalid card object');
    });
  });

  describe('processReview', () => {
    it('should process a review with rating 1 (Again)', () => {
      // Arrange
      const card = {
        id: '123',
        state: 0,
        due: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null
      };
      const rating = 1; // Again

      // Act
      const result = fsrsService.processReview(card, rating);

      // Assert
      expect(result).toHaveProperty('due');
      expect(result).toHaveProperty('stability');
      expect(result).toHaveProperty('difficulty');
      expect(result).toHaveProperty('elapsed_days');
      expect(result).toHaveProperty('scheduled_days');
      expect(result).toHaveProperty('reps');
      expect(result).toHaveProperty('lapses');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('last_review');
      
      // Check specific values based on our mock
      expect(result.scheduled_days).toBe(1); // Again = 1 day
    });

    it('should process a review with rating 2 (Hard)', () => {
      // Arrange
      const card = {
        id: '123',
        state: 0,
        due: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null
      };
      const rating = 2; // Hard

      // Act
      const result = fsrsService.processReview(card, rating);

      // Assert
      expect(result.scheduled_days).toBe(3); // Hard = 3 days
    });

    it('should process a review with rating 3 (Good)', () => {
      // Arrange
      const card = {
        id: '123',
        state: 0,
        due: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null
      };
      const rating = 3; // Good

      // Act
      const result = fsrsService.processReview(card, rating);

      // Assert
      expect(result.scheduled_days).toBe(7); // Good = 7 days
    });

    it('should process a review with rating 4 (Easy)', () => {
      // Arrange
      const card = {
        id: '123',
        state: 0,
        due: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null
      };
      const rating = 4; // Easy

      // Act
      const result = fsrsService.processReview(card, rating);

      // Assert
      expect(result.scheduled_days).toBe(14); // Easy = 14 days
    });

    it('should handle string values for numeric fields', () => {
      // Arrange
      const card = {
        id: '123',
        state: '2', // String instead of number
        due: '2023-01-01T00:00:00.000Z',
        stability: '4.5', // String instead of number
        difficulty: '0.3', // String instead of number
        elapsed_days: '0', // String instead of number
        scheduled_days: '4', // String instead of number
        reps: '3', // String instead of number
        lapses: '1', // String instead of number
        last_review: '2022-12-28T00:00:00.000Z'
      };
      const rating = 3; // Good

      // Act
      const result = fsrsService.processReview(card, rating);

      // Assert
      expect(result).toHaveProperty('due');
      expect(result).toHaveProperty('stability');
      expect(result).toHaveProperty('difficulty');
    });

    it('should throw an error for invalid rating', () => {
      // Arrange
      const card = {
        id: '123',
        state: 0,
        due: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null
      };
      const invalidRating = 5; // Invalid rating

      // Act & Assert
      expect(() => {
        fsrsService.processReview(card, invalidRating);
      }).toThrow('Invalid rating');
    });

    it('should throw an error for invalid card object', () => {
      // Arrange
      const invalidCard = null;
      const rating = 3; // Good

      // Act & Assert
      expect(() => {
        fsrsService.processReview(invalidCard as any, rating);
      }).toThrow('Invalid card object');
    });

    it('should use the provided reviewedAt date', () => {
      // Arrange
      const card = {
        id: '123',
        state: 0,
        due: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        last_review: null
      };
      const rating = 3; // Good
      const reviewedAt = new Date('2023-01-15T12:00:00.000Z');

      // Act
      const result = fsrsService.processReview(card, rating, reviewedAt);

      // Assert
      expect(result.last_review).toEqual(reviewedAt);
    });
  });
}); 