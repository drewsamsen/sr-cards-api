import { supabaseAdmin } from '../config/supabase';
import { Import, ImportDB, ImportSummary, CardPreview, ImportPreviewResponse, ImportResultResponse } from '../models/import.model';
import { csvService } from './csv.service';
import { cardService } from './card.service';
import { snakeToCamelObject, camelToSnakeObject } from '../utils';

export const importService = {
  /**
   * Create an import preview
   * @param userId The user ID
   * @param deckId The deck ID
   * @param csvData The CSV data as a string
   * @returns The import preview response
   */
  async createImportPreview(userId: string, deckId: string, csvData: string): Promise<ImportPreviewResponse> {
    try {
      // Sanitize CSV data first
      const sanitizedCsvData = csvService.sanitizeCsvData(csvData);
      
      // Parse and validate CSV data with tab delimiter
      const { parsedData: initialParsedData, preview: _initialPreview, summary: initialSummary } = csvService.parseAndValidate(sanitizedCsvData);

      // Detect and handle duplicates within the import file itself
      const { deduplicatedData, internalDuplicates } = csvService.detectInternalDuplicates(initialParsedData);
      
      // Check for duplicates against existing cards in the database
      const { cards: previewWithDuplicates, duplicateCount, duplicateDetails } = 
        await csvService.checkForDuplicates(deduplicatedData, deckId, userId);
      
      // Filter out duplicates from the preview array and take up to 10 valid cards
      const validCards = previewWithDuplicates.filter(card => card.status === 'valid');
      const invalidNonDuplicates = previewWithDuplicates.filter(
        card => card.status === 'invalid' && !card.error?.includes('Duplicate card')
      );
      
      // Combine valid cards and invalid non-duplicates, prioritizing valid cards
      const preview = [...validCards, ...invalidNonDuplicates].slice(0, 10);
      
      // Update summary with duplicate information
      const summary: ImportSummary = {
        ...initialSummary,
        totalRows: initialParsedData.length,
        validRows: deduplicatedData.length - duplicateCount,
        invalidRows: initialSummary.invalidRows,
        duplicateCards: duplicateCount + internalDuplicates.count,
        duplicateDetails: duplicateDetails.length > 0 ? duplicateDetails : undefined,
        internalDuplicates: internalDuplicates.count > 0 ? {
          count: internalDuplicates.count,
          details: internalDuplicates.details.map(detail => ({
            row: detail.duplicateIndex + 2, // +2 because index is 0-based and we skip the header row
            cardFront: detail.cardFront,
            originalRow: detail.originalIndex + 2 // +2 for the same reason
          }))
        } : undefined
      };

      // Create a new import record
      const importData = {
        user_id: userId,
        deck_id: deckId,
        status: 'pending',
        csv_data: sanitizedCsvData,
        parsed_data: deduplicatedData, // Store deduplicated data
        summary
      };

      // Insert into the database
      const { data, error } = await supabaseAdmin
        .from('imports')
        .insert(importData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Convert to camelCase
      const importRecord = snakeToCamelObject(data) as Import;

      // Return the preview response
      return {
        import: {
          id: importRecord.id,
          deckId: importRecord.deckId,
          status: importRecord.status,
          summary: importRecord.summary,
          expiresAt: importRecord.expiresAt
        },
        preview
      };
    } catch (error: any) {
      console.error('Error creating import preview:', error);
      throw error;
    }
  },

  /**
   * Get an import by ID
   * @param importId The import ID
   * @param userId The user ID
   * @returns The import or null if not found
   */
  async getImportById(importId: string, userId: string): Promise<Import | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('imports')
        .select('*')
        .eq('id', importId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No import found
          return null;
        }
        throw error;
      }

      return snakeToCamelObject(data) as Import;
    } catch (error: any) {
      console.error('Error getting import:', error);
      throw error;
    }
  },

  /**
   * Confirm an import
   * @param importId The import ID
   * @param userId The user ID
   * @returns The import result response
   */
  async confirmImport(importId: string, userId: string): Promise<ImportResultResponse> {
    try {
      // Get the import
      const importRecord = await this.getImportById(importId, userId);
      if (!importRecord) {
        throw new Error('Import not found');
      }

      // Check if the import is still pending
      if (importRecord.status !== 'pending') {
        throw new Error(`Import cannot be confirmed because it is ${importRecord.status}`);
      }

      // Check if the import has expired
      const expiresAt = new Date(importRecord.expiresAt);
      if (expiresAt < new Date()) {
        throw new Error('Import has expired');
      }

      // Get the parsed data and summary from the import record
      // Note: parsedData is already deduplicated from internal duplicates during preview
      const { parsedData, summary } = importRecord;
      
      // Filter out cards that were already identified as duplicates during preview
      // This eliminates the need to check for duplicates again
      const validCards = parsedData.filter((card: any) => {
        // If the card was marked as a duplicate in the preview, skip it
        const isDuplicate = summary.duplicateDetails?.some(
          (detail) => detail.cardFront === card.front
        );
        return !isDuplicate;
      });
      
      // Prepare cards for a single bulk insert
      const cardsToInsert = validCards.map((card: any) => ({
        user_id: userId,
        deck_id: importRecord.deckId,
        front: card.front,
        back: card.back
      }));
      
      // Track success and failure counts
      let successCount = 0;
      let failureCount = 0;
      const errors: any[] = [];
      
      // If there are cards to insert, do a bulk insert
      if (cardsToInsert.length > 0) {
        try {
          // Perform a single bulk insert operation for all cards
          const { data, error } = await supabaseAdmin
            .from('cards')
            .insert(cardsToInsert)
            .select('id');
          
          if (error) {
            console.error('Bulk insert failed:', error);
            failureCount = cardsToInsert.length;
            errors.push({
              message: `Bulk insert failed: ${error.message}`
            });
          } else {
            // Bulk insert succeeded
            successCount = data.length;
          }
        } catch (bulkError: any) {
          console.error('Error during bulk insert:', bulkError);
          failureCount = cardsToInsert.length;
          errors.push({
            message: `Bulk insert failed: ${bulkError.message}`
          });
        }
      }

      // Update the import status
      const updatedSummary: ImportSummary = {
        ...summary,
        validRows: successCount,
        invalidRows: failureCount,
        errors: errors.length > 0 ? errors : undefined
      };

      const { data, error } = await supabaseAdmin
        .from('imports')
        .update({
          status: failureCount > 0 ? 'failed' : 'completed',
          summary: updatedSummary
        })
        .eq('id', importId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Return the result
      const result = snakeToCamelObject(data) as Import;
      return {
        importId: result.id,
        status: result.status,
        summary: result.summary
      };
    } catch (error: any) {
      console.error('Error confirming import:', error);
      throw error;
    }
  },

  /**
   * Cancel an import
   * @param importId The import ID
   * @param userId The user ID
   * @returns True if cancelled successfully
   */
  async cancelImport(importId: string, userId: string): Promise<boolean> {
    try {
      // Get the import
      const importRecord = await this.getImportById(importId, userId);
      if (!importRecord) {
        throw new Error('Import not found');
      }

      // Check if the import is still pending
      if (importRecord.status !== 'pending') {
        throw new Error(`Import cannot be cancelled because it is ${importRecord.status}`);
      }

      // Update the import status
      const { error } = await supabaseAdmin
        .from('imports')
        .update({ status: 'cancelled' })
        .eq('id', importId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error('Error cancelling import:', error);
      throw error;
    }
  },

  /**
   * Get import history for a user
   * @param userId The user ID
   * @param limit Maximum number of imports to return (default: 10)
   * @returns Array of import history items
   */
  async getImportHistory(userId: string, limit: number = 10): Promise<Import[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('imports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Convert to camelCase
      return (data || []).map(item => snakeToCamelObject(item) as Import);
    } catch (error: any) {
      console.error('Error getting import history:', error);
      throw error;
    }
  }
}; 