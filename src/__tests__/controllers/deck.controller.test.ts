import { Request, Response } from 'express';
import { deckService } from '../../services/deck.service';
import { deckController } from '../../controllers/deck.controller';

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

// Mock the deck service
jest.mock('../../services/deck.service');

describe('Deck Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let responseObject = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request and response
    mockRequest = {
      params: { slug: 'test-deck' },
      user: { id: 'test-user-id' }
    };
    
    responseObject = {};
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation(result => {
        responseObject = result;
        return mockResponse;
      })
    };
  });

  describe('getDeckReview', () => {
    
    test('should return a card when one is available for review', async () => {
      // Mock the service to return a card
      const mockCard = {
        id: 'card-1',
        front: 'Test front',
        back: 'Test back',
        state: 0,
        reviewMetrics: {
          again: '2023-03-05T12:30:00Z',
          hard: '2023-03-07T12:30:00Z',
          good: '2023-03-11T12:30:00Z',
          easy: '2023-03-18T12:30:00Z'
        }
      };
      
      const mockDeck = {
        id: 'deck-1',
        name: 'Test Deck',
        slug: 'test-deck'
      };
      
      const mockDailyProgress = {
        newCardsSeen: 3,
        newCardsLimit: 5,
        reviewCardsSeen: 8,
        reviewCardsLimit: 15,
        totalRemaining: 9
      };
      
      (deckService.getAllCardsForReview as jest.Mock).mockResolvedValue({
        deck: mockDeck,
        cards: [mockCard],
        dailyProgress: mockDailyProgress
      });
      
      // Call the controller method - using the asyncHandler directly
      await deckController.getDeckReview(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        jest.fn() // Next function
      );
      
      // Assertions
      expect(deckService.getAllCardsForReview).toHaveBeenCalledWith(
        'test-deck',
        'test-user-id'
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        status: 'success',
        data: {
          deck: mockDeck,
          cards: [mockCard],
          dailyProgress: mockDailyProgress
        }
      });
    });
    
    test('should return all caught up response when daily limit reached or no cards due', async () => {
      // Mock the service to return all caught up / daily limit reached
      const mockDeck = {
        id: 'deck-1',
        name: 'Test Deck',
        slug: 'test-deck'
      };
      
      const mockDailyProgress = {
        newCardsSeen: 5,
        newCardsLimit: 5,
        reviewCardsSeen: 10,
        reviewCardsLimit: 15,
        totalRemaining: 0
      };
      
      // Test both scenarios (daily limit reached and all caught up)
      // They should produce the same response
      const testCases = [
        {
          name: 'daily limit reached',
          serviceResponse: {
            deck: mockDeck,
            cards: [],
            dailyLimitReached: true,
            message: "You've reached your daily review limits for this deck.",
            dailyProgress: mockDailyProgress,
            totalCards: 25
          }
        },
        {
          name: 'all caught up',
          serviceResponse: {
            deck: mockDeck,
            cards: [],
            allCaughtUp: true,
            totalCards: 25,
            dailyProgress: mockDailyProgress
          }
        }
      ];
      
      for (const testCase of testCases) {
        // Reset mocks for each test case
        jest.clearAllMocks();
        responseObject = {};
        
        (deckService.getAllCardsForReview as jest.Mock).mockResolvedValue(
          testCase.serviceResponse
        );
        
        // Call the controller method
        await deckController.getDeckReview(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
          jest.fn() // Next function
        );
        
        // Assertions
        expect(deckService.getAllCardsForReview).toHaveBeenCalledWith(
          'test-deck',
          'test-user-id'
        );
        
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject).toEqual({
          status: 'success',
          data: {
            deck: mockDeck,
            cards: [],
            allCaughtUp: true,
            message: "Great job! You've completed all your reviews for now. Check back later for more.",
            totalCards: 25,
            dailyProgress: mockDailyProgress
          }
        });
      }
    });
    
    test('should return empty deck response when deck has no cards', async () => {
      // Mock the service to return empty deck
      const mockDeck = {
        id: 'deck-1',
        name: 'Test Deck',
        slug: 'test-deck'
      };
      
      const mockDailyProgress = {
        newCardsSeen: 0,
        newCardsLimit: 5,
        reviewCardsSeen: 0,
        reviewCardsLimit: 15,
        totalRemaining: 20
      };
      
      (deckService.getAllCardsForReview as jest.Mock).mockResolvedValue({
        deck: mockDeck,
        cards: [],
        emptyDeck: true,
        dailyProgress: mockDailyProgress
      });
      
      // Call the controller method
      await deckController.getDeckReview(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        jest.fn() // Next function
      );
      
      // Assertions
      expect(deckService.getAllCardsForReview).toHaveBeenCalledWith(
        'test-deck',
        'test-user-id'
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        status: 'success',
        data: {
          deck: mockDeck,
          cards: [],
          emptyDeck: true,
          message: "This deck doesn't have any cards yet. Add some cards to start reviewing!",
          dailyProgress: mockDailyProgress
        }
      });
    });
    
    test('should return 404 when deck is not found', async () => {
      // Mock the service to return null deck
      (deckService.getAllCardsForReview as jest.Mock).mockResolvedValue({
        deck: null,
        cards: []
      });
      
      // Call the controller method
      await deckController.getDeckReview(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        jest.fn() // Next function
      );
      
      // Assertions
      expect(deckService.getAllCardsForReview).toHaveBeenCalledWith(
        'test-deck',
        'test-user-id'
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject).toEqual({
        status: 'error',
        message: 'Deck not found'
      });
    });
    
    test('should return 401 when user is not authenticated', async () => {
      // Mock request without user
      const unauthenticatedRequest: Partial<AuthenticatedRequest> = {
        params: { slug: 'test-deck' },
        user: undefined
      };
      
      // Call the controller method
      await deckController.getDeckReview(
        unauthenticatedRequest as AuthenticatedRequest,
        mockResponse as Response,
        jest.fn() // Next function
      );
      
      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(responseObject).toEqual({
        status: 'error',
        message: 'Unauthorized'
      });
    });
    
    test('should handle errors gracefully', async () => {
      // Mock the service to throw an error
      (deckService.getAllCardsForReview as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );
      
      // Call the controller method
      await deckController.getDeckReview(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        jest.fn() // Next function
      );
      
      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject).toEqual({
        status: 'error',
        message: 'An error occurred while fetching cards for review'
      });
    });
    
    test('should return cards respecting daily limits', async () => {
      // Mock the service to return cards respecting daily limits
      const mockCards = [
        {
          id: 'card-1',
          front: 'New card 1',
          back: 'Back 1',
          state: 0,
          reviewMetrics: {
            again: '2023-03-05T12:30:00Z',
            hard: '2023-03-07T12:30:00Z',
            good: '2023-03-11T12:30:00Z',
            easy: '2023-03-18T12:30:00Z'
          }
        },
        {
          id: 'card-2',
          front: 'Review card 1',
          back: 'Back 2',
          state: 1,
          due: '2023-03-05T12:30:00Z',
          reviewMetrics: {
            again: '2023-03-06T12:30:00Z',
            hard: '2023-03-08T12:30:00Z',
            good: '2023-03-12T12:30:00Z',
            easy: '2023-03-19T12:30:00Z'
          }
        }
      ];
      
      const mockDeck = {
        id: 'deck-1',
        name: 'Test Deck',
        slug: 'test-deck'
      };
      
      const mockDailyProgress = {
        newCardsSeen: 3,
        newCardsLimit: 5,
        reviewCardsSeen: 4,
        reviewCardsLimit: 10,
        totalRemaining: 8 // 2 new cards + 6 review cards
      };
      
      (deckService.getAllCardsForReview as jest.Mock).mockResolvedValue({
        deck: mockDeck,
        cards: mockCards,
        dailyProgress: mockDailyProgress
      });
      
      // Call the controller method
      await deckController.getDeckReview(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        jest.fn() // Next function
      );
      
      // Assertions
      expect(deckService.getAllCardsForReview).toHaveBeenCalledWith(
        'test-deck',
        'test-user-id'
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        status: 'success',
        data: {
          deck: mockDeck,
          cards: mockCards,
          dailyProgress: mockDailyProgress
        }
      });
    });
  });
}); 