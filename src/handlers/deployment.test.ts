import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeploymentHandlers } from './deployment.js';
import type { AxiosInstance } from 'axios';

describe('DeploymentHandlers', () => {
  let mockAxios: AxiosInstance;
  let handlers: DeploymentHandlers;
  const workspace = 'test-workspace';

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
    } as any;
    handlers = new DeploymentHandlers(mockAxios, workspace);
  });

  describe('listDeployments', () => {
    // API Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-deployments/#api-repositories-workspace-repo-slug-deployments-get
    // Also uses: GET /repositories/{workspace}/{repo_slug}/environments
    it('should list deployments', async () => {
      const environmentsResponse = {
        data: {
          values: [
            { uuid: 'env-1', name: 'production' },
            { uuid: 'env-2', name: 'staging' },
          ],
        },
      };

      const deploymentsResponse = {
        data: {
          values: [
            {
              uuid: 'deploy-1',
              number: 1,
              created_on: '2025-01-02T00:00:00Z',
              state: {
                type: 'COMPLETED',
                name: 'completed',
                trigger_url: 'https://example.com/trigger',
              },
              environment: { uuid: 'env-1' },
              deployable: {
                name: 'Deployment 1',
                url: 'https://example.com/deployable1',
                pipeline: { uuid: 'pipe-1' },
                commit: {
                  hash: 'abc123',
                  links: { html: { href: 'https://example.com/commit/abc123' } },
                },
                created_on: '2025-01-02T00:00:00Z',
              },
              release: {
                name: 'Release 1',
                url: 'https://example.com/release1',
                pipeline: { uuid: 'pipe-1' },
                commit: {
                  hash: 'abc123',
                  links: { html: { href: 'https://example.com/commit/abc123' } },
                },
                created_on: '2025-01-02T00:00:00Z',
              },
            },
            {
              uuid: 'deploy-2',
              number: 2,
              created_on: '2025-01-01T00:00:00Z',
              state: {
                type: 'IN_PROGRESS',
                name: 'in_progress',
                trigger_url: 'https://example.com/trigger2',
              },
              environment: { uuid: 'env-2' },
              deployable: {
                name: 'Deployment 2',
                url: 'https://example.com/deployable2',
                pipeline: { uuid: 'pipe-2' },
                commit: {
                  hash: 'def456',
                  links: { html: { href: 'https://example.com/commit/def456' } },
                },
                created_on: '2025-01-01T00:00:00Z',
              },
              release: {
                name: 'Release 2',
                url: 'https://example.com/release2',
                pipeline: { uuid: 'pipe-2' },
                commit: {
                  hash: 'def456',
                  links: { html: { href: 'https://example.com/commit/def456' } },
                },
                created_on: '2025-01-01T00:00:00Z',
              },
            },
          ],
          size: 2,
        },
      };

      vi.mocked(mockAxios.get)
        .mockResolvedValueOnce(environmentsResponse)
        .mockResolvedValueOnce(deploymentsResponse);

      const result = await handlers.listDeployments({
        repository: 'test-repo',
        page: 1,
        pagelen: 10,
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/environments`
      );
      expect(mockAxios.get).toHaveBeenCalledWith(
        `/repositories/${workspace}/test-repo/deployments`,
        expect.objectContaining({
          params: expect.objectContaining({
            page: 1,
          }),
        })
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.deployments).toBeDefined();
      expect(data.repository).toBe('test-repo');
    });

    // API Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-deployments/#api-repositories-workspace-repo-slug-deployments-get
    it('should filter deployments by environment', async () => {
      const environmentsResponse = {
        data: {
          values: [
            { uuid: 'env-1', name: 'production' },
            { uuid: 'env-2', name: 'staging' },
          ],
        },
      };

      const deploymentsResponse = {
        data: {
          values: [
            {
              uuid: 'deploy-1',
              number: 1,
              created_on: '2025-01-01T00:00:00Z',
              state: { type: 'COMPLETED', name: 'completed' },
              environment: { uuid: 'env-1' },
              deployable: {
                name: 'Prod Deploy',
                url: 'https://example.com/prod',
                pipeline: { uuid: 'pipe-1' },
                commit: {
                  hash: 'abc123',
                  links: { html: { href: 'https://example.com/commit/abc123' } },
                },
                created_on: '2025-01-01T00:00:00Z',
              },
              release: {
                name: 'Prod Release',
                url: 'https://example.com/release',
                pipeline: { uuid: 'pipe-1' },
                commit: {
                  hash: 'abc123',
                  links: { html: { href: 'https://example.com/commit/abc123' } },
                },
                created_on: '2025-01-01T00:00:00Z',
              },
            },
            {
              uuid: 'deploy-2',
              number: 2,
              created_on: '2025-01-02T00:00:00Z',
              state: { type: 'COMPLETED', name: 'completed' },
              environment: { uuid: 'env-2' },
              deployable: {
                name: 'Staging Deploy',
                url: 'https://example.com/staging',
                pipeline: { uuid: 'pipe-2' },
                commit: {
                  hash: 'def456',
                  links: { html: { href: 'https://example.com/commit/def456' } },
                },
                created_on: '2025-01-02T00:00:00Z',
              },
              release: {
                name: 'Staging Release',
                url: 'https://example.com/release2',
                pipeline: { uuid: 'pipe-2' },
                commit: {
                  hash: 'def456',
                  links: { html: { href: 'https://example.com/commit/def456' } },
                },
                created_on: '2025-01-02T00:00:00Z',
              },
            },
          ],
          size: 2,
        },
      };

      vi.mocked(mockAxios.get)
        .mockResolvedValueOnce(environmentsResponse)
        .mockResolvedValueOnce(deploymentsResponse);

      const result = await handlers.listDeployments({
        repository: 'test-repo',
        environment: 'production',
      });

      const data = JSON.parse(result.content[0].text);
      // Should only include production deployments
      expect(data.deployments.every((d: any) => d.environment.name === 'production')).toBe(true);
    });

    it('should handle empty deployments', async () => {
      const environmentsResponse = {
        data: {
          values: [],
        },
      };

      const deploymentsResponse = {
        data: {
          values: [],
        },
      };

      vi.mocked(mockAxios.get)
        .mockResolvedValueOnce(environmentsResponse)
        .mockResolvedValueOnce(deploymentsResponse);

      const result = await handlers.listDeployments({
        repository: 'test-repo',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.deployments).toEqual([]);
    });
  });
});
