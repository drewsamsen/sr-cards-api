import { Router } from 'express';
import { cardController } from '../controllers/card.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All card routes require authentication
router.use(authenticate);

// Get all cards for the current user
router.get('/', cardController.getAllCards);

// Get cards due for review
router.get('/review', cardController.getCardsForReview);

// Card routes by ID
router.get('/:id', cardController.getCardById);
router.put('/:id', cardController.updateCard);
router.delete('/:id', cardController.deleteCard);
router.post('/:id/review', cardController.reviewCard);

export default router; 