import { Response } from 'express';
import { deckService } from '../services/deck.service';
import { asyncHandler } from '../utils';
import { AuthenticatedRequest } from '../middleware/auth';
import { CreateDeckDTO, UpdateDeckDTO } from '../models/deck.model';

export const deckController = {
  /**
   * Get all decks for the current user
   */
  getAllDecks: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const decks = await deckService.getAllDecks(userId);

    res.status(200).json({
      status: 'success',
      data: {
        decks,
      },
    });
  }),

  /**
   * Get a deck by ID
   */
  getDeckById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const deckId = req.params.id;

    const deck = await deckService.getDeckById(deckId, userId);

    if (!deck) {
      return res.status(404).json({
        status: 'error',
        message: 'Deck not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        deck,
      },
    });
  }),

  /**
   * Get a deck by slug
   */
  getDeckBySlug: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const slug = req.params.slug;

    const deck = await deckService.getDeckBySlug(slug, userId);

    if (!deck) {
      return res.status(404).json({
        status: 'error',
        message: 'Deck not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        deck,
      },
    });
  }),

  /**
   * Create a new deck
   */
  createDeck: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Deck name is required',
      });
    }

    const deckData: CreateDeckDTO = {
      name,
      description,
    };

    const deck = await deckService.createDeck(deckData, userId);

    res.status(201).json({
      status: 'success',
      data: {
        deck,
      },
    });
  }),

  /**
   * Update a deck
   */
  updateDeck: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const deckId = req.params.id;
    const { name, description, slug } = req.body;

    if (!name && description === undefined && !slug) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one field to update is required',
      });
    }

    const deckData: UpdateDeckDTO = {};
    if (name !== undefined) deckData.name = name;
    if (description !== undefined) deckData.description = description;
    if (slug !== undefined) deckData.slug = slug;

    const deck = await deckService.updateDeck(deckId, deckData, userId);

    if (!deck) {
      return res.status(404).json({
        status: 'error',
        message: 'Deck not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        deck,
      },
    });
  }),

  /**
   * Delete a deck
   */
  deleteDeck: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const deckId = req.params.id;

    const success = await deckService.deleteDeck(deckId, userId);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'Deck not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: null,
    });
  }),

  /**
   * Get all cards from a deck available for review
   */
  getDeckReview: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        console.error('[ERROR] User ID not found in request');
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      const result = await deckService.getAllCardsForReview(slug, userId);

      if (!result.deck) {
        res.status(404).json({
          status: 'error',
          message: 'Deck not found'
        });
        return;
      }

      if (result.dailyLimitReached || result.allCaughtUp) {
        // Unified handling for both "daily limit reached" and "all caught up" scenarios
        res.status(200).json({
          status: 'success',
          data: {
            deck: result.deck,
            cards: [],
            allCaughtUp: true,
            message: "Great job! You've completed all your reviews for now. Check back later for more.",
            totalCards: result.totalCards,
            dailyProgress: result.dailyProgress
          }
        });
        return;
      }
      
      // Check if this is an "Empty Deck" response
      if (result.emptyDeck) {
        res.status(200).json({
          status: 'success',
          data: {
            deck: result.deck,
            cards: [],
            emptyDeck: true,
            message: "This deck doesn't have any cards yet. Add some cards to start reviewing!",
            dailyProgress: result.dailyProgress
          }
        });
        return;
      }
      
      // Default case for no cards available (should rarely happen with the above checks)
      if (!result.cards || result.cards.length === 0) {
        res.status(200).json({
          status: 'success',
          data: {
            deck: result.deck,
            cards: [],
            message: 'No cards available for review',
            dailyProgress: result.dailyProgress
          }
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: {
          deck: result.deck,
          cards: result.cards,
          dailyProgress: result.dailyProgress
        }
      });
    } catch (error) {
      console.error('[ERROR] Error in getAllCardsForReview controller:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : ''
      });
      res.status(500).json({
        status: 'error',
        message: 'An error occurred while fetching cards for review'
      });
    }
  }),
}; 