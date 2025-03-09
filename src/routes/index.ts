import express from 'express';
import authRoutes from './auth.routes';
import deckRoutes from './deck.routes';
import cardRoutes from './card.routes';
import userSettingsRoutes from './user-settings.routes';
import importRoutes from './import.routes';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/decks', deckRoutes);
router.use('/cards', cardRoutes);
router.use('/user-settings', userSettingsRoutes);
router.use('/imports', importRoutes);

// Root API endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Card API is running',
    documentation: '/api/health'
  });
});

export { router }; 