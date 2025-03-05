import { Router } from 'express';
import { deckController } from '../controllers/deck.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All deck routes require authentication
router.use(authenticate);

// Deck routes
router.get('/', deckController.getAllDecks);
router.get('/slug/:slug', deckController.getDeckBySlug);
router.get('/:id', deckController.getDeckById);
router.post('/', deckController.createDeck);
router.put('/:id', deckController.updateDeck);
router.delete('/:id', deckController.deleteDeck);

export default router; 