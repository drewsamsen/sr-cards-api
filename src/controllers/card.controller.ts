import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { cardService } from '../services/card.service';
import { CreateCardDTO, UpdateCardDTO, CardReviewDTO } from '../models/card.model';
import { asyncHandler } from '../utils';
import { logService } from '../services/log.service';

export const cardController = {
  /**
   * Get all cards for the current user across all decks
   */
  getAllCards: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    
    // Parse pagination parameters from query string
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    // Validate pagination parameters
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100
    const validatedOffset = Math.max(0, offset); // At least 0
    
    const { cards, total } = await cardService.getAllCardsByUserId(
      userId, 
      validatedLimit, 
      validatedOffset
    );

    res.status(200).json({
      status: 'success',
      data: {
        cards,
        pagination: {
          total,
          limit: validatedLimit,
          offset: validatedOffset,
          hasMore: validatedOffset + cards.length < total
        }
      },
    });
  }),

  /**
   * Get all cards for a deck
   */
  getCardsByDeckId: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const deckId = req.params.deckId;
    
    // Parse pagination parameters from query string
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    // Validate pagination parameters
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100
    const validatedOffset = Math.max(0, offset); // At least 0
    
    const { cards, total } = await cardService.getCardsByDeckId(
      deckId, 
      userId, 
      validatedLimit, 
      validatedOffset
    );

    res.status(200).json({
      status: 'success',
      data: {
        cards,
        pagination: {
          total,
          limit: validatedLimit,
          offset: validatedOffset,
          hasMore: validatedOffset + cards.length < total
        }
      },
    });
  }),

  /**
   * Get a card by ID
   */
  getCardById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const cardId = req.params.id;

    const card = await cardService.getCardById(cardId, userId);

    if (!card) {
      return res.status(404).json({
        status: 'error',
        message: 'Card not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        card,
      },
    });
  }),

  /**
   * Create a new card
   */
  createCard: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const deckId = req.params.deckId;
    const { front, back } = req.body;

    if (!front || !back) {
      return res.status(400).json({
        status: 'error',
        message: 'Front and back content are required',
      });
    }

    const cardData: CreateCardDTO = {
      front,
      back,
    };

    try {
      const card = await cardService.createCard(cardData, deckId, userId);

      res.status(201).json({
        status: 'success',
        data: {
          card,
        },
      });
    } catch (error: any) {
      // Check if this is a duplicate card error
      if (error.message && error.message.includes('A similar card already exists')) {
        return res.status(409).json({
          status: 'error',
          message: error.message,
          code: 'DUPLICATE_CARD'
        });
      }
      
      // Re-throw other errors to be handled by the error handler
      throw error;
    }
  }),

  /**
   * Update a card
   */
  updateCard: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const cardId = req.params.id;
    const { front, back } = req.body;

    if (!front && !back) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one field to update is required',
      });
    }

    const cardData: UpdateCardDTO = {};
    if (front !== undefined) cardData.front = front;
    if (back !== undefined) cardData.back = back;

    const card = await cardService.updateCard(cardId, cardData, userId);

    if (!card) {
      return res.status(404).json({
        status: 'error',
        message: 'Card not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        card,
      },
    });
  }),

  /**
   * Delete a card
   */
  deleteCard: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const cardId = req.params.id;

    const success = await cardService.deleteCard(cardId, userId);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'Card not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: null,
    });
  }),

  /**
   * Get cards due for review
   */
  getCardsForReview: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const cards = await cardService.getCardsForReview(userId, limit);

    res.status(200).json({
      status: 'success',
      data: {
        cards,
      },
    });
  }),

  /**
   * Submit a review for a card
   */
  reviewCard: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const cardId = req.params.id;
    const { rating, reviewedAt } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 4) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid rating (1-4) is required',
      });
    }

    // Prepare review data
    const reviewData: CardReviewDTO = {
      rating,
    };
    
    // Add reviewedAt if provided
    if (reviewedAt) {
      reviewData.reviewedAt = reviewedAt;
    };
    
    console.log('Review data prepared:', reviewData);

    try {
      const result = await cardService.submitCardReview(cardId, reviewData, userId);

      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: 'Card not found',
        });
      }

      // Check if the result indicates a daily limit has been reached
      if ('dailyLimitReached' in result) {
        return res.status(200).json({
          status: 'success',
          data: {
            dailyLimitReached: result.dailyLimitReached,
            message: result.message,
            dailyProgress: result.dailyProgress
          },
        });
      }

      // Normal card review response
      res.status(200).json({
        status: 'success',
        data: {
          card: result,
        },
      });
    } catch (error) {
      // If there's an error with the FSRS calculation, return a 500 error
      console.error('Error processing card review:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process card review. FSRS calculation error.',
      });
    }
  }),

  /**
   * Get logs for a specific card
   */
  getCardLogs: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const cardId = req.params.id;

    // First check if the card exists and belongs to the user
    const card = await cardService.getCardById(cardId, userId);

    if (!card) {
      return res.status(404).json({
        status: 'error',
        message: 'Card not found',
      });
    }

    // Get logs for the card
    const logs = await logService.getLogsByCardId(cardId, userId);

    res.status(200).json({
      status: 'success',
      data: {
        logs,
      },
    });
  }),

  /**
   * Search for cards by query text
   */
  searchCards: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const query = req.query.q as string;
    
    // Parse pagination parameters from query string
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    // Get optional deck ID filter
    const deckId = req.query.deckId as string;
    
    // Validate search query
    if (!query || query.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }
    
    // Validate pagination parameters
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100
    const validatedOffset = Math.max(0, offset); // At least 0
    
    // Search for cards
    const { cards, total } = await cardService.searchCards(
      userId, 
      query, 
      {
        limit: validatedLimit,
        offset: validatedOffset,
        deckId: deckId || undefined
      }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        cards,
        pagination: {
          total,
          limit: validatedLimit,
          offset: validatedOffset,
          hasMore: validatedOffset + cards.length < total
        },
        query,
        deckId: deckId || undefined
      }
    });
  }),
}; 