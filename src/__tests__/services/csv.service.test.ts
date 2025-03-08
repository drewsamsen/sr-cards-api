import { csvService } from '../../services/csv.service';

describe('CSV Service', () => {
  describe('convertTripleSpacesToLineBreaks', () => {
    it('should convert triple spaces to line breaks', () => {
      const input = 'VER-i-si-MIL-i-tude   noun. the appearance of being true or real   "the detail gives the novel some verisimilitude"';
      const expected = 'VER-i-si-MIL-i-tude\nnoun. the appearance of being true or real\n"the detail gives the novel some verisimilitude"';
      
      const result = csvService.convertTripleSpacesToLineBreaks(input);
      
      expect(result).toEqual(expected);
    });
    
    it('should handle empty strings', () => {
      expect(csvService.convertTripleSpacesToLineBreaks('')).toEqual('');
      expect(csvService.convertTripleSpacesToLineBreaks(null as any)).toEqual(null);
      expect(csvService.convertTripleSpacesToLineBreaks(undefined as any)).toEqual(undefined);
    });
    
    it('should not convert one or two spaces', () => {
      expect(csvService.convertTripleSpacesToLineBreaks('one space')).toEqual('one space');
      expect(csvService.convertTripleSpacesToLineBreaks('two  spaces')).toEqual('two  spaces');
    });
    
    it('should convert more than three spaces to a single line break', () => {
      expect(csvService.convertTripleSpacesToLineBreaks('three   spaces')).toEqual('three\nspaces');
      expect(csvService.convertTripleSpacesToLineBreaks('four    spaces')).toEqual('four\nspaces');
      expect(csvService.convertTripleSpacesToLineBreaks('five     spaces')).toEqual('five\nspaces');
    });
    
    it('should convert multiple occurrences of triple spaces', () => {
      const input = 'first   second   third';
      const expected = 'first\nsecond\nthird';
      
      expect(csvService.convertTripleSpacesToLineBreaks(input)).toEqual(expected);
    });
    
    it('should remove leading and trailing quotes', () => {
      const input = '"This is quoted text"';
      const expected = 'This is quoted text';
      
      expect(csvService.convertTripleSpacesToLineBreaks(input)).toEqual(expected);
    });
    
    it('should replace doubled quotes with single quotes', () => {
      const input = 'Text with ""doubled quotes""';
      const expected = 'Text with "doubled quotes"';
      
      expect(csvService.convertTripleSpacesToLineBreaks(input)).toEqual(expected);
    });
    
    it('should handle both triple spaces and quotes', () => {
      const input = '"VER-i-si-MIL-i-tude   noun. the appearance of being true or real   ""the detail gives the novel some verisimilitude"""';
      const expected = 'VER-i-si-MIL-i-tude\nnoun. the appearance of being true or real\n"the detail gives the novel some verisimilitude"';
      
      const result = csvService.convertTripleSpacesToLineBreaks(input);
      
      expect(result).toEqual(expected);
    });
  });
}); 