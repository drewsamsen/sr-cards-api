import { parse } from 'csv-parse/sync';
import { ImportError, ImportSummary, CardPreview } from '../models/import.model';
import { cardService } from './card.service';
import { supabaseAdmin } from '../config/supabase';
import { Card } from '../models/card.model';

interface ParsedCard {
  front: string;
  back: string;
  tags?: string;
  state?: string;
  due?: string;
}

// Map of alternative column names to standard names
const COLUMN_NAME_MAPPINGS = {
  front: ['front', 'question', 'prompt', 'term'],
  back: ['back', 'answer', 'response', 'definition'],
  tags: ['tags', 'categories', 'labels'],
  state: ['state', 'status'],
  due: ['due', 'duedate', 'due_date']
};

// Cache for processed text to avoid reprocessing
const processedTextCache = new Map<string, string>();

export const csvService = {
  /**
   * Parse and validate CSV data
   * @param csvData The CSV data as a string
   * @param delimiter The delimiter character (default: auto-detect)
   * @returns Object containing parsed data, preview, and summary
   */
  parseAndValidate(csvData: string, delimiter?: string): {
    parsedData: any[];
    preview: CardPreview[];
    summary: ImportSummary;
  } {
    try {
      // Auto-detect delimiter if not specified
      const detectedDelimiter = delimiter || this.detectDelimiter(csvData);
      
      // Configure CSV parser with more robust options
      const parseOptions = {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,        // Be more forgiving with quotes
        relax_column_count: true,  // Allow rows with inconsistent column counts
        escape: '\\',              // Support escaped characters
        skip_records_with_error: false, // Don't skip records with errors, we want to catch them
        delimiter: detectedDelimiter // Use the detected or specified delimiter
      };

      try {
        // Try to parse the CSV data
        const rawRecords = parse(csvData, parseOptions) as Record<string, string>[];
        
        // Filter out rows that appear to be header duplicates
        const { filteredRecords, skippedRows } = this.filterHeaderDuplicates(rawRecords);
        
        // Map column names to standard names
        const records = this.mapColumnNames(filteredRecords);
        
        // Process records and include skipped rows in the summary
        return this.processRecords(records, skippedRows);
      } catch (parseError: any) {
        console.log('Standard parsing failed, trying manual parsing:', parseError.message);
        
        // If standard parsing fails, try manual parsing
        const { records, skippedRows } = this.manualParse(csvData, detectedDelimiter);
        return this.processRecords(records, skippedRows);
      }
    } catch (error: any) {
      // Re-throw with the error message
      throw new Error(error.message);
    }
  },

  /**
   * Filter out rows that appear to be header duplicates
   * @param records The raw parsed records
   * @returns Filtered records without header duplicates and skipped row numbers
   */
  filterHeaderDuplicates(records: Record<string, string>[]): { 
    filteredRecords: Record<string, string>[]; 
    skippedRows: number[] 
  } {
    if (records.length <= 1) {
      return { filteredRecords: records, skippedRows: [] };
    }
    
    // Get the headers (keys of the first record)
    const headers = Object.keys(records[0]);
    
    // Track skipped rows for logging
    const skippedRows: number[] = [];
    
    // Filter out rows that match headers
    const filteredRecords = records.filter((record, index) => {
      // Check if this row appears to be a header duplicate
      const headerMatchCount = this.countHeaderMatches(record, headers);
      const totalFields = Object.keys(record).length;
      const matchRatio = headerMatchCount / totalFields;
      
      // If more than 50% of the fields match headers (case-insensitive), consider it a header row
      if (matchRatio >= 0.5 && headerMatchCount >= 2) {
        skippedRows.push(index + 2); // +2 for 1-indexed and header row
        return false;
      }
      
      return true;
    });
    
    // Log skipped rows if any
    if (skippedRows.length > 0) {
      console.log(`Skipped ${skippedRows.length} rows that appear to be header duplicates: rows ${skippedRows.join(', ')}`);
    }
    
    return { filteredRecords, skippedRows };
  },
  
  /**
   * Count how many values in a record match the headers (case-insensitive)
   * @param record The record to check
   * @param headers The headers to compare against
   * @returns The number of matches
   */
  countHeaderMatches(record: Record<string, string>, headers: string[]): number {
    let matchCount = 0;
    
    // Check each value in the record
    for (const [_key, value] of Object.entries(record)) {
      // Skip empty values
      if (!value || value.trim() === '') {
        continue;
      }
      
      // Check if this value matches any header (case-insensitive)
      const valueMatches = headers.some(header => 
        header.toLowerCase() === value.toLowerCase()
      );
      
      if (valueMatches) {
        matchCount++;
      }
    }
    
    return matchCount;
  },

  /**
   * Map alternative column names to standard names
   * @param records The raw parsed records
   * @returns Records with standardized column names
   */
  mapColumnNames(records: Record<string, string>[]): ParsedCard[] {
    if (records.length === 0) {
      return [];
    }
    
    // Get the first record to examine its keys
    const firstRecord = records[0];
    const keys = Object.keys(firstRecord);
    
    // Create a mapping from the actual column names to our standard names
    const columnMapping: Record<string, string> = {};
    
    // For each of our standard fields, find a matching column in the CSV
    for (const [standardField, alternativeNames] of Object.entries(COLUMN_NAME_MAPPINGS)) {
      // Find the first column name that matches one of our alternatives
      const matchingKey = keys.find(key => 
        alternativeNames.includes(key.toLowerCase())
      );
      
      if (matchingKey) {
        columnMapping[matchingKey] = standardField;
      }
    }
    
    // If we don't have mappings for required fields, throw an error
    if (!Object.values(columnMapping).includes('front') || !Object.values(columnMapping).includes('back')) {
      throw new Error('CSV must have columns for front/back content (or alternatives like Question/Answer)');
    }
    
    // Map the records to our standard format
    return records.map(record => {
      const standardRecord: Record<string, string> = {};
      
      // Map each field using our column mapping
      for (const [originalKey, value] of Object.entries(record)) {
        const standardKey = columnMapping[originalKey];
        if (standardKey) {
          standardRecord[standardKey] = value;
        }
      }
      
      return standardRecord as unknown as ParsedCard;
    });
  },

  /**
   * Process text content by formatting spaces and cleaning up quotes
   * Optimized version that consolidates multiple regex operations
   * @param text The text to process
   * @returns Processed text with proper formatting
   */
  processTextContent(text: string): string {
    if (!text) {
      return text;
    }
    
    // Check cache first
    if (processedTextCache.has(text)) {
      return processedTextCache.get(text)!;
    }
    
    // Convert triple spaces to line breaks first
    let result = text.replace(/\s{3,}/g, '\n');
    
    // Single regex to handle dictionary pattern
    result = result.replace(/^(\w+)\s+"([^"]+)\s+""([^"]+)"""\s*$/, '$1 $2 "$3"');
    
    // Remove leading triple quotes
    if (result.startsWith('"""')) {
      result = result.substring(3);
    }
    
    // Consolidated regex for handling quoted sections
    // This handles multiple patterns in one pass
    result = result
      // Handle complex pattern with multiple quoted sections
      .replace(/^(.*?)\.\s+"{4}([^"\.]+)"{4}\s+(.*?)\.\s+"{4}([^"\.]+)"{3,}$/, '$1. "$2" $3. "$4"')
      // Handle multiple quoted sections with periods in between
      .replace(/\.\s+"{4}([^"\.]+)"{4}/g, '. "$1"')
      // Handle the last quoted section which might have more trailing quotes
      .replace(/\.\s+"{4}([^"\.]+)"{3,}$/, '. "$1"')
      // Special case for the user's specific pattern
      .replace(/^"?(.*?)\.\s+""([^"]+)"$/, '$1. "$2"')
      // Handle dictionary examples pattern
      .replace(/(verb|noun)\s+"([^"]+)\.\s+""([^"]+)"""/, '$1 $2. "$3"')
      // Handle the complex case with multiple quotes around examples
      .replace(/^"?(.*?)\.\s+"{4}([^"]+)"{3,}$/, '$1. "$2"')
      // Handle triple quotes around words
      .replace(/"""([^"]+)"""/g, '"$1"')
      // Handle quadruple quotes around words
      .replace(/""""([^"]+)""""/g, '"$1"')
      // Replace doubled quotes with single quotes
      .replace(/""/g, '"')
      // Remove leading and trailing quotes
      .replace(/^"([\s\S]*)"$/, '$1')
      // Handle any remaining triple or more quotes at the end
      .replace(/"{3,}$/, '')
      // Final check for any remaining doubled quotes
      .replace(/""/g, '"');
    
    // Cache the result
    processedTextCache.set(text, result);
    
    return result;
  },

  /**
   * Convert triple spaces to line breaks in text
   * @param text The text to process
   * @returns Text with triple spaces converted to line breaks
   */
  convertTripleSpacesToLineBreaks(text: string): string {
    if (!text) {
      return text;
    }
    
    // Replace three or more consecutive spaces with a line break
    return text.replace(/\s{3,}/g, '\n');
  },

  /**
   * Handle dictionary definition pattern in text
   * @param text The text to process
   * @returns Text with dictionary pattern properly formatted
   */
  handleDictionaryPattern(text: string): string {
    if (!text) {
      return text;
    }
    
    // Handle dictionary definition pattern:
    // word "definition. ""example"""
    const dictionaryPattern = /^(\w+)\s+"([^"]+)\s+""([^"]+)"""\s*$/;
    if (dictionaryPattern.test(text)) {
      return text.replace(dictionaryPattern, '$1 $2 "$3"');
    }
    
    return text;
  },

  /**
   * Clean up quotes in text
   * @param text The text to process
   * @returns Text with quotes properly cleaned up
   */
  cleanupQuotes(text: string): string {
    if (!text) {
      return text;
    }
    
    let result = text;
    
    // Handle triple quotes around words
    result = result.replace(/"""([^"]+)"""/g, '"$1"');
    
    // Handle quadruple quotes around words
    result = result.replace(/""""([^"]+)""""/g, '"$1"');
    
    // Replace doubled quotes with single quotes
    result = result.replace(/""/g, '"');
    
    // Remove leading and trailing quotes
    result = result.replace(/^"([\s\S]*)"$/, '$1');
    
    return result;
  },

  /**
   * Process parsed records into the required format
   * @param records The parsed records
   * @param skippedRows The skipped row numbers
   * @returns Object containing processed data, preview, and summary
   */
  processRecords(records: ParsedCard[], skippedRows: number[]): {
    parsedData: any[];
    preview: CardPreview[];
    summary: ImportSummary;
  } {
    const validCards: any[] = [];
    const previewCards: CardPreview[] = [];
    const errors: ImportError[] = [];
    
    // Process in batches to avoid blocking the event loop for large imports
    const batchSize = 10;
    const totalBatches = Math.ceil(records.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, records.length);
      const batch = records.slice(startIndex, endIndex);
      
      // Process each record in the batch
      batch.forEach((record, index) => {
        const recordIndex = startIndex + index;
        const rowNumber = recordIndex + 2; // +2 because index is 0-based and we skip the header row
        
        // Process text content in both front and back fields
        if (record.front) {
          record.front = this.processTextContent(record.front);
        }
        if (record.back) {
          record.back = this.processTextContent(record.back);
        }
        
        const cardPreview: CardPreview = {
          front: record.front || '',
          back: record.back || '',
          status: 'valid'
        };

        // Process tags if present
        if (record.tags) {
          const tags = record.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          cardPreview.tags = tags;
        }

        // Validate required fields
        const validationErrors: string[] = [];
        if (!record.front || record.front.trim() === '') {
          validationErrors.push('Front side cannot be empty');
        }
        if (!record.back || record.back.trim() === '') {
          validationErrors.push('Back side cannot be empty');
        }

        // If there are validation errors, mark as invalid
        if (validationErrors.length > 0) {
          cardPreview.status = 'invalid';
          cardPreview.error = validationErrors.join(', ');
          errors.push({
            row: rowNumber,
            message: validationErrors.join(', ')
          });
        } else {
          // If valid, add to valid cards array
          validCards.push({
            front: record.front,
            back: record.back,
            tags: cardPreview.tags || [],
            state: record.state ? parseInt(record.state, 10) : 0,
            due: record.due || null
          });
        }

        // Add to preview array (limit to first 10 for preview)
        if (previewCards.length < 10) {
          previewCards.push(cardPreview);
        }
      });
    }

    // Create summary
    const summary: ImportSummary = {
      totalRows: records.length,
      validRows: validCards.length,
      invalidRows: records.length - validCards.length,
      errors: errors.length > 0 ? errors : undefined,
      skippedHeaderRows: skippedRows.length > 0 ? skippedRows : undefined
    };

    return {
      parsedData: validCards,
      preview: previewCards,
      summary
    };
  },

  /**
   * Manual parsing for problematic CSV/TSV data
   * @param csvData The CSV data as a string
   * @param delimiter The delimiter character
   * @returns Array of parsed records and skipped row numbers
   */
  manualParse(csvData: string, delimiter: string): { 
    records: ParsedCard[]; 
    skippedRows: number[] 
  } {
    // Split into lines
    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      return { records: [], skippedRows: [] };
    }
    
    // Get headers from first line
    const headers = lines[0].split(delimiter).map(header => header.trim().toLowerCase());
    
    // Map headers to standard field names
    const standardizedHeaders: string[] = headers.map(header => {
      // Check each standard field for matching alternative names
      for (const [standardField, alternativeNames] of Object.entries(COLUMN_NAME_MAPPINGS)) {
        if (alternativeNames.includes(header)) {
          return standardField;
        }
      }
      return header; // Keep original if no mapping found
    });
    
    // Find indices for required fields
    const frontIndex = standardizedHeaders.indexOf('front');
    const backIndex = standardizedHeaders.indexOf('back');
    const tagsIndex = standardizedHeaders.indexOf('tags');
    const stateIndex = standardizedHeaders.indexOf('state');
    const dueIndex = standardizedHeaders.indexOf('due');
    
    // Validate required headers
    if (frontIndex === -1 || backIndex === -1) {
      throw new Error('CSV must have columns for front/back content (or alternatives like Question/Answer)');
    }
    
    // Parse data rows
    const records: ParsedCard[] = [];
    const skippedRows: number[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple split by delimiter (this is a fallback, so we're not handling quotes perfectly)
      const fields = line.split(delimiter);
      
      // Check if this row appears to be a header duplicate
      const headerMatchCount = this.countHeaderMatchesForManualParse(fields, headers);
      const matchRatio = headerMatchCount / fields.length;
      
      // If more than 50% of the fields match headers (case-insensitive), consider it a header row
      if (matchRatio >= 0.5 && headerMatchCount >= 2) {
        skippedRows.push(i + 1); // +1 for 1-indexed
        continue; // Skip this row
      }
      
      const record: ParsedCard = {
        front: fields[frontIndex]?.trim() || '',
        back: fields[backIndex]?.trim() || ''
      };
      
      // Add optional fields if they exist
      if (tagsIndex !== -1 && fields[tagsIndex]) {
        record.tags = fields[tagsIndex].trim();
      }
      
      if (stateIndex !== -1 && fields[stateIndex]) {
        record.state = fields[stateIndex].trim();
      }
      
      if (dueIndex !== -1 && fields[dueIndex]) {
        record.due = fields[dueIndex].trim();
      }
      
      records.push(record);
    }
    
    // Log skipped rows if any
    if (skippedRows.length > 0) {
      console.log(`Manual parser skipped ${skippedRows.length} rows that appear to be header duplicates: rows ${skippedRows.join(', ')}`);
    }
    
    return { records, skippedRows };
  },
  
  /**
   * Count how many values in a row match the headers (case-insensitive) for manual parsing
   * @param fields The fields in the row
   * @param headers The headers to compare against
   * @returns The number of matches
   */
  countHeaderMatchesForManualParse(fields: string[], headers: string[]): number {
    let matchCount = 0;
    
    // Check each field in the row
    for (let i = 0; i < fields.length; i++) {
      const value = fields[i]?.trim();
      
      // Skip empty values
      if (!value) {
        continue;
      }
      
      // Check if this value matches any header (case-insensitive)
      const valueMatches = headers.some(header => 
        header.toLowerCase() === value.toLowerCase()
      );
      
      if (valueMatches) {
        matchCount++;
      }
    }
    
    return matchCount;
  },

  /**
   * Detect the delimiter used in the CSV data
   * @param csvData The CSV data as a string
   * @returns The detected delimiter (comma, tab, or semicolon)
   */
  detectDelimiter(csvData: string): string {
    // Get the first line of the CSV data
    const firstLine = csvData.split(/\r?\n/)[0] || '';
    
    // Count occurrences of potential delimiters
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    // Return the delimiter with the highest count
    if (tabCount > commaCount && tabCount > semicolonCount) {
      return '\t'; // Tab
    } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
      return ';'; // Semicolon
    } else {
      return ','; // Default to comma
    }
  },

  /**
   * Sanitize CSV data
   * @param csvData The CSV data as a string
   * @returns Sanitized CSV data
   */
  sanitizeCsvData(csvData: string): string {
    // Remove BOM if present
    if (csvData.charCodeAt(0) === 0xFEFF) {
      csvData = csvData.slice(1);
    }
    
    // Ensure line endings are consistent
    csvData = csvData.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    return csvData;
  },

  /**
   * Check for duplicate cards in a batch
   * @param parsedData The parsed card data
   * @param deckId The deck ID
   * @param userId The user ID
   * @returns Array of cards with duplicate status
   */
  async checkForDuplicates(parsedData: any[], deckId: string, userId: string): Promise<{
    cards: CardPreview[];
    duplicateCount: number;
    duplicateDetails: any[];
  }> {
    const cards: CardPreview[] = [];
    let duplicateCount = 0;
    const duplicateDetails: any[] = [];

    try {
      // Fetch all existing cards in the deck at once
      const { data: existingCards, error } = await supabaseAdmin
        .from('cards')
        .select('id, front')
        .eq('deck_id', deckId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Create a map of normalized card fronts for faster lookups
      const normalizedExistingCards = new Map<string, { id: string, front: string }>();
      
      existingCards.forEach((card: { id: string, front: string }) => {
        // Normalize the card front text
        const normalizedFront = this.normalizeTextForComparison(card.front);
        const simplifiedFront = this.simplifyTextForComparison(normalizedFront);
        
        // Store both normalized and simplified versions for different matching strategies
        normalizedExistingCards.set(normalizedFront, card);
        normalizedExistingCards.set(simplifiedFront, card);
      });

      // Process each card in the import data
      for (let i = 0; i < parsedData.length; i++) {
        const card = parsedData[i];
        
        // Create the card preview
        const cardPreview: CardPreview = {
          front: card.front,
          back: card.back,
          status: 'valid'
        };
        
        if (card.tags) {
          cardPreview.tags = Array.isArray(card.tags) ? card.tags : [card.tags];
        }
        
        // Only check for duplicates if the card is valid
        if (cardPreview.status === 'valid' && card.front && card.front.trim() !== '') {
          // Normalize the card front for comparison
          const normalizedFront = this.normalizeTextForComparison(card.front);
          const simplifiedFront = this.simplifyTextForComparison(normalizedFront);
          
          // Check for exact matches first (faster)
          let isDuplicate = normalizedExistingCards.has(normalizedFront) || 
                           normalizedExistingCards.has(simplifiedFront);
          
          // If no exact match, check for fuzzy matches (more expensive)
          if (!isDuplicate && card.front.length > 3) {
            isDuplicate = this.hasFuzzyMatch(
              simplifiedFront, 
              existingCards.map((c: { id: string, front: string }) => 
                this.simplifyTextForComparison(this.normalizeTextForComparison(c.front))
              )
            );
          }
          
          if (isDuplicate) {
            duplicateCount++;
            cardPreview.status = 'invalid';
            
            // Find the matching card for the error message
            let matchingCard: { id: string, front: string } | undefined;
            if (normalizedExistingCards.has(normalizedFront)) {
              matchingCard = normalizedExistingCards.get(normalizedFront);
            } else if (normalizedExistingCards.has(simplifiedFront)) {
              matchingCard = normalizedExistingCards.get(simplifiedFront);
            } else {
              // Find the fuzzy match
              matchingCard = existingCards.find((c: { id: string, front: string }) => 
                this.isFuzzyMatch(
                  simplifiedFront, 
                  this.simplifyTextForComparison(this.normalizeTextForComparison(c.front))
                )
              );
            }
            
            cardPreview.error = `Duplicate card: Similar to existing card "${matchingCard?.front || 'Unknown card'}"`;
            
            duplicateDetails.push({
              row: i + 2, // +2 because index is 0-based and we skip the header row
              cardFront: card.front,
              existingCardFront: matchingCard?.front || 'Unknown card'
            });
          }
        }
        
        cards.push(cardPreview);
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // In case of error, return cards without duplicate checking
      return {
        cards: parsedData.map(card => ({
          front: card.front,
          back: card.back,
          tags: card.tags ? (Array.isArray(card.tags) ? card.tags : [card.tags]) : undefined,
          status: 'valid'
        })),
        duplicateCount: 0,
        duplicateDetails: []
      };
    }

    return {
      cards,
      duplicateCount,
      duplicateDetails
    };
  },
  
  /**
   * Normalize text for comparison by converting to lowercase and trimming
   * @param text The text to normalize
   * @returns Normalized text
   */
  normalizeTextForComparison(text: string): string {
    return text.trim().toLowerCase();
  },
  
  /**
   * Simplify text for comparison by removing punctuation and extra whitespace
   * @param text The text to simplify
   * @returns Simplified text
   */
  simplifyTextForComparison(text: string): string {
    return text.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  },
  
  /**
   * Check if there's a fuzzy match for the text in the array of existing texts
   * @param text The text to check
   * @param existingTexts Array of existing texts to compare against
   * @returns Whether a fuzzy match was found
   */
  hasFuzzyMatch(text: string, existingTexts: string[]): boolean {
    return existingTexts.some(existingText => this.isFuzzyMatch(text, existingText));
  },
  
  /**
   * Check if two texts are fuzzy matches using Levenshtein distance
   * @param text1 First text
   * @param text2 Second text
   * @returns Whether the texts are fuzzy matches
   */
  isFuzzyMatch(text1: string, text2: string): boolean {
    // Only check if the lengths are reasonably close to avoid unnecessary computation
    if (Math.abs(text1.length - text2.length) > 3) {
      return false;
    }
    
    // For very short strings, require exact match
    if (text1.length <= 3 || text2.length <= 3) {
      return text1 === text2;
    }
    
    // For longer strings, use Levenshtein distance
    // Use a more conservative threshold for fuzzy matching
    const distance = cardService.levenshteinDistance(text1, text2);
    const threshold = Math.min(2, Math.floor(text1.length * 0.15)); // 15% of length or at most 2
    
    return distance <= threshold;
  },

  /**
   * Detect duplicates within the parsed data itself
   * @param parsedData The parsed card data
   * @returns Object containing deduplicated data and duplicate details
   */
  detectInternalDuplicates(parsedData: any[]): {
    deduplicatedData: any[];
    internalDuplicates: {
      count: number;
      details: { originalIndex: number; duplicateIndex: number; cardFront: string }[];
    };
  } {
    const normalizedMap = new Map<string, { index: number; card: any }>();
    const simplifiedMap = new Map<string, { index: number; card: any }>();
    const deduplicatedData: any[] = [];
    const duplicateDetails: { originalIndex: number; duplicateIndex: number; cardFront: string }[] = [];
    let duplicateCount = 0;
    
    // Process each card
    for (let index = 0; index < parsedData.length; index++) {
      const card = parsedData[index];
      
      // Skip cards with empty fronts
      if (!card.front || card.front.trim() === '') {
        deduplicatedData.push(card);
        continue;
      }
      
      const normalizedFront = this.normalizeTextForComparison(card.front);
      const simplifiedFront = this.simplifyTextForComparison(normalizedFront);
      
      // Check for duplicates
      let isDuplicate = false;
      let originalIndex = -1;
      
      // Check for exact matches
      if (normalizedMap.has(normalizedFront)) {
        isDuplicate = true;
        originalIndex = normalizedMap.get(normalizedFront)!.index;
      }
      // Check for simplified matches
      else if (simplifiedMap.has(simplifiedFront)) {
        isDuplicate = true;
        originalIndex = simplifiedMap.get(simplifiedFront)!.index;
      }
      // Check for fuzzy matches
      else {
        for (const [existingFront, existingCard] of simplifiedMap.entries()) {
          if (this.isFuzzyMatch(simplifiedFront, existingFront)) {
            isDuplicate = true;
            originalIndex = existingCard.index;
            break;
          }
        }
      }
      
      if (isDuplicate) {
        duplicateCount++;
        duplicateDetails.push({
          originalIndex,
          duplicateIndex: index,
          cardFront: card.front
        });
      } else {
        // Not a duplicate, add to maps and deduplicated data
        normalizedMap.set(normalizedFront, { index, card });
        simplifiedMap.set(simplifiedFront, { index, card });
        deduplicatedData.push(card);
      }
    }
    
    return {
      deduplicatedData,
      internalDuplicates: {
        count: duplicateCount,
        details: duplicateDetails
      }
    };
  }
}; 