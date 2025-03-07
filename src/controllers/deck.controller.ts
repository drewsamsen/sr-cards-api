import { Request, Response } from 'express';
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
   * Get a random card from a deck for review
   */
  getDeckReview: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const slug = req.params.slug;

    const result = await deckService.getRandomCardForReview(slug, userId);

    if (!result.deck) {
      return res.status(404).json({
        status: 'error',
        message: 'Deck not found',
      });
    }

    if (result.allCaughtUp) {
      return res.status(200).json({
        status: 'success',
        data: {
          deck: result.deck,
          allCaughtUp: true,
          message: "You're all caught up! No cards due for review at this time.",
          totalCards: result.totalCards
        },
      });
    }

    if (!result.card) {
      return res.status(200).json({
        status: 'success',
        data: {
          deck: result.deck,
          emptyDeck: true,
          message: "This deck doesn't have any cards yet. Add some cards to start reviewing!",
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),
}; 