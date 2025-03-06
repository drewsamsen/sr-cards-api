import { Router } from 'express';
import { cardController } from '../controllers/card.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all card routes
router.use(authenticate);

// Get all cards
router.get('/', cardController.getAllCards);

// Get cards due for review
router.get('/review', cardController.getCardsForReview);

// Get a specific card
router.get('/:id', cardController.getCardById);

// Update a card
router.patch('/:id', cardController.updateCard);

// Delete a card
router.delete('/:id', cardController.deleteCard);

// Submit a review for a card
router.post('/:id/review', cardController.reviewCard);

// Get logs for a specific card
router.get('/:id/logs', cardController.getCardLogs);

export default router; 