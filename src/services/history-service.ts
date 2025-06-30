import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export interface ClaudeCodeMessage {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: 'user' | 'assistant' | 'system' | 'result';
  message?: {
    role: string;
    content: string | any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    model?: string;
    usage?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  uuid: string;
  timestamp: string;
  requestId?: string;
}

export interface ConversationEntry {
  sessionId: string;
  timestamp: string;
  type: 'user' | 'assistant' | 'system' | 'result';
  content: string;
  projectPath: string;
  uuid: string;
  metadata?: {
    usage?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    totalCostUsd?: number;
    numTurns?: number;
    durationMs?: number;
    isError?: boolean;
    errorType?: string;
    model?: string;
    requestId?: string;
  };
}

export interface PaginatedConversationResponse {
  entries: ConversationEntry[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}


export interface HistoryQueryOptions {
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  timezone?: string; // e.g., 'Asia/Tokyo', 'UTC', etc. Defaults to system timezone
  messageTypes?: ('user' | 'assistant' | 'system' | 'result')[]; // Filter by message types
}

export interface SessionListOptions {
  projectPath?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectInfo {
  projectPath: string;
  sessionCount: number;
  messageCount: number;
  lastActivityTime: string;
}

export interface SessionInfo {
  sessionId: string;
  projectPath: string;
  startTime: string;
  endTime: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
}

export class ClaudeCodeHistoryService {
  private claudeDir: string;

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
  }

  /**
   * Normalize date string to ISO format for proper comparison with timezone support
   */
  private normalizeDate(dateString: string, isEndDate: boolean = false, timezone?: string): string {
    if (dateString.includes('T')) {
      return dateString;
    }
    
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    try {
      const timeStr = isEndDate ? '23:59:59.999' : '00:00:00.000';
      
      if (tz === 'UTC') {
        return `${dateString}T${timeStr}Z`;
      }
      
      // Simple approach: create date in target timezone and format to UTC
      // This assumes the input date is in the target timezone
      const isoString = `${dateString}T${timeStr}`;
      
      // Create date object treating it as local time in target timezone
      const localDate = new Date(isoString);
      
      // Get what this time would be in the target timezone
      const utcTime = localDate.getTime();
      const localOffset = localDate.getTimezoneOffset() * 60000; // Local offset in ms
      
      // Create a date in target timezone for offset calculation
      const tempDate = new Date();
      const tzDate = new Date(tempDate.toLocaleString('en-US', { timeZone: tz }));
      const utcDate = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzOffset = (tzDate.getTime() - utcDate.getTime()); // Target timezone offset from UTC
      
      // Adjust the time to account for timezone difference
      const adjustedTime = utcTime + localOffset - tzOffset;
      
      return new Date(adjustedTime).toISOString();
    } catch (error) {
      console.warn(`Failed to process timezone ${tz}, falling back to UTC:`, error);
      return `${dateString}T${isEndDate ? '23:59:59.999' : '00:00:00.000'}Z`;
    }
  }

  async getConversationHistory(options: HistoryQueryOptions = {}): Promise<PaginatedConversationResponse> {
    const { sessionId, startDate, endDate, limit = 20, offset = 0, timezone, messageTypes } = options;
    
    // Normalize date strings for proper comparison
    const normalizedStartDate = startDate ? this.normalizeDate(startDate, false, timezone) : undefined;
    const normalizedEndDate = endDate ? this.normalizeDate(endDate, true, timezone) : undefined;
    
    // Determine which message types to include (default to user only to reduce data volume)
    const allowedTypes = messageTypes && messageTypes.length > 0 ? messageTypes : ['user'];
    
    // Load history from Claude Code's .jsonl files with pre-filtering
    let allEntries = await this.loadClaudeHistoryEntries({ 
      startDate: normalizedStartDate, 
      endDate: normalizedEndDate 
    });
    
    // Filter by session ID if specified
    if (sessionId) {
      allEntries = allEntries.filter(entry => entry.sessionId === sessionId);
    }

    // Filter by message types (defaults to user only)
    allEntries = allEntries.filter(entry => allowedTypes.includes(entry.type));

    // Filter by date range if specified (additional in-memory filtering for precision)
    if (normalizedStartDate) {
      allEntries = allEntries.filter(entry => 
        entry.timestamp >= normalizedStartDate
      );
    }

    if (normalizedEndDate) {
      allEntries = allEntries.filter(entry => 
        entry.timestamp <= normalizedEndDate
      );
    }

    // Sort by timestamp (newest first)
    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Calculate pagination
    const totalCount = allEntries.length;
    const paginatedEntries = allEntries.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    return {
      entries: paginatedEntries,
      pagination: {
        total_count: totalCount,
        limit,
        offset,
        has_more: hasMore
      }
    };
  }



  async searchConversations(searchQuery: string, limit: number = 30): Promise<ConversationEntry[]> {
    const allEntries = await this.loadClaudeHistoryEntries();
    const queryLower = searchQuery.toLowerCase();
    
    const matchedEntries = allEntries.filter(entry =>
      entry.content.toLowerCase().includes(queryLower)
    );

    matchedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return matchedEntries.slice(0, limit);
  }

  async listProjects(): Promise<ProjectInfo[]> {
    const projects = new Map<string, {
      sessionIds: Set<string>;
      messageCount: number;
      lastActivityTime: string;
    }>();

    try {
      const projectsDir = path.join(this.claudeDir, 'projects');
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projectDir of projectDirs) {
        const projectPath = path.join(projectsDir, projectDir);
        const stats = await fs.stat(projectPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(projectPath);
          const decodedPath = this.decodeProjectPath(projectDir);
          
          if (!projects.has(decodedPath)) {
            projects.set(decodedPath, {
              sessionIds: new Set(),
              messageCount: 0,
              lastActivityTime: '1970-01-01T00:00:00.000Z'
            });
          }
          
          const projectInfo = projects.get(decodedPath);
          if (!projectInfo) continue;
          
          for (const file of files) {
            if (file.endsWith('.jsonl')) {
              const sessionId = file.replace('.jsonl', '');
              projectInfo.sessionIds.add(sessionId);
              
              const filePath = path.join(projectPath, file);
              const fileStats = await fs.stat(filePath);
              
              if (fileStats.mtime.toISOString() > projectInfo.lastActivityTime) {
                projectInfo.lastActivityTime = fileStats.mtime.toISOString();
              }
              
              // Count messages in this session
              const entries = await this.parseJsonlFile(filePath, projectDir);
              projectInfo.messageCount += entries.length;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error listing projects:', error);
    }

    return Array.from(projects.entries()).map(([projectPath, info]) => ({
      projectPath,
      sessionCount: info.sessionIds.size,
      messageCount: info.messageCount,
      lastActivityTime: info.lastActivityTime
    }));
  }

  async listSessions(options: SessionListOptions = {}): Promise<SessionInfo[]> {
    const { projectPath, startDate, endDate } = options;
    const sessions: SessionInfo[] = [];

    try {
      const projectsDir = path.join(this.claudeDir, 'projects');
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projectDir of projectDirs) {
        const decodedPath = this.decodeProjectPath(projectDir);
        
        // Filter by project path if specified
        if (projectPath && decodedPath !== projectPath) {
          continue;
        }
        
        const projectDirPath = path.join(projectsDir, projectDir);
        const stats = await fs.stat(projectDirPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(projectDirPath);
          
          for (const file of files) {
            if (file.endsWith('.jsonl')) {
              const sessionId = file.replace('.jsonl', '');
              const filePath = path.join(projectDirPath, file);
              const entries = await this.parseJsonlFile(filePath, projectDir);
              
              if (entries.length === 0) continue;
              
              const sessionStart = entries[entries.length - 1].timestamp;
              const sessionEnd = entries[0].timestamp;
              
              // Filter by date range if specified
              if (startDate && sessionEnd < startDate) continue;
              if (endDate && sessionStart > endDate) continue;
              
              const userMessageCount = entries.filter(e => e.type === 'user').length;
              const assistantMessageCount = entries.filter(e => e.type === 'assistant').length;
              
              sessions.push({
                sessionId,
                projectPath: decodedPath,
                startTime: sessionStart,
                endTime: sessionEnd,
                messageCount: entries.length,
                userMessageCount,
                assistantMessageCount
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error listing sessions:', error);
    }

    // Sort by start time (newest first)
    sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return sessions;
  }

  private async loadClaudeHistoryEntries(options: { startDate?: string; endDate?: string } = {}): Promise<ConversationEntry[]> {
    const entries: ConversationEntry[] = [];
    const { startDate, endDate } = options;
    
    try {
      const projectsDir = path.join(this.claudeDir, 'projects');
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projectDir of projectDirs) {
        const projectPath = path.join(projectsDir, projectDir);
        const stats = await fs.stat(projectPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(projectPath);
          
          for (const file of files) {
            if (file.endsWith('.jsonl')) {
              const filePath = path.join(projectPath, file);
              
              // Pre-filter files based on modification time
              if (await this.shouldSkipFile(filePath, startDate, endDate)) {
                continue;
              }
              
              const sessionEntries = await this.parseJsonlFile(filePath, projectDir, startDate, endDate);
              entries.push(...sessionEntries);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading Claude history:', error);
    }
    
    return entries;
  }

  private async parseJsonlFile(filePath: string, projectDir: string, startDate?: string, endDate?: string): Promise<ConversationEntry[]> {
    const entries: ConversationEntry[] = [];
    
    try {
      const fileStream = createReadStream(filePath);
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (line.trim()) {
          try {
            const claudeMessage: ClaudeCodeMessage = JSON.parse(line);
            
            // Apply date filtering at message level for efficiency
            if (startDate && claudeMessage.timestamp < startDate) {
              continue;
            }
            if (endDate && claudeMessage.timestamp > endDate) {
              continue;
            }
            
            const entry = this.convertClaudeMessageToEntry(claudeMessage, projectDir);
            if (entry) {
              entries.push(entry);
            }
          } catch (parseError) {
            console.error('Error parsing line:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error reading file:', filePath, error);
    }
    
    return entries;
  }

  private convertClaudeMessageToEntry(claudeMessage: ClaudeCodeMessage, projectDir: string): ConversationEntry | null {
    try {
      let content = '';
      
      if (claudeMessage.message?.content) {
        if (typeof claudeMessage.message.content === 'string') {
          content = claudeMessage.message.content;
        } else if (Array.isArray(claudeMessage.message.content)) {
          // Handle array content (e.g., from assistant messages)
          content = claudeMessage.message.content
            .map(item => {
              if (typeof item === 'string') return item;
              if (item?.type === 'text' && item?.text) return item.text;
              return JSON.stringify(item);
            })
            .join(' ');
        }
      }

      // Decode project path from directory name
      const projectPath = this.decodeProjectPath(projectDir);

      return {
        sessionId: claudeMessage.sessionId,
        timestamp: claudeMessage.timestamp,
        type: claudeMessage.type,
        content,
        projectPath,
        uuid: claudeMessage.uuid,
        metadata: {
          usage: claudeMessage.message?.usage,
          model: claudeMessage.message?.model,
          requestId: claudeMessage.requestId
        }
      };
    } catch (error) {
      console.error('Error converting Claude message:', error);
      return null;
    }
  }

  private decodeProjectPath(projectDir: string): string {
    return projectDir.replace(/-/g, '/').replace(/^\//, '');
  }


  /**
   * Determines whether to skip reading a file based on its modification time
   */
  private async shouldSkipFile(filePath: string, startDate?: string, endDate?: string): Promise<boolean> {
    if (!startDate && !endDate) {
      return false; // Don't skip if no date filters are specified
    }

    try {
      const fileStats = await fs.stat(filePath);
      const fileModTime = fileStats.mtime.toISOString();
      const fileCreateTime = fileStats.birthtime.toISOString();
      
      // Get the earliest and latest possible times for file content
      const oldestPossibleTime = fileCreateTime < fileModTime ? fileCreateTime : fileModTime;
      const newestPossibleTime = fileModTime;

      // If endDate is specified: skip if file's oldest time is after endDate
      if (endDate && oldestPossibleTime > endDate) {
        return true; // Skip
      }

      // If startDate is specified: skip if file's newest time is before startDate
      if (startDate && newestPossibleTime < startDate) {
        return true; // Skip
      }

      return false; // File might contain data in range, so read it
    } catch (error) {
      console.warn(`Failed to get file stats for ${filePath}:`, error);
      return false; // Safe fallback: read the file if stat fails
    }
  }
}