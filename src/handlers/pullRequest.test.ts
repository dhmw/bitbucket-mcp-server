import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PullRequestHandlers } from './pullRequest.js';
import type { AxiosInstance } from 'axios';

describe('PullRequestHandlers', () => {
  let mockAxios: AxiosInstance;
  let handlers: PullRequestHandlers;
  const workspace = 'test-workspace';

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    } as any;
    handlers = new PullRequestHandlers(mockAxios, workspace);
  });

  describe('createPullRequest', () => {
    it('should create a pull request', async () => {
      const mockResponse = {
        data: {
          id: 1,
          title: 'Add new feature',
          description: 'This PR adds a new feature',
          state: 'OPEN',
          source: {
            branch: { name: 'feature/new-feature' },
          },
          destination: {
            branch: { name: 'main' },
          },
          author: {
            display_name: 'John Doe',
          },
          links: {
            html: { href: 'https://bitbucket.org/test-workspace/test-repo/pull-requests/1' },
          },
          created_on: '2025-01-01T00:00:00Z',
        },
      };

      vi.mocked(mockAxios.post).mockResolvedValueOnce(mockResponse);

      const result = await handlers.createPullRequest({
        repository: 'test-repo',
        title: 'Add new feature',
        description: 'This PR adds a new feature',
        source_branch: 'feature/new-feature',
        destination_branch: 'main',
        reviewers: ['reviewer1', 'reviewer2'],
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/pullrequests`,
        {
          title: 'Add new feature',
          description: 'This PR adds a new feature',
          source: {
            branch: { name: 'feature/new-feature' },
          },
          destination: {
            branch: { name: 'main' },
          },
          reviewers: [{ username: 'reviewer1' }, { username: 'reviewer2' }],
        }
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.message).toBe('Pull request created successfully');
      expect(data.pull_request.id).toBe(1);
      expect(data.pull_request.title).toBe('Add new feature');
    });

    it('should use default values for optional fields', async () => {
      const mockResponse = {
        data: {
          id: 2,
          title: 'Quick fix',
          description: '',
          state: 'OPEN',
          source: {
            branch: { name: 'hotfix' },
          },
          destination: {
            branch: { name: 'main' },
          },
          author: {
            display_name: 'Jane Doe',
          },
          links: {
            html: { href: 'https://bitbucket.org/test-workspace/test-repo/pull-requests/2' },
          },
          created_on: '2025-01-01T00:00:00Z',
        },
      };

      vi.mocked(mockAxios.post).mockResolvedValueOnce(mockResponse);

      await handlers.createPullRequest({
        repository: 'test-repo',
        title: 'Quick fix',
        source_branch: 'hotfix',
      });

      const postCall = vi.mocked(mockAxios.post).mock.calls[0];
      const body = postCall[1] as any;

      expect(body.description).toBe('');
      expect(body.destination.branch.name).toBe('main');
      expect(body.reviewers).toEqual([]);
    });
  });

  describe('listPullRequests', () => {
    it('should list pull requests with default state OPEN', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              id: 1,
              title: 'PR 1',
              state: 'OPEN',
              source: { branch: { name: 'feature-1' } },
              destination: { branch: { name: 'main' } },
              author: { display_name: 'Author 1' },
              created_on: '2025-01-01T00:00:00Z',
              updated_on: '2025-01-02T00:00:00Z',
              links: { html: { href: 'https://bitbucket.org/pr/1' } },
            },
            {
              id: 2,
              title: 'PR 2',
              state: 'OPEN',
              source: { branch: { name: 'feature-2' } },
              destination: { branch: { name: 'main' } },
              author: { display_name: 'Author 2' },
              created_on: '2025-01-03T00:00:00Z',
              updated_on: '2025-01-04T00:00:00Z',
              links: { html: { href: 'https://bitbucket.org/pr/2' } },
            },
          ],
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listPullRequests({
        repository: 'test-repo',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/pullrequests`,
        {
          params: { state: 'OPEN', page: 1 },
        }
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.pull_requests).toHaveLength(2);
      expect(data.state).toBe('OPEN');
    });

    it('should filter by state', async () => {
      const mockResponse = {
        data: {
          values: [],
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      await handlers.listPullRequests({
        repository: 'test-repo',
        state: 'MERGED',
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            state: 'MERGED',
          }),
        })
      );
    });
  });
});
