import { csvService } from '../../services/csv.service';

describe('CSV Service', () => {
  describe('convertTripleSpacesToLineBreaks', () => {
    it('should handle null or empty input', () => {
      expect(csvService.convertTripleSpacesToLineBreaks(null as any)).toBe(null);
      expect(csvService.convertTripleSpacesToLineBreaks('')).toBe('');
    });
    
    it('should convert triple spaces to line breaks', () => {
      const input = 'hello   world';
      const expected = 'hello\nworld';
      
      expect(csvService.convertTripleSpacesToLineBreaks(input)).toEqual(expected);
    });
    
    it('should convert multiple occurrences of triple spaces', () => {
      const input = 'first   second   third';
      const expected = 'first\nsecond\nthird';
      
      expect(csvService.convertTripleSpacesToLineBreaks(input)).toEqual(expected);
    });
  });
  
  describe('processTextContent', () => {
    it('should remove leading and trailing quotes', () => {
      const input = '"This is quoted text"';
      const expected = 'This is quoted text';
      
      expect(csvService.processTextContent(input)).toEqual(expected);
    });
    
    it('should replace doubled quotes with single quotes', () => {
      const input = 'Text with ""doubled quotes""';
      const expected = 'Text with "doubled quotes"';
      
      expect(csvService.processTextContent(input)).toEqual(expected);
    });
    
    it('should handle both triple spaces and quotes', () => {
      const input = '"VER-i-si-MIL-i-tude   noun. the appearance of being true or real   ""the detail gives the novel some verisimilitude"""';
      const expected = 'VER-i-si-MIL-i-tude\nnoun. the appearance of being true or real\n"the detail gives the novel some verisimilitude"';
      
      const result = csvService.processTextContent(input);
      
      expect(result).toEqual(expected);
    });
  });
  
  describe('detectInternalDuplicates', () => {
    it('should detect exact duplicates within parsed data', () => {
      const parsedData = [
        { front: 'Card 1', back: 'Back 1' },
        { front: 'Card 2', back: 'Back 2' },
        { front: 'Card 1', back: 'Back 3' }, // Duplicate of first card
        { front: 'Card 3', back: 'Back 3' }
      ];
      
      const result = csvService.detectInternalDuplicates(parsedData);
      
      // The deduplicated data should have the unique cards (first occurrence of each)
      expect(result.deduplicatedData.length).toBe(3); // Card 1, Card 2, Card 3
      expect(result.internalDuplicates.count).toBe(1); // Should detect 1 duplicate
      expect(result.internalDuplicates.details.length).toBe(1);
      expect(result.internalDuplicates.details[0].originalIndex).toBe(0); // Original is at index 0
      expect(result.internalDuplicates.details[0].duplicateIndex).toBe(2); // Duplicate is at index 2
    });
    
    it('should detect case-insensitive duplicates', () => {
      const parsedData = [
        { front: 'Card One', back: 'Back 1' },
        { front: 'card one', back: 'Back 2' }, // Case-insensitive duplicate
        { front: 'Card Three', back: 'Back 3' }
      ];
      
      const result = csvService.detectInternalDuplicates(parsedData);
      
      expect(result.deduplicatedData.length).toBe(2);
      expect(result.internalDuplicates.count).toBe(1);
    });
    
    it('should detect duplicates with different punctuation', () => {
      const parsedData = [
        { front: 'What is JavaScript?', back: 'A programming language' },
        { front: 'What is JavaScript', back: 'A programming language' }, // Same without question mark
        { front: 'What is HTML?', back: 'Hypertext Markup Language' }
      ];
      
      const result = csvService.detectInternalDuplicates(parsedData);
      
      expect(result.deduplicatedData.length).toBe(2);
      expect(result.internalDuplicates.count).toBe(1);
    });
    
    it('should detect fuzzy duplicates', () => {
      const parsedData = [
        { front: 'What is JavaScript?', back: 'A programming language' },
        { front: 'What is javascrpt?', back: 'A programming language' }, // Typo in JavaScript
        { front: 'What is HTML?', back: 'Hypertext Markup Language' }
      ];
      
      const result = csvService.detectInternalDuplicates(parsedData);
      
      expect(result.deduplicatedData.length).toBe(2);
      expect(result.internalDuplicates.count).toBe(1);
    });
    
    it('should handle empty fronts', () => {
      const parsedData = [
        { front: '', back: 'Back 1' },
        { front: 'Card 2', back: 'Back 2' },
        { front: '', back: 'Back 3' } // Empty front should not be considered a duplicate
      ];
      
      const result = csvService.detectInternalDuplicates(parsedData);
      
      // Both empty cards should be included since they're not valid cards anyway
      expect(result.deduplicatedData.length).toBe(3);
      expect(result.internalDuplicates.count).toBe(0);
    });
  });
}); 