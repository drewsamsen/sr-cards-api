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
    for (const [key, value] of Object.entries(record)) {
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