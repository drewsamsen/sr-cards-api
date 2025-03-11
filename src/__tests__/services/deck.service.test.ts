import { deckService } from '../../services/deck.service';
import { supabaseAdmin } from '../../config/supabase';
import { cardReviewService } from '../../services/card-review.service';
import { logService } from '../../services/log.service';
import { userSettingsService, UserSettings } from '../../services/user-settings.service';
import { Deck } from '../../models/deck.model';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../services/card-review.service');
jest.mock('../../services/log.service');
jest.mock('../../services/user-settings.service');

describe('Deck Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllDecks', () => {
    test('should return an empty array when no decks are found', async () => {
      // Mock supabase to return no decks
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const result = await deckService.getAllDecks('test-user-id');
      expect(result).toEqual([]);
    });

    test('should return decks with correct statistics including newCards and dueCards', async () => {
      // Mock supabase to return decks
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'deck-1',
                  user_id: 'test-user-id',
                  name: 'Test Deck 1',
                  slug: 'test-deck-1',
                  description: 'Test description 1',
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z'
                },
                {
                  id: 'deck-2',
                  user_id: 'test-user-id',
                  name: 'Test Deck 2',
                  slug: 'test-deck-2',
                  description: 'Test description 2',
                  created_at: '2023-01-02T00:00:00Z',
                  updated_at: '2023-01-02T00:00:00Z'
                }
              ],
              error: null
            })
          })
        })
      });

      // Mock user settings
      (userSettingsService.getUserSettings as jest.Mock).mockResolvedValue({
        id: 'settings-1',
        userId: 'test-user-id',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        settings: {
          theme: 'light',
          showAnswerTimer: true,
          notifications: {
            enabled: true,
            reminderTime: '09:00',
            reminderDays: ['monday', 'wednesday', 'friday']
          },
          learning: {
            newCardsPerDay: 10,
            maxReviewsPerDay: 20
          },
          fsrsParams: {
            w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
            requestRetention: 0.9,
            maximumInterval: 36500,
            enableFuzz: true,
            enableShortTerm: true
          }
        }
      });

      // Mock deck stats
      (cardReviewService.getDeckStatsBatch as jest.Mock).mockResolvedValue(
        new Map([
          ['deck-1', {
            deckId: 'deck-1',
            totalCards: 50,
            reviewReadyCards: 15,
            newCards: 5,
            dueReviewCards: 10
          }],
          ['deck-2', {
            deckId: 'deck-2',
            totalCards: 30,
            reviewReadyCards: 8,
            newCards: 3,
            dueReviewCards: 5
          }]
        ])
      );

      // Mock review counts
      (logService.getReviewCountsBatch as jest.Mock).mockResolvedValue(
        new Map([
          ['deck-1', {
            deckId: 'deck-1',
            newCardsCount: 3,
            reviewCardsCount: 7
          }],
          ['deck-2', {
            deckId: 'deck-2',
            newCardsCount: 2,
            reviewCardsCount: 4
          }]
        ])
      );

      const result = await deckService.getAllDecks('test-user-id');
      
      // Verify the result
      expect(result).toHaveLength(2);
      
      // Check first deck
      expect(result[0].id).toBe('deck-1');
      expect(result[0].totalCards).toBe(50);
      expect(result[0].reviewCount).toBe(15);
      expect(result[0].newCards).toBe(5);
      expect(result[0].dueCards).toBe(10);
      expect(result[0].remainingReviews).toBe(15); // 7 new cards (limit 10-3) + 13 review cards (limit 20-7)
      
      // Check second deck
      expect(result[1].id).toBe('deck-2');
      expect(result[1].totalCards).toBe(30);
      expect(result[1].reviewCount).toBe(8);
      expect(result[1].newCards).toBe(3);
      expect(result[1].dueCards).toBe(5);
      expect(result[1].remainingReviews).toBe(8); // 8 new cards (limit 10-2) + 16 review cards (limit 20-4)
    });

    test('should handle case where review cards are caught up but new cards are available', async () => {
      // Mock supabase to return a deck
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'deck-1',
                  user_id: 'test-user-id',
                  name: 'Test Deck 1',
                  slug: 'test-deck-1',
                  description: 'Test description 1',
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z'
                }
              ],
              error: null
            })
          })
        })
      });

      // Mock user settings
      (userSettingsService.getUserSettings as jest.Mock).mockResolvedValue({
        id: 'settings-1',
        userId: 'test-user-id',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        settings: {
          theme: 'light',
          showAnswerTimer: true,
          notifications: {
            enabled: true,
            reminderTime: '09:00',
            reminderDays: ['monday', 'wednesday', 'friday']
          },
          learning: {
            newCardsPerDay: 10,
            maxReviewsPerDay: 20
          },
          fsrsParams: {
            w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
            requestRetention: 0.9,
            maximumInterval: 36500,
            enableFuzz: true,
            enableShortTerm: true
          }
        }
      });

      // Mock deck stats - no due review cards, but new cards available
      (cardReviewService.getDeckStatsBatch as jest.Mock).mockResolvedValue(
        new Map([
          ['deck-1', {
            deckId: 'deck-1',
            totalCards: 50,
            reviewReadyCards: 5, // Only new cards, no due review cards
            newCards: 5,
            dueReviewCards: 0
          }]
        ])
      );

      // Mock review counts - some new cards already reviewed
      (logService.getReviewCountsBatch as jest.Mock).mockResolvedValue(
        new Map([
          ['deck-1', {
            deckId: 'deck-1',
            newCardsCount: 3,
            reviewCardsCount: 15
          }]
        ])
      );

      const result = await deckService.getAllDecks('test-user-id');
      
      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('deck-1');
      expect(result[0].totalCards).toBe(50);
      expect(result[0].reviewCount).toBe(5);
      expect(result[0].newCards).toBe(5);
      expect(result[0].dueCards).toBe(0);
      expect(result[0].remainingReviews).toBe(5); // 7 new cards (limit 10-3) + 0 review cards
    });

    test('should handle case where daily limits are reached', async () => {
      // Mock supabase to return a deck
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'deck-1',
                  user_id: 'test-user-id',
                  name: 'Test Deck 1',
                  slug: 'test-deck-1',
                  description: 'Test description 1',
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z'
                }
              ],
              error: null
            })
          })
        })
      });

      // Mock user settings
      (userSettingsService.getUserSettings as jest.Mock).mockResolvedValue({
        id: 'settings-1',
        userId: 'test-user-id',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        settings: {
          theme: 'light',
          showAnswerTimer: true,
          notifications: {
            enabled: true,
            reminderTime: '09:00',
            reminderDays: ['monday', 'wednesday', 'friday']
          },
          learning: {
            newCardsPerDay: 5,
            maxReviewsPerDay: 10
          },
          fsrsParams: {
            w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
            requestRetention: 0.9,
            maximumInterval: 36500,
            enableFuzz: true,
            enableShortTerm: true
          }
        }
      });

      // Mock deck stats - plenty of cards ready
      (cardReviewService.getDeckStatsBatch as jest.Mock).mockResolvedValue(
        new Map([
          ['deck-1', {
            deckId: 'deck-1',
            totalCards: 100,
            reviewReadyCards: 50,
            newCards: 20,
            dueReviewCards: 30
          }]
        ])
      );

      // Mock review counts - daily limits reached
      (logService.getReviewCountsBatch as jest.Mock).mockResolvedValue(
        new Map([
          ['deck-1', {
            deckId: 'deck-1',
            newCardsCount: 5, // Reached new cards limit
            reviewCardsCount: 10 // Reached review cards limit
          }]
        ])
      );

      const result = await deckService.getAllDecks('test-user-id');
      
      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('deck-1');
      expect(result[0].totalCards).toBe(100);
      expect(result[0].reviewCount).toBe(50);
      expect(result[0].newCards).toBe(20);
      expect(result[0].dueCards).toBe(30);
      expect(result[0].remainingReviews).toBe(0); // Daily limits reached for both new and review cards
    });
  });

  describe('_addDeckStats', () => {
    test('should correctly calculate deck statistics', async () => {
      // Create a mock deck
      const mockDeck: Deck = {
        id: 'deck-1',
        userId: 'test-user-id',
        name: 'Test Deck',
        slug: 'test-deck',
        description: 'Test description',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      // Mock user settings
      const mockUserSettings: UserSettings = {
        id: 'settings-1',
        userId: 'test-user-id',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        settings: {
          theme: 'light',
          showAnswerTimer: true,
          notifications: {
            enabled: true,
            reminderTime: '09:00',
            reminderDays: ['monday', 'wednesday', 'friday']
          },
          learning: {
            newCardsPerDay: 10,
            maxReviewsPerDay: 20
          },
          fsrsParams: {
            w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
            requestRetention: 0.9,
            maximumInterval: 36500,
            enableFuzz: true,
            enableShortTerm: true
          }
        }
      };

      // Mock card review service
      (cardReviewService.countReviewReadyCards as jest.Mock).mockResolvedValue(15);
      (cardReviewService.countTotalCards as jest.Mock).mockResolvedValue(50);

      // Mock log service
      (logService.getReviewCounts as jest.Mock).mockResolvedValue({
        newCardsCount: 3,
        reviewCardsCount: 7
      });

      // Mock supabase for new cards count and due review cards count
      let queryCount = 0;
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((field, value) => {
              queryCount++;
              
              // First query - new cards
              if (queryCount === 1) {
                return {
                  eq: jest.fn().mockImplementation((field2, value2) => {
                    return {
                      eq: jest.fn().mockResolvedValue({
                        count: 5,
                        error: null
                      })
                    };
                  })
                };
              } 
              // Second query - due review cards
              else {
                return {
                  eq: jest.fn().mockImplementation((field2, value2) => {
                    return {
                      gt: jest.fn().mockImplementation((field3, value3) => {
                        return {
                          lte: jest.fn().mockResolvedValue({
                            count: 10,
                            error: null
                          })
                        };
                      })
                    };
                  })
                };
              }
            })
          })
        };
      });

      // Call the method
      await deckService._addDeckStats(mockDeck, 'test-user-id', mockUserSettings);

      // Verify the result
      expect(mockDeck.totalCards).toBe(50);
      expect(mockDeck.reviewCount).toBe(15);
      expect(mockDeck.newCards).toBe(5);
      expect(mockDeck.dueCards).toBe(10);
      expect(mockDeck.remainingReviews).toBe(15); // 7 new cards (limit 10-3) + 10 review cards (limit 20-7, but only 10 due)
    });
  });
}); 