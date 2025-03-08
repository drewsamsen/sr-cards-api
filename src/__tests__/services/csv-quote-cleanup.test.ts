import { csvService } from '../../services/csv.service';

describe('CSV Service - Text Processing', () => {
  describe('processTextContent', () => {
    it('should handle null or empty input', () => {
      expect(csvService.processTextContent(null as any)).toBe(null);
      expect(csvService.processTextContent('')).toBe('');
      expect(csvService.processTextContent(undefined as any)).toBe(undefined);
    });

    it('should process text content correctly', () => {
      // Test the full processing pipeline
      const input = 'verb "persuade (someone) that an idea or belief is mistaken. ""he quickly disabused me of my fanciful notions"""';
      const expected = 'verb persuade (someone) that an idea or belief is mistaken. "he quickly disabused me of my fanciful notions"';
      expect(csvService.processTextContent(input)).toBe(expected);
      
      const input2 = 'hello   """world"""';
      const expected2 = 'hello\n"world"';
      expect(csvService.processTextContent(input2)).toBe(expected2);
    });

    it('should handle real-world examples from dictionary imports', () => {
      const examples = [
        {
          input: 'verb "make (something) suitable for a new use or purpose; modify. ""buildings are being adapted for use by the disabled"""',
          expected: 'verb make (something) suitable for a new use or purpose; modify. "buildings are being adapted for use by the disabled"'
        },
        {
          input: 'noun "a person who publicly supports or recommends a particular cause or policy. ""he was an untiring advocate of economic reform"""',
          expected: 'noun a person who publicly supports or recommends a particular cause or policy. "he was an untiring advocate of economic reform"'
        },
        {
          input: 'verb "put forward (an idea or plan). ""they advocated an ethical foreign policy"""',
          expected: 'verb put forward (an idea or plan). "they advocated an ethical foreign policy"'
        }
      ];

      examples.forEach(example => {
        expect(csvService.processTextContent(example.input)).toBe(example.expected);
      });
    });
  });

  describe('convertTripleSpacesToLineBreaks', () => {
    it('should handle null or empty input', () => {
      expect(csvService.convertTripleSpacesToLineBreaks(null as any)).toBe(null);
      expect(csvService.convertTripleSpacesToLineBreaks('')).toBe('');
      expect(csvService.convertTripleSpacesToLineBreaks(undefined as any)).toBe(undefined);
    });

    it('should convert triple spaces to line breaks', () => {
      expect(csvService.convertTripleSpacesToLineBreaks('hello   world')).toBe('hello\nworld');
      expect(csvService.convertTripleSpacesToLineBreaks('hello    world')).toBe('hello\nworld');
      expect(csvService.convertTripleSpacesToLineBreaks('hello     world')).toBe('hello\nworld');
    });
  });

  describe('handleDictionaryPattern', () => {
    it('should handle null or empty input', () => {
      expect(csvService.handleDictionaryPattern(null as any)).toBe(null);
      expect(csvService.handleDictionaryPattern('')).toBe('');
      expect(csvService.handleDictionaryPattern(undefined as any)).toBe(undefined);
    });

    it('should handle the specific pattern with dictionary definitions and examples', () => {
      const input = 'verb "persuade (someone) that an idea or belief is mistaken. ""he quickly disabused me of my fanciful notions"""';
      const expected = 'verb persuade (someone) that an idea or belief is mistaken. "he quickly disabused me of my fanciful notions"';
      expect(csvService.handleDictionaryPattern(input)).toBe(expected);
      
      const input2 = 'noun "a feeling of expectation and desire for a certain thing to happen. ""I waited with bated breath"""';
      const expected2 = 'noun a feeling of expectation and desire for a certain thing to happen. "I waited with bated breath"';
      expect(csvService.handleDictionaryPattern(input2)).toBe(expected2);
    });

    it('should return the input unchanged if it does not match the dictionary pattern', () => {
      const input = 'This is a regular sentence without the dictionary pattern.';
      expect(csvService.handleDictionaryPattern(input)).toBe(input);
    });
  });

  describe('cleanupQuotes', () => {
    it('should handle null or empty input', () => {
      expect(csvService.cleanupQuotes(null as any)).toBe(null);
      expect(csvService.cleanupQuotes('')).toBe('');
      expect(csvService.cleanupQuotes(undefined as any)).toBe(undefined);
    });

    it('should remove leading and trailing quotes', () => {
      expect(csvService.cleanupQuotes('"hello world"')).toBe('hello world');
    });

    it('should replace doubled quotes with single quotes', () => {
      expect(csvService.cleanupQuotes('hello ""world""')).toBe('hello "world"');
    });

    it('should handle multiple consecutive quotes', () => {
      expect(csvService.cleanupQuotes('hello """world"""')).toBe('hello "world"');
      expect(csvService.cleanupQuotes('hello """"world""""')).toBe('hello "world"');
    });
  });
}); 