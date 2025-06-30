#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { ClaudeCodeHistoryService } from './services/history-service.js';

const server = new Server(
  {
    name: 'claude-code-history-mcp',
    version: '1.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const historyService = new ClaudeCodeHistoryService();

// Helper function to create response
const createResponse = (data: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
  content: [{
    type: 'text',
    text: JSON.stringify(data),
  }],
});

// Define available tools (ordered by recommended workflow)
const tools: Tool[] = [
  {
    name: 'list_projects',
    description: 'List all projects with Claude Code conversation history (start here to explore available data)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_sessions',
    description: 'List conversation sessions for a project or date range (use after list_projects to find specific sessions)',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Filter by specific project path (optional)',
        },
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (optional)',
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (optional)',
        },
      },
    },
  },
  {
    name: 'get_conversation_history',
    description: 'Get paginated conversation history (use after exploring with list_projects/list_sessions for targeted data)',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Specific session ID to get history for (optional)',
        },
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (optional)',
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of conversations to return (default: 20)',
          default: 20,
        },
        offset: {
          type: 'number',
          description: 'Number of conversations to skip for pagination (default: 0)',
          default: 0,
        },
        messageTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['user', 'assistant', 'system', 'result']
          },
          description: 'Filter by specific message types. Defaults to ["user"] to reduce data volume. Use ["user", "assistant"] to include Claude responses.',
          default: ['user']
        },
        timezone: {
          type: 'string',
          description: 'Timezone for date filtering (e.g., "Asia/Tokyo", "UTC"). Defaults to system timezone.',
        },
      },
    },
  },
  {
    name: 'search_conversations',
    description: 'Search through conversation history by content (useful for finding specific topics across all conversations)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find in conversation content',
        },
        limit: {
          type: 'number', 
          description: 'Maximum number of results to return (default: 30)',
          default: 30,
        },
      },
      required: ['query'],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_conversation_history': {
        const history = await historyService.getConversationHistory({
          sessionId: args?.sessionId as string,
          startDate: args?.startDate as string,
          endDate: args?.endDate as string,
          limit: (args?.limit as number) || 20,
          offset: (args?.offset as number) || 0,
          messageTypes: args?.messageTypes as ('user' | 'assistant' | 'system' | 'result')[],
          timezone: args?.timezone as string,
        });
        return createResponse(history);
      }

      case 'search_conversations': {
        const query = args?.query as string;
        if (!query) {
          throw new Error('Search query is required');
        }
        
        const results = await historyService.searchConversations(
          query,
          (args?.limit as number) || 50
        );
        return createResponse(results);
      }

      case 'list_projects': {
        const projects = await historyService.listProjects();
        return createResponse(projects);
      }

      case 'list_sessions': {
        const sessions = await historyService.listSessions({
          projectPath: args?.projectPath as string,
          startDate: args?.startDate as string,
          endDate: args?.endDate as string,
        });
        return createResponse(sessions);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text',
        text: `Error: ${errorMessage}`,
      }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Claude Code History MCP Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});