import { Router } from 'express';
import { userSettingsController } from '../controllers/user-settings.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/user-settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/', authenticate, userSettingsController.getUserSettings);

/**
 * @route   PUT /api/user-settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/', authenticate, userSettingsController.updateUserSettings);

export default router; 