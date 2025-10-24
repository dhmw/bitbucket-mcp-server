import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceHandlers } from './workspace.js';
import type { AxiosInstance } from 'axios';

describe('WorkspaceHandlers', () => {
  let mockAxios: AxiosInstance;
  let handlers: WorkspaceHandlers;
  const workspace = 'test-workspace';

  beforeEach(() => {
    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    } as any;
    handlers = new WorkspaceHandlers(mockAxios, workspace);
  });

  describe('listWorkspaceMembers', () => {
    // API Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-workspaces-workspace-members-get
    it('should list all workspace members with default pagination', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              type: 'workspace_membership',
              user: {
                display_name: 'John Doe',
                uuid: '{user-uuid-1}',
                username: 'john.doe',
                account_id: 'account-id-1',
                nickname: 'johndoe',
                type: 'user',
                links: {
                  avatar: { href: 'https://bitbucket.org/account/john.doe/avatar/32/' },
                  html: { href: 'https://bitbucket.org/john.doe/' },
                },
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
            {
              type: 'workspace_membership',
              user: {
                display_name: 'Jane Smith',
                uuid: '{user-uuid-2}',
                username: 'jane.smith',
                account_id: 'account-id-2',
                nickname: 'janesmith',
                type: 'user',
                links: {
                  avatar: { href: 'https://bitbucket.org/account/jane.smith/avatar/32/' },
                  html: { href: 'https://bitbucket.org/jane.smith/' },
                },
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
            {
              type: 'workspace_membership',
              user: {
                display_name: 'Gareth Jones',
                uuid: '{user-uuid-3}',
                username: 'gareth.jones',
                account_id: 'account-id-3',
                nickname: 'garethjones',
                type: 'user',
                links: {
                  avatar: { href: 'https://bitbucket.org/account/gareth.jones/avatar/32/' },
                  html: { href: 'https://bitbucket.org/gareth.jones/' },
                },
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
          ],
          size: 3,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listWorkspaceMembers({});

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/workspaces/${workspace}/members`,
        {
          params: { page: 1, pagelen: 100 },
        }
      );

      const data = JSON.parse(result.content[0].text);
      expect(data.workspace).toBe(workspace);
      expect(data.members).toHaveLength(3);

      // Check first member
      expect(data.members[0].username).toBe('john.doe');
      expect(data.members[0].display_name).toBe('John Doe');
      expect(data.members[0].uuid).toBe('{user-uuid-1}');
      expect(data.members[0].account_id).toBe('account-id-1');
      expect(data.members[0].nickname).toBe('johndoe');
      expect(data.members[0].avatar_url).toBe('https://bitbucket.org/account/john.doe/avatar/32/');
      expect(data.members[0].profile_url).toBe('https://bitbucket.org/john.doe/');

      // Check third member (Gareth)
      expect(data.members[2].username).toBe('gareth.jones');
      expect(data.members[2].display_name).toBe('Gareth Jones');

      expect(data.pagination.page).toBe(1);
      expect(data.pagination.pagelen).toBe(100);
      expect(data.pagination.total).toBe(3);
    });

    it('should support custom pagination parameters', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              type: 'workspace_membership',
              user: {
                display_name: 'Test User',
                uuid: '{user-uuid}',
                username: 'testuser',
                account_id: 'account-id',
                nickname: 'testuser',
                type: 'user',
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
          ],
          size: 1,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      await handlers.listWorkspaceMembers({
        page: 2,
        pagelen: 50,
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/workspaces/${workspace}/members`,
        {
          params: { page: 2, pagelen: 50 },
        }
      );
    });

    it('should handle members without avatar or profile links', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              type: 'workspace_membership',
              user: {
                display_name: 'No Links User',
                uuid: '{user-uuid}',
                username: 'nolinks',
                account_id: 'account-id',
                nickname: 'nolinks',
                type: 'user',
                // No links property
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
          ],
          size: 1,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listWorkspaceMembers({});

      const data = JSON.parse(result.content[0].text);
      expect(data.members[0].avatar_url).toBe(null);
      expect(data.members[0].profile_url).toBe(null);
    });

    it('should handle empty members list', async () => {
      const mockResponse = {
        data: {
          values: [],
          size: 0,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listWorkspaceMembers({});

      const data = JSON.parse(result.content[0].text);
      expect(data.members).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });

    it('should use default values when size is not provided', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              type: 'workspace_membership',
              user: {
                display_name: 'Test User',
                uuid: '{user-uuid}',
                username: 'testuser',
                account_id: 'account-id',
                nickname: 'testuser',
                type: 'user',
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
          ],
          // No size property
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listWorkspaceMembers({});

      const data = JSON.parse(result.content[0].text);
      expect(data.pagination.total).toBe(1); // Falls back to members.length
    });

    it('should find users by display name for reviewer lookup', async () => {
      const mockResponse = {
        data: {
          values: [
            {
              type: 'workspace_membership',
              user: {
                display_name: 'John Doe',
                uuid: '{user-uuid-1}',
                username: 'john.doe',
                account_id: 'account-id-1',
                nickname: 'johndoe',
                type: 'user',
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
            {
              type: 'workspace_membership',
              user: {
                display_name: 'Gareth Williams',
                uuid: '{user-uuid-2}',
                username: 'gareth.williams',
                account_id: 'account-id-2',
                nickname: 'garethw',
                type: 'user',
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
            {
              type: 'workspace_membership',
              user: {
                display_name: 'Gareth Jones',
                uuid: '{user-uuid-3}',
                username: 'gareth.jones',
                account_id: 'account-id-3',
                nickname: 'garethj',
                type: 'user',
              },
              workspace: {
                type: 'workspace',
                uuid: '{workspace-uuid}',
                name: 'Test Workspace',
                slug: 'test-workspace',
              },
            },
          ],
          size: 3,
        },
      };

      vi.mocked(mockAxios.get).mockResolvedValueOnce(mockResponse);

      const result = await handlers.listWorkspaceMembers({});
      const data = JSON.parse(result.content[0].text);

      // Simulate searching for "Gareth" in display names
      const garethMembers = data.members.filter((member: any) =>
        member.display_name.toLowerCase().includes('gareth')
      );

      expect(garethMembers).toHaveLength(2);
      expect(garethMembers[0].username).toBe('gareth.williams');
      expect(garethMembers[1].username).toBe('gareth.jones');
    });
  });
});
