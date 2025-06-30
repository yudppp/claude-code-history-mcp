export const mockClaudeMessage = {
  parentUuid: null,
  isSidechain: false,
  userType: "external",
  cwd: "/Users/test/project",
  sessionId: "test-session-123",
  version: "1.0.33",
  type: "user" as const,
  message: {
    role: "user",
    content: "Fix the bug in the authentication module"
  },
  uuid: "msg-uuid-123",
  timestamp: "2025-06-30T10:00:00.000Z",
  requestId: "req-123"
};

export const mockAssistantMessage = {
  parentUuid: "msg-uuid-123",
  isSidechain: false,
  userType: "external",
  cwd: "/Users/test/project",
  sessionId: "test-session-123",
  version: "1.0.33",
  type: "assistant" as const,
  message: {
    id: "msg_assistant_123",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [
      {
        type: "text",
        text: "I'll help you fix the authentication bug. Let me first examine the code."
      }
    ],
    stop_reason: null,
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 20,
      service_tier: "standard"
    }
  },
  uuid: "msg-uuid-456",
  timestamp: "2025-06-30T10:00:05.000Z",
  requestId: "req-456"
};

export const mockConversationEntry = {
  sessionId: "test-session-123",
  timestamp: "2025-06-30T10:00:00.000Z",
  type: "user" as const,
  content: "Fix the bug in the authentication module",
  projectPath: "Users/test/project",
  uuid: "msg-uuid-123",
  metadata: {}
};

export const mockProjectInfo = {
  projectPath: "Users/test/project",
  sessionCount: 5,
  messageCount: 150,
  lastActivityTime: "2025-06-30T10:00:00.000Z"
};

export const mockSessionInfo = {
  sessionId: "test-session-123",
  projectPath: "Users/test/project",
  startTime: "2025-06-30T09:00:00.000Z",
  endTime: "2025-06-30T10:00:00.000Z",
  messageCount: 10,
  userMessageCount: 5,
  assistantMessageCount: 5
};

export const mockJsonlContent = `{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/Users/test/project","sessionId":"test-session-123","version":"1.0.33","type":"user","message":{"role":"user","content":"Fix the bug in the authentication module"},"uuid":"msg-uuid-123","timestamp":"2025-06-30T10:00:00.000Z"}
{"parentUuid":"msg-uuid-123","isSidechain":false,"userType":"external","cwd":"/Users/test/project","sessionId":"test-session-123","version":"1.0.33","type":"assistant","message":{"id":"msg_assistant_123","type":"message","role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"I'll help you fix the authentication bug. Let me first examine the code."}],"usage":{"input_tokens":10,"output_tokens":20}},"uuid":"msg-uuid-456","timestamp":"2025-06-30T10:00:05.000Z"}`;