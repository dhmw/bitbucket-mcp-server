# Bitbucket MCP Server - Testing Documentation

This document describes the test setup and coverage for the Bitbucket MCP Server.

## Test Framework

This server uses **Vitest** as the testing framework, which provides:
- Fast unit testing with TypeScript support
- Built-in mocking capabilities via `vi` API
- Watch mode for development
- Coverage reporting

## Running Tests

From the `bitbucket-mcp-server` directory:

```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Run tests with UI
```

## Test Coverage

✅ **13 tests passing** across 4 test files

### Test Files

#### `src/handlers/repository.test.ts` (4 tests)
Tests repository operations:
- List repositories with pagination
- Filter repositories by project
- List projects with pagination
- Error handling

#### `src/handlers/branch.test.ts` (2 tests)
Tests branch operations:
- Create branches from source branch
- Default source branch handling

#### `src/handlers/pullRequest.test.ts` (4 tests)
Tests pull request operations:
- Create pull requests with reviewers
- List pull requests with state filtering
- Default values for optional fields (destination branch, state)
- Error handling

#### `src/handlers/deployment.test.ts` (3 tests)
Tests deployment operations:
- List deployments with environment mapping
- Filter deployments by environment
- Handle empty deployment lists

## Test Structure

All test files follow this pattern:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandlerClass } from './handler.js';
import type { AxiosInstance } from 'axios';

describe('HandlerClass', () => {
  let mockAxios: AxiosInstance;
  let handlers: HandlerClass;

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;
    handlers = new HandlerClass(mockAxios, 'test-workspace');
  });

  describe('method', () => {
    it('should do something', async () => {
      // Arrange
      const mockResponse = { data: { /* ... */ } };
      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      // Act
      const result = await handlers.method(args);

      // Assert
      expect(mockAxios.get).toHaveBeenCalledWith(/* ... */);
      expect(result).toEqual(/* ... */);
    });
  });
});
```

## Mocking Strategy

All tests use Axios mocking to avoid making real HTTP requests:

```typescript
const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
} as any;

// Mock responses
vi.mocked(mockAxios.get).mockResolvedValueOnce({ data: { /* ... */ } });
```

This approach ensures:
- Fast test execution
- No external dependencies
- Predictable test results
- Isolation between tests

## Key Testing Patterns

### 1. Happy Path Testing
Each major operation has at least one test verifying successful execution.

### 2. Error Handling
Tests verify proper error messages and error handling for:
- Missing required parameters
- Not found scenarios
- Invalid input

### 3. Parameter Validation
Tests verify that:
- Required parameters are enforced
- Optional parameters have correct defaults
- Parameters are passed correctly to the API

### 4. Response Transformation
Tests verify that API responses are correctly transformed into the expected format.

## Test Configuration

The `vitest.config.ts` file:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'build/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});
```

## Coverage Goals

Current coverage focuses on:
- ✅ Core handler methods
- ✅ Error handling paths
- ✅ Parameter validation
- ✅ Response transformation

Future improvements:
- Add integration tests with real API calls (optional)
- Add coverage reporting with thresholds
- Add mutation testing for critical paths
- Expand test coverage to additional operations (merge, approve, decline PRs)

## Contributing

When adding new features:

1. Write tests for new handler methods
2. Follow existing test patterns
3. Mock all external dependencies
4. Test both success and error cases
5. Run `npm test` before committing

## Summary

**13 tests** covering core Bitbucket operations:
- **Repository Management** - List repositories and projects with pagination
- **Branch Operations** - Create branches with proper source handling
- **Pull Requests** - Create and list PRs with state filtering
- **Deployments** - List and filter deployment information

All tests passing with coverage of essential functionality!
