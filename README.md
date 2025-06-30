# Claude Code History MCP Server

An MCP server for retrieving and analyzing Claude Code conversation history.

## Features

This MCP server provides the following tools:

### 1. `get_conversation_history`
Retrieve Claude Code session history.

**Parameters:**
- `sessionId` (optional): Filter by specific session ID
- `startDate` (optional): Start date in ISO format
- `endDate` (optional): End date in ISO format
- `limit` (optional): Maximum number of entries to return (default: 100)

**Example:**
```json
{
  "sessionId": "abc123-def456",
  "startDate": "2025-06-30T00:00:00.000Z",
  "endDate": "2025-06-30T23:59:59.999Z",
  "limit": 50
}
```

### 2. `search_conversations`
Search conversation content by keywords.

**Parameters:**
- `query` (required): Search query
- `limit` (optional): Maximum number of results to return (default: 50)

### 3. `list_projects`
List all projects that have Claude Code conversation history.

### 4. `list_sessions`
List conversation sessions.

**Parameters:**
- `projectPath` (optional): Filter by project path
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

## Installation

```bash
npm install
npm run build
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

The test suite includes:
- **Unit tests**: Testing individual functions and utilities
- **Integration tests**: Testing the complete MCP server functionality
- **Type tests**: Ensuring TypeScript type safety

## Usage

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

## Usage with MCP Clients

Add the following configuration to your MCP client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "claude-code-history": {
      "command": "npx",
      "args": ["claude-code-history-mcp"]
    }
  }
}
```

Alternatively, if you have installed the package globally:

```json
{
  "mcpServers": {
    "claude-code-history": {
      "command": "claude-code-history-mcp"
    }
  }
}
```

## Data Source

This server reads Claude Code history files (.jsonl format) stored in `~/.claude/projects/`.

## Use Cases

### Daily Report Generation
```
Summarize today's (2025-06-30) work activities.
```

1. Use `get_conversation_history` to retrieve today's history
2. Have the client-side LLM summarize the content
3. Organize as a daily report

### Project Analysis
```
What have I been working on recently in Project X?
```

1. Use `list_sessions` to get sessions for the specific project
2. Use `get_conversation_history` to get detailed conversations
3. Analyze work activities

## License

MIT