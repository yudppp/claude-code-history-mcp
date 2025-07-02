import { ClaudeCodeHistoryService } from '../../src/services/history-service';
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Enhanced Search Features', () => {
  let service: ClaudeCodeHistoryService;
  let tempDir: string;
  let mockClaudeDir: string;

  beforeAll(async () => {
    // Create temporary directory structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-code-history-test-'));
    mockClaudeDir = path.join(tempDir, '.claude');
    await fs.mkdir(mockClaudeDir, { recursive: true });
    
    // Mock the service to use our temp directory
    service = new ClaudeCodeHistoryService();
    (service as any).claudeDir = mockClaudeDir;

    // Create mock project data
    const projectsDir = path.join(mockClaudeDir, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });

    // Create mock project directories and files
    const project1Dir = path.join(projectsDir, 'Users-test-project1');
    const project2Dir = path.join(projectsDir, 'Users-test-project2');
    
    await fs.mkdir(project1Dir, { recursive: true });
    await fs.mkdir(project2Dir, { recursive: true });

    // Create mock conversation data
    const mockConversations1 = [
      {
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/project1',
        sessionId: 'session1',
        version: '1.0.0',
        type: 'user',
        message: {
          role: 'user',
          content: 'API integration with payment gateway'
        },
        uuid: 'msg1',
        timestamp: '2025-06-30T10:00:00.000Z'
      },
      {
        parentUuid: 'msg1',
        isSidechain: false,
        userType: 'assistant',
        cwd: '/Users/test/project1',
        sessionId: 'session1',
        version: '1.0.0',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: 'I can help you with API integration for the payment gateway.'
        },
        uuid: 'msg2',
        timestamp: '2025-06-30T10:01:00.000Z'
      }
    ];

    const mockConversations2 = [
      {
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/Users/test/project2',
        sessionId: 'session2',
        version: '1.0.0',
        type: 'user',
        message: {
          role: 'user',
          content: 'Database schema design for user management'
        },
        uuid: 'msg3',
        timestamp: '2025-06-29T15:00:00.000Z'
      }
    ];

    // Write mock data to files
    const file1 = path.join(project1Dir, 'session1.jsonl');
    const file2 = path.join(project2Dir, 'session2.jsonl');
    
    await fs.writeFile(file1, mockConversations1.map(c => JSON.stringify(c)).join('\n'));
    await fs.writeFile(file2, mockConversations2.map(c => JSON.stringify(c)).join('\n'));
  });

  describe('search_conversations with enhanced filtering', () => {
    it('should filter by project path', async () => {
      const results = await service.searchConversations('API', {
        projectPath: 'Users/test/project1'
      });

      expect(results).toHaveLength(2); // Both user and assistant messages
      expect(results.every(r => r.projectPath === 'Users/test/project1')).toBe(true);
      expect(results.some(r => r.content.includes('API integration'))).toBe(true);
    });

    it('should support date range filtering interface', async () => {
      // Test that the interface accepts date parameters without errors
      const results = await service.searchConversations('API', {
        startDate: '2025-06-30',
        endDate: '2025-06-30'
      });

      // At minimum, should not throw an error and return an array
      expect(Array.isArray(results)).toBe(true);
    });

    it('should support combined filtering interface', async () => {
      // Test that the interface accepts all parameters without errors
      const results = await service.searchConversations('Database', {
        projectPath: 'Users/test/project2',
        startDate: '2025-06-29',
        endDate: '2025-06-29',
        timezone: 'UTC'
      });

      // At minimum, should not throw an error and return an array
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty results when filters do not match', async () => {
      const results = await service.searchConversations('API', {
        projectPath: 'Users/test/project2'  // API is only in project1
      });

      expect(results).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const results = await service.searchConversations('user', {
        limit: 1
      });

      expect(results).toHaveLength(1);
    });
  });

  describe('list_sessions with timezone support', () => {
    it('should list sessions with timezone filtering', async () => {
      const sessions = await service.listSessions({
        startDate: '2025-06-30',
        timezone: 'UTC'
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe('session1');
    });

    it('should filter sessions by project path', async () => {
      const sessions = await service.listSessions({
        projectPath: 'Users/test/project1'
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].projectPath).toBe('Users/test/project1');
    });

    it('should handle date range filtering with timezone', async () => {
      const sessions = await service.listSessions({
        startDate: '2025-06-29',
        endDate: '2025-06-29',
        timezone: 'UTC'
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe('session2');
    });
  });
});