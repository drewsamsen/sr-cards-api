import { Router } from 'express';
import { deckController } from '../controllers/deck.controller';
import { cardController } from '../controllers/card.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All deck routes require authentication
router.use(authenticate);

// Deck routes
router.get('/', deckController.getAllDecks);
router.get('/slug/:slug', deckController.getDeckBySlug);
router.get('/slug/:slug/review', deckController.getDeckReview);
router.get('/:id', deckController.getDeckById);
router.post('/', deckController.createDeck);
router.patch('/:id', deckController.updateDeck);
router.delete('/:id', deckController.deleteDeck);

// Card routes for a specific deck
router.post('/:deckId/cards', cardController.createCard);

export default router; 