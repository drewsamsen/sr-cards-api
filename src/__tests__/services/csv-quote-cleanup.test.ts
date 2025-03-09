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

    it('should handle quotes at the end of text', () => {
      const input = 'some text here blah test. ""a part of the text in quotes"';
      const expected = 'some text here blah test. "a part of the text in quotes"';
      expect(csvService.processTextContent(input)).toBe(expected);
      
      // More complex cases
      const input2 = 'Text with ""quoted content"" and more ""quoted content at the end""';
      const expected2 = 'Text with "quoted content" and more "quoted content at the end"';
      expect(csvService.processTextContent(input2)).toBe(expected2);
      
      const input3 = 'Text ending with a quote and some content ""like this"';
      const expected3 = 'Text ending with a quote and some content "like this"';
      expect(csvService.processTextContent(input3)).toBe(expected3);
      
      const input4 = 'Text with """triple quotes at the end"""';
      const expected4 = 'Text with "triple quotes at the end"';
      expect(csvService.processTextContent(input4)).toBe(expected4);
      
      // Exact match for the user's example
      const userExample = '"some text here blah test. ""a part of the text in quotes"';
      const userExpected = 'some text here blah test. "a part of the text in quotes"';
      expect(csvService.processTextContent(userExample)).toBe(userExpected);
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

    it('should handle the user\'s specific example', () => {
      // The exact example from the user
      const input = '"some text here blah test. ""a part of the text in quotes"';
      const expected = 'some text here blah test. "a part of the text in quotes"';
      expect(csvService.processTextContent(input)).toBe(expected);
      
      // New example with inner quotes
      const innerQuoteInput = '"some text ""some inner quote" some end"';
      const innerQuoteExpected = 'some text "some inner quote" some end';
      expect(csvService.processTextContent(innerQuoteInput)).toBe(innerQuoteExpected);
      
      // More complex examples with inner quotes
      const complexInput1 = '"text with ""multiple"" ""inner quotes"" in different places"';
      const complexExpected1 = 'text with "multiple" "inner quotes" in different places';
      expect(csvService.processTextContent(complexInput1)).toBe(complexExpected1);
      
      const complexInput2 = '"text with ""inner quote at the end"""';
      const complexExpected2 = 'text with "inner quote at the end"';
      expect(csvService.processTextContent(complexInput2)).toBe(complexExpected2);
      
      const complexInput3 = '"text with """triple inner quotes""" and ""double inner quotes"""';
      const complexExpected3 = 'text with "triple inner quotes" and "double inner quotes"';
      expect(csvService.processTextContent(complexInput3)).toBe(complexExpected3);

      const complexInput4 = '"""causing or contributing to condition. """"an antibody response"""" serving to explain something or mythical terms. """"the book recounts etiological stories of the creation"""""""';
      const complexExpected4 = 'causing or contributing to condition. "an antibody response" serving to explain something or mythical terms. "the book recounts etiological stories of the creation"';
      expect(csvService.processTextContent(complexInput4)).toBe(complexExpected4);
    });

    it('should handle complex quote patterns', () => {
      // Test case with multiple quotes around 'bombastic rhetoric'
      const input = '"""adjective high-sounding but with little meaning; inflated. """"bombastic rhetoric"""""""';
      const expected = 'adjective high-sounding but with little meaning; inflated. "bombastic rhetoric"';
      expect(csvService.processTextContent(input)).toBe(expected);
      
      // Test case with multiple quotes around 'a cutting rejoinder'
      const input2 = '"""a reply, esp a sharp or witty one. """"a cutting rejoinder"""""""';
      const expected2 = 'a reply, esp a sharp or witty one. "a cutting rejoinder"';
      expect(csvService.processTextContent(input2)).toBe(expected2);
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