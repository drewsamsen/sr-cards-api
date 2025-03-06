import { Router } from 'express';
import authRoutes from './auth.routes';
import deckRoutes from './deck.routes';
import cardRoutes from './card.routes';
import userSettingsRoutes from './user-settings.routes';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Auth routes
router.use('/auth', authRoutes);

// Deck routes
router.use('/decks', deckRoutes);

// Card routes
router.use('/cards', cardRoutes);

// User settings routes
router.use('/user-settings', userSettingsRoutes);

export { router }; 