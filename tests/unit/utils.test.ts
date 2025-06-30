import { describe, it, expect } from '@jest/globals';

describe('Utility Functions', () => {
  describe('Date Filtering', () => {
    it('should compare ISO date strings correctly', () => {
      const date1 = '2025-06-30T10:00:00.000Z';
      const date2 = '2025-06-30T11:00:00.000Z';
      const date3 = '2025-06-29T10:00:00.000Z';
      
      // String comparison should work for ISO dates
      expect(date2 > date1).toBe(true);
      expect(date1 > date3).toBe(true);
      expect(date3 < date1).toBe(true);
    });

    it('should handle date range filtering', () => {
      const entries = [
        { timestamp: '2025-06-30T09:00:00.000Z', content: 'entry1' },
        { timestamp: '2025-06-30T10:00:00.000Z', content: 'entry2' },
        { timestamp: '2025-06-30T11:00:00.000Z', content: 'entry3' },
      ];
      
      const startDate = '2025-06-30T09:30:00.000Z';
      const endDate = '2025-06-30T10:30:00.000Z';
      
      const filtered = entries.filter(entry => 
        entry.timestamp >= startDate && entry.timestamp <= endDate
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].content).toBe('entry2');
    });
  });

  describe('Array Sorting', () => {
    it('should sort entries by timestamp descending', () => {
      const entries = [
        { timestamp: '2025-06-30T09:00:00.000Z', id: 'entry1' },
        { timestamp: '2025-06-30T11:00:00.000Z', id: 'entry3' },
        { timestamp: '2025-06-30T10:00:00.000Z', id: 'entry2' },
      ];
      
      const sorted = entries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      expect(sorted[0].id).toBe('entry3');
      expect(sorted[1].id).toBe('entry2');
      expect(sorted[2].id).toBe('entry1');
    });
  });

  describe('String Processing', () => {
    it('should handle case-insensitive search', () => {
      const content = 'Fix the bug in the authentication module';
      const query = 'BUG';
      
      const matches = content.toLowerCase().includes(query.toLowerCase());
      
      expect(matches).toBe(true);
    });

    it('should extract text from array content', () => {
      const arrayContent = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
        'Plain string'
      ];
      
      const extracted = arrayContent
        .map(item => {
          if (typeof item === 'string') return item;
          if (item?.type === 'text' && item?.text) return item.text;
          return JSON.stringify(item);
        })
        .join(' ');
      
      expect(extracted).toBe('Hello World Plain string');
    });

    it('should decode project paths', () => {
      const encoded = '-Users-test-project-name';
      const decoded = encoded.replace(/-/g, '/').replace(/^\//, '');
      
      expect(decoded).toBe('Users/test/project/name');
    });
  });


  describe('JSON Processing', () => {
    it('should parse valid JSON lines', () => {
      const jsonLine = '{"type":"user","content":"test message"}';
      
      const parsed = JSON.parse(jsonLine);
      
      expect(parsed.type).toBe('user');
      expect(parsed.content).toBe('test message');
    });

    it('should handle JSON parsing errors gracefully', () => {
      const invalidJsonLine = 'invalid json';
      
      let result = null;
      let error = null;
      
      try {
        result = JSON.parse(invalidJsonLine);
      } catch (e) {
        error = e;
      }
      
      expect(result).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    it('should stringify objects correctly', () => {
      const obj = { 
        sessionId: 'test-123',
        messageCount: 10,
        topics: ['bug fix', 'feature']
      };
      
      const jsonString = JSON.stringify(obj, null, 2);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.sessionId).toBe('test-123');
      expect(parsed.messageCount).toBe(10);
      expect(parsed.topics).toEqual(['bug fix', 'feature']);
    });
  });
});