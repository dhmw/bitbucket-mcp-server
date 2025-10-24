/**
 * Workspace-related operation handlers
 */

import { AxiosInstance } from 'axios';
import { BitbucketWorkspaceMember } from '../types.js';

export class WorkspaceHandlers {
  constructor(
    private axiosInstance: AxiosInstance,
    private workspace: string
  ) {}

  async listWorkspaceMembers(args: any = {}) {
    const page = args.page || 1;
    const pagelen = args.pagelen || 100; // Default to higher limit for members

    const response = await this.axiosInstance.get(
      `/workspaces/${this.workspace}/members`,
      {
        params: { page, pagelen }
      }
    );

    const members: BitbucketWorkspaceMember[] = response.data.values || [];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            workspace: this.workspace,
            members: members.map(member => ({
              username: member.user.username,
              display_name: member.user.display_name,
              uuid: member.user.uuid,
              account_id: member.user.account_id,
              nickname: member.user.nickname,
              avatar_url: member.user.links?.avatar?.href || null,
              profile_url: member.user.links?.html?.href || null,
            })),
            pagination: {
              page,
              pagelen,
              total: response.data.size || members.length,
            }
          }, null, 2),
        },
      ],
    };
  }
}
