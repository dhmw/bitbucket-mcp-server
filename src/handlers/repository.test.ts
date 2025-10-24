import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepositoryHandlers } from './repository.js';
import type { AxiosInstance } from 'axios';

describe('RepositoryHandlers', () => {
  let mockAxios: AxiosInstance;
  let handlers: RepositoryHandlers;
  const workspace = 'test-workspace';

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;
    handlers = new RepositoryHandlers(mockAxios, workspace);
  });

  describe('listRepositories', () => {
    // API Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
    it('should list repositories', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              name: 'repo1',
              full_name: 'test-workspace/repo1',
              is_private: true,
              description: 'First repo',
            },
            {
              name: 'repo2',
              full_name: 'test-workspace/repo2',
              is_private: false,
              description: 'Second repo',
            },
          ],
          size: 2,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listRepositories({ page: 1, pagelen: 10 });

      expect(mockAxios.get).toHaveBeenCalledWith(`/repositories/${workspace}`, {
        params: { page: 1, pagelen: 10 },
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.repositories).toHaveLength(2);
      expect(data.repositories[0].name).toBe('repo1');
      expect(data.pagination.total).toBe(2);
    });

    // API Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
    // Query parameter 'q' is used for filtering (e.g., q=project.key="PROJ")
    it('should filter repositories by project', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              name: 'repo1',
              full_name: 'test-workspace/repo1',
              is_private: true,
              description: 'Project repo',
            },
          ],
          size: 1,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      await handlers.listRepositories({ project: 'PROJ' });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repositories/${workspace}`,
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'project.key="PROJ"',
          }),
        })
      );
    });

    it('should use default pagination values', async () => {
      const mockResponse = {
        data: {
          values: [],
          size: 0,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      await handlers.listRepositories({});

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page: 1, pagelen: 10 },
        })
      );
    });
  });

  describe('listProjects', () => {
    // API Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-projects/#api-workspaces-workspace-projects-get
    it('should list all projects', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              key: 'PROJ1',
              name: 'Project 1',
              description: 'First project',
            },
            {
              key: 'PROJ2',
              name: 'Project 2',
              description: 'Second project',
            },
          ],
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listProjects({ page: 1, pagelen: 10 });

      expect(mockAxios.get).toHaveBeenCalledWith(`/workspaces/${workspace}/projects`, {
        params: { page: 1, pagelen: 10 },
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.projects).toHaveLength(2);
      expect(data.projects[0].key).toBe('PROJ1');
    });
  });

  describe('getDefaultReviewers', () => {
    // API Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-effective-default-reviewers-get
    it('should get default reviewers for a repository', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              user: {
                username: 'reviewer1',
                display_name: 'Reviewer One',
                account_id: '123456',
                uuid: '{abcd-1234}',
              },
              reviewer_type: 'repository',
            },
            {
              user: {
                username: 'reviewer2',
                display_name: 'Reviewer Two',
                account_id: '789012',
                uuid: '{efgh-5678}',
              },
              reviewer_type: 'project',
            },
          ],
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.getDefaultReviewers({ repository: 'test-repo' });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/effective-default-reviewers`
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.repository).toBe('test-repo');
      expect(data.default_reviewers).toHaveLength(2);
      expect(data.default_reviewers[0].username).toBe('reviewer1');
      expect(data.default_reviewers[0].reviewer_type).toBe('repository');
      expect(data.default_reviewers[1].username).toBe('reviewer2');
      expect(data.default_reviewers[1].reviewer_type).toBe('project');
      expect(data.total).toBe(2);
    });

    it('should handle empty default reviewers list', async () => {
      const mockResponse = {
        data: {
          values: [],
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.getDefaultReviewers({ repository: 'test-repo' });

      const data = JSON.parse(result.content[0].text);
      expect(data.default_reviewers).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });
});
