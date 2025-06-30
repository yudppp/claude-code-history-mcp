import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

describe('MCP Server Integration Tests', () => {
  const serverPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
  
  // Helper function to send requests to the server
  const sendRequest = (request: any, timeout = 5000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [serverPath], {
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      server.stdout?.on('data', (data) => {
        output += data.toString();
      });

      server.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      server.on('close', (code) => {
        try {
          // Find the JSON response in the output
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{'));
          
          if (jsonLine) {
            const response = JSON.parse(jsonLine);
            resolve(response);
          } else {
            reject(new Error(`No JSON response found. Output: ${output}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}. Output: ${output}`));
        }
      });

      server.on('error', (error) => {
        reject(error);
      });

      // Send request and close stdin
      if (server.stdin) {
        server.stdin.write(JSON.stringify(request) + '\n');
        server.stdin.end();
      }

      // Set timeout
      setTimeout(() => {
        server.kill();
        reject(new Error('Request timeout'));
      }, timeout);
    });
  };

  describe('Server Startup and Basic Functionality', () => {
    it('should start and respond to tools/list request', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };

      const response = await sendRequest(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'get_conversation_history'
            }),
            expect.objectContaining({
              name: 'search_conversations'
            }),
            expect.objectContaining({
              name: 'list_projects'
            }),
            expect.objectContaining({
              name: 'list_sessions'
            })
          ])
        })
      });
    });

    it('should handle list_projects tool call', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'list_projects',
          arguments: {}
        }
      };

      const response = await sendRequest(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 2,
        result: expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.any(String)
            })
          ])
        })
      });

      // Verify the response contains valid JSON
      const projects = JSON.parse(response.result.content[0].text);
      expect(Array.isArray(projects)).toBe(true);
    });

    it('should handle get_conversation_history tool call', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'get_conversation_history',
          arguments: {
            limit: 5
          }
        }
      };

      const response = await sendRequest(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 3,
        result: expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.any(String)
            })
          ])
        })
      });

      const history = JSON.parse(response.result.content[0].text);
      expect(history).toHaveProperty('entries');
      expect(history).toHaveProperty('pagination');
      expect(Array.isArray(history.entries)).toBe(true);
    });
  });

  describe('Tool Validation and Error Handling', () => {
    it('should return error for missing required parameters', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'search_conversations',
          arguments: {} // Missing required 'query' parameter
        }
      };

      const response = await sendRequest(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 4,
        result: expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: 'Error: Search query is required'
            })
          ])
        })
      });
    });

    it('should return error for unknown tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      const response = await sendRequest(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 5,
        result: expect.objectContaining({
          isError: true,
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: 'Error: Unknown tool: unknown_tool'
            })
          ])
        })
      });
    });

    it('should handle search_conversations with valid query', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'search_conversations',
          arguments: {
            query: 'test',
            limit: 5
          }
        }
      };

      const response = await sendRequest(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 6,
        result: expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.any(String)
            })
          ])
        })
      });

      const results = JSON.parse(response.result.content[0].text);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle list_sessions tool call', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'list_sessions',
          arguments: {}
        }
      };

      const response = await sendRequest(request);

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: 7,
        result: expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.any(String)
            })
          ])
        })
      });

      const sessions = JSON.parse(response.result.content[0].text);
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe('Data Filtering and Parameters', () => {
    it('should handle get_conversation_history with date filters', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'get_conversation_history',
          arguments: {
            startDate: '2025-06-30T00:00:00.000Z',
            endDate: '2025-06-30T23:59:59.999Z',
            limit: 10
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(8);
      expect(response.result).toBeDefined();

      const history = JSON.parse(response.result.content[0].text);
      expect(history).toHaveProperty('entries');
      expect(history).toHaveProperty('pagination');
      expect(Array.isArray(history.entries)).toBe(true);
    });

    it('should handle list_sessions with project filter', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'list_sessions',
          arguments: {
            projectPath: 'Users/test/project'
          }
        }
      };

      const response = await sendRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(9);
      expect(response.result).toBeDefined();

      const sessions = JSON.parse(response.result.content[0].text);
      expect(Array.isArray(sessions)).toBe(true);
    });
  });
});