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
}); 