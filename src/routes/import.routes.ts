import { Router } from 'express';
import { importController } from '../controllers/import.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All import routes require authentication
router.use(authenticate);

// Create import preview
router.post('/preview', importController.createImportPreview);

// Confirm import
router.post('/confirm', importController.confirmImport);

// Cancel import
router.post('/cancel', importController.cancelImport);

export default router; 