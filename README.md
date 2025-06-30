# Claude Code History MCP Server

An MCP server for retrieving and analyzing Claude Code conversation history with smart filtering and pagination.

## Features

This MCP server provides **4 powerful tools** for exploring your Claude Code conversation history:

### 1. `list_projects` 👀 **Start Here**
Discover all projects with Claude Code conversation history.

**Why use this first:** Get an overview of all available data before diving deeper.

**Returns:** Project paths, session counts, message counts, and last activity time.

### 2. `list_sessions` 📁 **Explore Sessions** 
List conversation sessions for exploration and filtering.

**Parameters:**
- `projectPath` (optional): Filter by specific project
- `startDate` (optional): Start date (e.g., "2025-06-30")
- `endDate` (optional): End date (e.g., "2025-06-30")

**Returns:** Session IDs, timestamps, message counts, and project paths.

### 3. `get_conversation_history` 💬 **Get Detailed Data**
Retrieve paginated conversation history with smart filtering.

**Key Features:**
- **Pagination**: `limit` (default: 20) and `offset` for efficient data handling
- **Message Filtering**: `messageTypes` defaults to `["user"]` to reduce data volume
- **Timezone Support**: Automatic timezone detection or specify (e.g., "Asia/Tokyo")
- **Date Filtering**: Smart date normalization with timezone awareness

**Parameters:**
- `sessionId` (optional): Specific session ID
- `startDate` (optional): Start date (e.g., "2025-06-30")
- `endDate` (optional): End date (e.g., "2025-06-30")
- `limit` (optional): Max entries per page (default: 20)
- `offset` (optional): Skip entries for pagination (default: 0)
- `messageTypes` (optional): `["user"]` (default), `["user", "assistant"]`, etc.
- `timezone` (optional): e.g., "Asia/Tokyo", "UTC" (auto-detected)

**Example:**
```json
{
  "startDate": "2025-06-30",
  "limit": 50,
  "messageTypes": ["user"],
  "timezone": "Asia/Tokyo"
}
```

**Response includes pagination info:**
```json
{
  "entries": [...],
  "pagination": {
    "total_count": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### 4. `search_conversations` 🔍 **Find Specific Content**
Search across all conversation content by keywords.

**Parameters:**
- `query` (required): Search terms
- `limit` (optional): Max results (default: 30)

## Quick Start

```bash
# Install directly via npx (no local installation needed)
npx claude-code-history-mcp

# Or install globally
npm install -g claude-code-history-mcp
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

## Recommended Workflow 🚀

### 1. **Explore Available Data**
```json
// Start with list_projects to see what's available
{"tool": "list_projects"}
```

### 2. **Find Relevant Sessions**
```json
// List sessions for a specific project or date range
{
  "tool": "list_sessions",
  "projectPath": "/Users/yourname/code/my-project",
  "startDate": "2025-06-30"
}
```

### 3. **Get Targeted Data**
```json
// Get conversation history with optimal settings
{
  "tool": "get_conversation_history", 
  "sessionId": "specific-session-id",
  "messageTypes": ["user"],  // Only your inputs (default)
  "limit": 50
}
```

## Data Source

This server reads Claude Code history files (.jsonl format) stored in `~/.claude/projects/`.

## Smart Features 💡

### **Message Type Filtering**
- **Default**: Only `["user"]` messages to reduce data volume
- **Full conversation**: Use `["user", "assistant"]` 
- **Everything**: Use `["user", "assistant", "system", "result"]`

### **Timezone Intelligence**
- Automatically detects your system timezone
- Supports explicit timezone specification (e.g., "Asia/Tokyo")
- Smart date normalization (e.g., "2025-06-30" → proper timezone bounds)

### **Pagination Support**
- Efficient handling of large datasets
- `total_count` helps you understand data volume
- `has_more` indicates if there's additional data

## Use Cases

### **Daily Work Review**
```
What did I work on today?
```
1. `list_projects` → See active projects
2. `get_conversation_history` with today's date and `messageTypes: ["user"]`

### **Project Deep Dive**
```
Analyze my recent work on Project X
```
1. `list_sessions` with specific project path
2. `get_conversation_history` for relevant sessions
3. Use pagination to browse through all data

### **Topic Research**
```
Find all conversations about "API integration"
```
1. `search_conversations` with query "API integration"
2. Use results to identify relevant sessions
3. `get_conversation_history` for detailed context

## License

MIT