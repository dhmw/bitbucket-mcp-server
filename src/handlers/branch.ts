/**
 * Branch-related operation handlers
 */

import { AxiosInstance } from 'axios';

export class BranchHandlers {
  constructor(
    private axiosInstance: AxiosInstance,
    private workspace: string
  ) {}

  async createBranch(args: any) {
    const { repository, branch_name, source_branch = 'main' } = args;

    // First, get the source branch to get its target commit
    const sourceBranchResponse = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/refs/branches/${source_branch}`
    );

    const targetHash = sourceBranchResponse.data.target.hash;

    // Create the new branch
    const branchData = {
      name: branch_name,
      target: {
        hash: targetHash,
      },
    };

    const response = await this.axiosInstance.post(
      `/repositories/${this.workspace}/${repository}/refs/branches`,
      branchData
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Branch '${branch_name}' created successfully`,
            repository,
            branch: {
              name: response.data.name,
              source_branch,
              commit_hash: response.data.target.hash,
            },
          }, null, 2),
        },
      ],
    };
  }
}
