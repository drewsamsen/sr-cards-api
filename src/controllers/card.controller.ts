import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { cardService } from '../services/card.service';
import { CreateCardDTO, UpdateCardDTO, CardReviewDTO } from '../models/card.model';
import { asyncHandler } from '../utils';

export const cardController = {
  /**
   * Get all cards for the current user across all decks
   */
  getAllCards: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;

    const cards = await cardService.getAllCardsByUserId(userId);

    res.status(200).json({
      status: 'success',
      data: {
        cards,
      },
    });
  }),

  /**
   * Get all cards for a deck
   */
  getCardsByDeckId: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const deckId = req.params.deckId;

    const cards = await cardService.getCardsByDeckId(deckId, userId);

    res.status(200).json({
      status: 'success',
      data: {
        cards,
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

    const card = await cardService.createCard(cardData, deckId, userId);

    res.status(201).json({
      status: 'success',
      data: {
        card,
      },
    });
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
    const { rating: rawRating, reviewedAt } = req.body;
    
    console.log('Review request received:', {
      userId,
      cardId,
      rating: rawRating,
      reviewedAt,
      body: req.body
    });

    // Convert rating to number if it's a string
    const rating = typeof rawRating === 'string' ? parseInt(rawRating, 10) : rawRating;

    if (rating === undefined || isNaN(rating) || ![1, 2, 3, 4].includes(rating)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid rating (1-4) is required',
      });
    }

    const reviewData: CardReviewDTO = {
      rating,
      reviewedAt: reviewedAt || new Date().toISOString(),
    };
    
    console.log('Review data prepared:', reviewData);

    try {
      const card = await cardService.submitCardReview(cardId, reviewData, userId);

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
    } catch (error) {
      // If there's an error with the FSRS calculation, return a 500 error
      console.error('Error processing card review:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process card review. FSRS calculation error.',
      });
    }
  }),
}; 