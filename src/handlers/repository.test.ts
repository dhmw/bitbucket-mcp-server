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
});
