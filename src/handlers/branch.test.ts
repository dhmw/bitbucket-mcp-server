import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BranchHandlers } from './branch.js';
import type { AxiosInstance } from 'axios';

describe('BranchHandlers', () => {
  let mockAxios: AxiosInstance;
  let handlers: BranchHandlers;
  const workspace = 'test-workspace';

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
    } as any;
    handlers = new BranchHandlers(mockAxios, workspace);
  });

  describe('createBranch', () => {
    it('should create a new branch from source branch', async () => {
      const sourceBranchResponse = {
        data: {
          name: 'main',
          target: {
            hash: 'abc123def456',
          },
        },
      };

      const createBranchResponse = {
        data: {
          name: 'feature/new-feature',
          target: {
            hash: 'abc123def456',
          },
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(sourceBranchResponse);
      vi.mocked(mockAxios.post).mockResolvedValueOnce(createBranchResponse);

      const result = await handlers.createBranch({
        repository: 'test-repo',
        branch_name: 'feature/new-feature',
        source_branch: 'main',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/refs/branches/main`
      );

      expect(mockAxios.post).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/refs/branches`,
        {
          name: 'feature/new-feature',
          target: {
            hash: 'abc123def456',
          },
        }
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.message).toContain('created successfully');
      expect(data.branch.name).toBe('feature/new-feature');
      expect(data.branch.commit_hash).toBe('abc123def456');
    });

    it('should default to main as source branch', async () => {
      const sourceBranchResponse = {
        data: {
          name: 'main',
          target: {
            hash: 'xyz789',
          },
        },
      };

      const createBranchResponse = {
        data: {
          name: 'hotfix/urgent-fix',
          target: {
            hash: 'xyz789',
          },
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(sourceBranchResponse);
      vi.mocked(mockAxios.post).mockResolvedValueOnce(createBranchResponse);

      await handlers.createBranch({
        repository: 'test-repo',
        branch_name: 'hotfix/urgent-fix',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/refs/branches/main`
      );
    });
  });
});
