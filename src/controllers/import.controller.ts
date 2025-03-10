import { Response } from 'express';
import { importService } from '../services/import.service';
import { deckService } from '../services/deck.service';
import { CreateImportPreviewDTO, ConfirmImportDTO } from '../models/import.model';
import { AuthenticatedRequest } from '../middleware/auth';

export const importController = {
  /**
   * Create an import preview
   * @param req Request
   * @param res Response
   */
  async createImportPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      const { deckId, csvData, debug } = req.body as CreateImportPreviewDTO & { debug?: boolean };

      // Validate CSV data is provided
      if (!csvData || typeof csvData !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'CSV data is required and must be a string'
        });
        return;
      }

      // Validate deck exists and belongs to user
      const deck = await deckService.getDeckById(deckId, userId);
      if (!deck) {
        res.status(404).json({
          status: 'error',
          message: 'Deck not found'
        });
        return;
      }

      // Create import preview
      const preview = await importService.createImportPreview(userId, deckId, csvData);

      // Add a message about skipped header rows if any were detected
      const responseData = { ...preview };
      if (preview.import.summary.skippedHeaderRows?.length) {
        responseData.import.message = `${preview.import.summary.skippedHeaderRows.length} row(s) that appeared to be header duplicates were skipped.`;
      }

      // If debug mode is enabled, include the raw CSV data in the response
      const finalResponseData = debug 
        ? { ...responseData, debug: { rawCsvData: csvData.substring(0, 1000) + (csvData.length > 1000 ? '...' : '') } }
        : responseData;

      res.status(200).json({
        status: 'success',
        data: finalResponseData
      });
    } catch (error: any) {
      console.error('Error creating import preview:', error);
      
      // Determine appropriate status code based on error
      let statusCode = 400;
      let message = error.message;
      
      if (error.message.includes('CSV parsing error') || 
          error.message.includes('Invalid CSV format')) {
        statusCode = 422; // Unprocessable Entity - better for format errors
        
        // Add a more helpful message for common errors
        if (error.message.includes('Invalid Closing Quote') || 
            error.message.includes('Quoted field not terminated')) {
          message = 'Your CSV data contains quote formatting issues. Try removing quotes from your data or ensuring they are properly formatted. If you\'re using Excel, try saving as "Text (Tab delimited)" and then copy the content.';
        }
      }
      
      res.status(statusCode).json({
        status: 'error',
        message
      });
    }
  },

  /**
   * Confirm an import
   * @param req Request
   * @param res Response
   */
  async confirmImport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      const { importId } = req.body as ConfirmImportDTO;

      // Confirm import
      const result = await importService.confirmImport(importId, userId);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error: any) {
      console.error('Error confirming import:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  },

  /**
   * Cancel an import
   * @param req Request
   * @param res Response
   */
  async cancelImport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      const { importId } = req.body as ConfirmImportDTO;

      // Cancel import
      await importService.cancelImport(importId, userId);

      res.status(200).json({
        status: 'success',
        data: {
          message: 'Import cancelled successfully'
        }
      });
    } catch (error: any) {
      console.error('Error cancelling import:', error);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  },

  /**
   * Get import history for the current user
   * @param req Request
   * @param res Response
   */
  async getImportHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      // Get limit from query params (default to 10)
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      // Validate limit
      if (isNaN(limit) || limit < 1 || limit > 50) {
        res.status(400).json({
          status: 'error',
          message: 'Limit must be a number between 1 and 50'
        });
        return;
      }

      // Get import history
      const imports = await importService.getImportHistory(userId, limit);

      // Transform the response to include only relevant information
      const importHistory = imports.map(importItem => ({
        id: importItem.id,
        deckId: importItem.deckId,
        status: importItem.status,
        summary: importItem.summary,
        createdAt: importItem.createdAt,
        expiresAt: importItem.expiresAt
      }));

      res.status(200).json({
        status: 'success',
        data: {
          imports: importHistory
        }
      });
    } catch (error: any) {
      console.error('Error getting import history:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}; 