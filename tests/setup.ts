import { jest } from '@jest/globals';

// Global test setup
beforeEach(() => {
  // Clear all console mocks before each test
  jest.clearAllMocks();
});

// Mock console.error to avoid noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};