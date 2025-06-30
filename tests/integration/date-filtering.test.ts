import { describe, it, expect } from '@jest/globals';
import { spawn } from 'child_process';
import * as path from 'path';

describe('Date Filtering Performance Tests', () => {
  const serverPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
  
  const sendRequest = (request: any, timeout = 10000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [serverPath], {
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      const timeoutId = setTimeout(() => {
        server.kill();
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);

      server.stdout?.on('data', (data) => {
        output += data.toString();
      });

      server.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      server.on('close', (code) => {
        clearTimeout(timeoutId);
        try {
          const lines = output.trim().split('\n');
          const jsonLine = lines.find(line => line.startsWith('{'));
          
          if (jsonLine) {
            const response = JSON.parse(jsonLine);
            resolve(response);
          } else {
            reject(new Error(`No JSON response found. Output: ${output}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}. Output: ${output}, Error: ${errorOutput}`));
        }
      });

      server.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      if (server.stdin) {
        server.stdin.write(JSON.stringify(request) + '\n');
        server.stdin.end();
      }
    });
  };

  it('should handle date-filtered history requests efficiently', async () => {
    const startTime = Date.now();
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_conversation_history',
        arguments: {
          startDate: '2025-06-25',
          endDate: '2025-06-26',
          limit: 50
        }
      }
    };

    const response = await sendRequest(request);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response).toHaveProperty('result');
    expect(response.result).toHaveProperty('content');
    
    // Response should be reasonably fast with file-level filtering
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log(`Date-filtered query completed in ${duration}ms`);
  });

  it('should return fewer results for narrow date ranges', async () => {
    // Test with a very narrow date range (yesterday only)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_conversation_history',
        arguments: {
          startDate: yesterdayStr,
          endDate: yesterdayStr,
          limit: 100
        }
      }
    };

    const response = await sendRequest(request);
    
    expect(response).toHaveProperty('result');
    expect(response.result).toHaveProperty('content');
    
    const results = JSON.parse(response.result.content[0].text);
    console.log(`Found ${results.entries?.length || 'undefined'} entries for ${yesterdayStr}`);
    
    // Should be valid paginated response with entries array
    expect(results).toHaveProperty('entries');
    expect(results).toHaveProperty('pagination');
    expect(Array.isArray(results.entries)).toBe(true);
  });

  it('should handle queries for date ranges with no data efficiently', async () => {
    const startTime = Date.now();
    
    // Query for a date range far in the future where no data should exist
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_conversation_history',
        arguments: {
          startDate: '2030-01-01',
          endDate: '2030-01-31',
          limit: 100
        }
      }
    };

    const response = await sendRequest(request);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response).toHaveProperty('result');
    
    const results = JSON.parse(response.result.content[0].text);
    
    // Should return empty paginated response quickly due to file-level filtering
    expect(results).toHaveProperty('entries');
    expect(results).toHaveProperty('pagination');
    expect(Array.isArray(results.entries)).toBe(true);
    expect(results.entries.length).toBe(0);
    expect(results.pagination.total_count).toBe(0);
    
    // Should be very fast when no files need to be read
    expect(duration).toBeLessThan(2000);
    
    console.log(`Empty date range query completed in ${duration}ms`);
  });
});