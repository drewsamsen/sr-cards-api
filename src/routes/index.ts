import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Auth routes
router.use('/auth', authRoutes);

export { router }; 