import { parse } from 'csv-parse/sync';
import { ImportError, ImportSummary, CardPreview } from '../models/import.model';

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
      
      // Try to parse with standard CSV parser first
      try {
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

        // Try to parse the CSV data
        const rawRecords = parse(csvData, parseOptions) as Record<string, string>[];
        
        // Map column names to standard names
        const records = this.mapColumnNames(rawRecords);
        
        return this.processRecords(records);
      } catch (parseError: any) {
        console.log('Standard parsing failed, trying manual parsing:', parseError.message);
        
        // If standard parsing fails, try manual parsing
        const records = this.manualParse(csvData, detectedDelimiter);
        return this.processRecords(records);
      }
    } catch (error: any) {
      // Re-throw with the error message
      throw new Error(error.message);
    }
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
   * Process parsed records into the required format
   * @param records The parsed records
   * @returns Object containing processed data, preview, and summary
   */
  processRecords(records: ParsedCard[]): {
    parsedData: any[];
    preview: CardPreview[];
    summary: ImportSummary;
  } {
    const validCards: any[] = [];
    const previewCards: CardPreview[] = [];
    const errors: ImportError[] = [];

    // Validate each row
    records.forEach((record, index) => {
      const rowNumber = index + 2; // +2 because index is 0-based and we skip the header row
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

    // Create summary
    const summary: ImportSummary = {
      totalRows: records.length,
      validRows: validCards.length,
      invalidRows: records.length - validCards.length,
      errors: errors.length > 0 ? errors : undefined
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
   * @returns Array of parsed records
   */
  manualParse(csvData: string, delimiter: string): ParsedCard[] {
    // Split into lines
    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      return [];
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
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple split by delimiter (this is a fallback, so we're not handling quotes perfectly)
      const fields = line.split(delimiter);
      
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
    
    return records;
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
   * Sanitize CSV data to fix common issues
   * @param csvData The raw CSV data
   * @returns Sanitized CSV data
   */
  sanitizeCsvData(csvData: string): string {
    // Replace any lone \r with \n (normalize line endings)
    let sanitized = csvData.replace(/\r(?!\n)/g, '\n');
    
    // Remove any BOM (Byte Order Mark) characters
    sanitized = sanitized.replace(/^\ufeff/, '');
    
    // Ensure the CSV has a header row
    if (!sanitized.trim().length) {
      return 'front\tback\ttags';
    }
    
    return sanitized;
  }
}; 