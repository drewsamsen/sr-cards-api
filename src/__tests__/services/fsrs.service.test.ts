import { FSRS, Rating, Card as FSRSCard } from 'ts-fsrs';
import { fsrsService } from '../../services/fsrs.service';
import { userSettingsService } from '../../services/user-settings.service';

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

  // Mock generatorParameters function
  const mockGeneratorParameters = jest.fn().mockReturnValue({
    request_retention: 0.9,
    maximum_interval: 365,
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  });

  return {
    FSRS: MockFSRS,
    Rating: MockRating,
    createEmptyCard: mockCreateEmptyCard,
    generatorParameters: mockGeneratorParameters
  };
});

// Mock the userSettingsService
jest.mock('../../services/user-settings.service', () => ({
  userSettingsService: {
    getUserSettings: jest.fn().mockImplementation(async (userId) => {
      // Simulate missing user settings for specific test user ID
      if (userId === 'missing-settings-user') {
        return null;
      }
      
      // Simulate user with settings but no FSRS params
      if (userId === 'no-fsrs-params-user') {
        return {
          id: 'test-id',
          userId: userId,
          settings: {
            theme: 'light',
            showAnswerTimer: false,
            notifications: {
              enabled: true,
              reminderTime: '18:00',
              reminderDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            }
            // No fsrsParams
          },
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        };
      }
      
      // Return mock user settings for normal case
      return {
        id: 'test-id',
        userId: userId,
        settings: {
          theme: 'light',
          showAnswerTimer: false,
          notifications: {
            enabled: true,
            reminderTime: '18:00',
            reminderDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          },
          fsrsParams: {
            requestRetention: 0.9,
            maximumInterval: 365,
            w: [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621],
            enableFuzz: false,
            enableShortTerm: true
          }
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };
    })
  }
}));

describe('FSRS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache before each test
    fsrsService.clearFSRSCache();
  });

  describe('calculateReviewMetrics', () => {
    it('should calculate review metrics for a new card', async () => {
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
      const result = await fsrsService.calculateReviewMetrics(card);

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

    it('should calculate review metrics for a previously reviewed card', async () => {
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
      const result = await fsrsService.calculateReviewMetrics(card);

      // Assert
      expect(result).toHaveProperty('again');
      expect(result).toHaveProperty('hard');
      expect(result).toHaveProperty('good');
      expect(result).toHaveProperty('easy');
    });

    it('should handle string values for numeric fields', async () => {
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
      const result = await fsrsService.calculateReviewMetrics(card);

      // Assert
      expect(result).toHaveProperty('again');
      expect(result).toHaveProperty('hard');
      expect(result).toHaveProperty('good');
      expect(result).toHaveProperty('easy');
    });

    it('should throw an error for invalid card object', async () => {
      // Arrange
      const invalidCard = null;

      // Act & Assert
      await expect(fsrsService.calculateReviewMetrics(invalidCard as any))
        .rejects.toThrow('Invalid card object');
    });
    
    it('should use user-specific FSRS parameters when userId is provided', async () => {
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
      const userId = 'test-user-id';
      
      // Act
      const result = await fsrsService.calculateReviewMetrics(card, userId);
      
      // Assert
      expect(result).toHaveProperty('again');
      expect(result).toHaveProperty('hard');
      expect(result).toHaveProperty('good');
      expect(result).toHaveProperty('easy');
      
      // Verify userSettingsService was called with the correct userId
      expect(userSettingsService.getUserSettings).toHaveBeenCalledWith(userId);
    });

    it('should throw an error when user settings are not available', async () => {
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
      const userId = 'missing-settings-user';
      
      // Act & Assert
      await expect(fsrsService.calculateReviewMetrics(card, userId))
        .rejects.toThrow('No FSRS parameters found for user missing-settings-user');
    });
    
    it('should throw an error when user settings do not contain FSRS parameters', async () => {
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
      const userId = 'no-fsrs-params-user';
      
      // Act & Assert
      await expect(fsrsService.calculateReviewMetrics(card, userId))
        .rejects.toThrow('No FSRS parameters found for user no-fsrs-params-user');
    });
  });

  describe('processReview', () => {
    it('should process a review with rating 1 (Again)', async () => {
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
      const result = await fsrsService.processReview(card, rating);

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
      expect(result).toHaveProperty('logData');
      
      // Check log data
      expect(result.logData).toHaveProperty('rating');
      expect(result.logData).toHaveProperty('state');
      expect(result.logData).toHaveProperty('due');
      expect(result.logData).toHaveProperty('stability');
      expect(result.logData).toHaveProperty('difficulty');
      expect(result.logData).toHaveProperty('elapsed_days');
      expect(result.logData).toHaveProperty('last_elapsed_days');
      expect(result.logData).toHaveProperty('scheduled_days');
      expect(result.logData).toHaveProperty('review');
      
      // Check specific values based on our mock
      expect(result.scheduled_days).toBe(1); // Again = 1 day
      expect(result.logData.rating).toBe(rating);
    });

    it('should process a review with rating 2 (Hard)', async () => {
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
      const result = await fsrsService.processReview(card, rating);

      // Assert
      expect(result).toHaveProperty('due');
      expect(result.logData.rating).toBe(rating);
    });

    it('should process a review with rating 3 (Good)', async () => {
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
      const result = await fsrsService.processReview(card, rating);

      // Assert
      expect(result).toHaveProperty('due');
      expect(result.logData.rating).toBe(rating);
    });

    it('should process a review with rating 4 (Easy)', async () => {
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
      const result = await fsrsService.processReview(card, rating);

      // Assert
      expect(result).toHaveProperty('due');
      expect(result.logData.rating).toBe(rating);
    });

    it('should handle string values for numeric fields', async () => {
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
      const result = await fsrsService.processReview(card, rating);

      // Assert
      expect(result).toHaveProperty('due');
      expect(result).toHaveProperty('stability');
      expect(result).toHaveProperty('difficulty');
    });

    it('should throw an error for invalid rating', async () => {
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
      await expect(fsrsService.processReview(card, invalidRating))
        .rejects.toThrow('Invalid rating');
    });

    it('should throw an error for invalid card object', async () => {
      // Arrange
      const invalidCard = null;
      const rating = 3; // Good

      // Act & Assert
      await expect(fsrsService.processReview(invalidCard as any, rating))
        .rejects.toThrow('Invalid card object');
    });
    
    it('should use user-specific FSRS parameters when userId is provided', async () => {
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
      const userId = 'test-user-id';
      
      // Act
      const result = await fsrsService.processReview(card, rating, userId);
      
      // Assert
      expect(result).toHaveProperty('due');
      expect(result.logData.rating).toBe(rating);
      
      // Verify userSettingsService was called with the correct userId
      expect(userSettingsService.getUserSettings).toHaveBeenCalledWith(userId);
    });

    it('should throw an error when user settings are not available', async () => {
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
      const userId = 'missing-settings-user';
      
      // Act & Assert
      await expect(fsrsService.processReview(card, rating, userId))
        .rejects.toThrow('No FSRS parameters found for user missing-settings-user');
    });
    
    it('should throw an error when user settings do not contain FSRS parameters', async () => {
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
      const userId = 'no-fsrs-params-user';
      
      // Act & Assert
      await expect(fsrsService.processReview(card, rating, userId))
        .rejects.toThrow('No FSRS parameters found for user no-fsrs-params-user');
    });
  });
  
  describe('getFSRS', () => {
    it('should return a default FSRS instance when no userId is provided', async () => {
      // Act
      const fsrs = await fsrsService.getFSRS();
      
      // Assert
      expect(fsrs).toBeDefined();
      expect(userSettingsService.getUserSettings).not.toHaveBeenCalled();
    });
    
    it('should return a cached FSRS instance on subsequent calls with the same userId', async () => {
      // Arrange
      const userId = 'test-user-id';
      
      // Act
      const fsrs1 = await fsrsService.getFSRS(userId);
      const fsrs2 = await fsrsService.getFSRS(userId);
      
      // Assert
      expect(fsrs1).toBeDefined();
      expect(fsrs2).toBeDefined();
      expect(userSettingsService.getUserSettings).toHaveBeenCalledTimes(1);
      expect(userSettingsService.getUserSettings).toHaveBeenCalledWith(userId);
    });
    
    it('should clear the cache for a specific user', async () => {
      // Arrange
      const userId = 'test-user-id';
      
      // Act
      await fsrsService.getFSRS(userId);
      fsrsService.clearFSRSCache(userId);
      await fsrsService.getFSRS(userId);
      
      // Assert
      expect(userSettingsService.getUserSettings).toHaveBeenCalledTimes(2);
    });
    
    it('should clear the entire cache', async () => {
      // Arrange
      const userId1 = 'test-user-id-1';
      const userId2 = 'test-user-id-2';
      
      // Act
      await fsrsService.getFSRS(userId1);
      await fsrsService.getFSRS(userId2);
      fsrsService.clearFSRSCache();
      await fsrsService.getFSRS(userId1);
      await fsrsService.getFSRS(userId2);
      
      // Assert
      expect(userSettingsService.getUserSettings).toHaveBeenCalledTimes(4);
    });
    
    it('should throw an error when user settings are not available', async () => {
      // Arrange
      const userId = 'missing-settings-user';
      
      // Act & Assert
      await expect(fsrsService.getFSRS(userId))
        .rejects.toThrow('No FSRS parameters found for user missing-settings-user');
    });
    
    it('should throw an error when user settings do not contain FSRS parameters', async () => {
      // Arrange
      const userId = 'no-fsrs-params-user';
      
      // Act & Assert
      await expect(fsrsService.getFSRS(userId))
        .rejects.toThrow('No FSRS parameters found for user no-fsrs-params-user');
    });
  });
}); 