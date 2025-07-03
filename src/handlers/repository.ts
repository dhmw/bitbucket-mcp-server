/**
 * Repository-related operation handlers
 */

import { AxiosInstance, AxiosError } from 'axios';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { 
  BitbucketRepository, 
  BitbucketBranch, 
  BitbucketTag, 
  BitbucketCommit 
} from '../types.js';

export class RepositoryHandlers {
  constructor(
    private axiosInstance: AxiosInstance,
    private workspace: string
  ) {}

  async listRepositories(args: any = {}) {
    const page = args.page || 1;
    const pagelen = args.pagelen || 10;
    const project = args.project;

    // Build query parameters
    const params: any = { page, pagelen };
    
    // Add project filter if specified
    if (project) {
      params.q = `project.key="${project}"`;
    }

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}`,
      { params }
    );

    const repositories: BitbucketRepository[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repositories: repositories.map(repo => ({
              name: repo.name,
              full_name: repo.full_name,
              is_private: repo.is_private,
              description: repo.description || 'No description',
            })),
            filter: {
              project: project || 'all projects',
            },
            pagination: {
              page,
              pagelen,
              total: response.data.size || repositories.length,
            }
          }, null, 2),
        },
      ],
    };
  }

  async listProjects(args: any = {}) {
    const page = args.page || 1;
    const pagelen = args.pagelen || 10;

    const response = await this.axiosInstance.get(
      `/workspaces/${this.workspace}/projects`,
      {
        params: { page, pagelen }
      }
    );

    const projects = response.data.values || [];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            workspace: this.workspace,
            projects: projects.map((project: any) => ({
              key: project.key,
              name: project.name,
              description: project.description || 'No description',
              is_private: project.is_private,
              created_on: project.created_on,
              updated_on: project.updated_on,
              owner: project.owner ? {
                display_name: project.owner.display_name,
                username: project.owner.username,
              } : null,
              links: project.links?.html?.href ? {
                html: project.links.html.href,
              } : null,
            })),
            pagination: {
              page,
              pagelen,
              total: response.data.size || projects.length,
            }
          }, null, 2),
        },
      ],
    };
  }

  async listBranches(args: any) {
    const { repository } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/refs/branches`
    );

    const branches: BitbucketBranch[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repository,
            branches: branches.map(branch => ({
              name: branch.name,
              commit_hash: branch.target.hash,
              commit_message: branch.target.message,
            })),
          }, null, 2),
        },
      ],
    };
  }

  async listTags(args: any) {
    const { repository, page = 1, pagelen = 10 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/refs/tags`,
      {
        params: { page, pagelen }
      }
    );

    const tags: BitbucketTag[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repository,
            tags: tags.map(tag => ({
              name: tag.name,
              commit_hash: tag.target.hash,
              commit_message: tag.target.message,
              commit_date: tag.target.date,
              tagger: tag.tagger ? {
                name: tag.tagger.user.display_name,
                username: tag.tagger.user.username,
                tagged_on: tag.tagger.date,
              } : null,
            })),
            pagination: {
              page,
              pagelen,
              total: response.data.size || tags.length,
            }
          }, null, 2),
        },
      ],
    };
  }

  async getBranchCommits(args: any) {
    const { repository, branch, page = 1, pagelen = 10 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${this.workspace}/${repository}/commits/${branch}`,
      {
        params: { page, pagelen }
      }
    );

    const commits: BitbucketCommit[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repository,
            branch,
            commits: commits.map(commit => ({
              hash: commit.hash,
              message: commit.message,
              date: commit.date,
              author: {
                raw: commit.author.raw,
                display_name: commit.author.user?.display_name || 'Unknown',
                username: commit.author.user?.username || 'unknown',
              },
              parents: commit.parents.map(parent => parent.hash),
              url: commit.links.html.href,
            })),
            pagination: {
              page,
              pagelen,
              total: response.data.size || commits.length,
            }
          }, null, 2),
        },
      ],
    };
  }

  async cloneRepository(args: any) {
    const { repository, directory, protocol = 'ssh', branch } = args;

    try {
      // First, get repository info to verify it exists and get clone URLs
      const repoResponse = await this.axiosInstance.get(
        `/repositories/${this.workspace}/${repository}`
      );

      const repoData = repoResponse.data;
      const cloneLinks = repoData.links?.clone;

      if (!cloneLinks) {
        throw new Error('Repository clone links not available');
      }

      // Get the appropriate clone URL based on protocol
      let cloneUrl: string;
      if (protocol === 'ssh') {
        const sshLink = cloneLinks.find((link: any) => link.name === 'ssh');
        if (!sshLink) {
          throw new Error('SSH clone URL not available for this repository');
        }
        cloneUrl = sshLink.href;
      } else {
        const httpsLink = cloneLinks.find((link: any) => link.name === 'https');
        if (!httpsLink) {
          throw new Error('HTTPS clone URL not available for this repository');
        }
        cloneUrl = httpsLink.href;
      }

      // Build git clone command
      const targetDirectory = directory || repository;
      let gitCommand = `git clone ${cloneUrl}`;
      
      if (branch) {
        gitCommand += ` --branch ${branch}`;
      }
      
      gitCommand += ` ${targetDirectory}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Repository clone information prepared',
              repository: repoData.name,
              full_name: repoData.full_name,
              clone_url: cloneUrl,
              protocol,
              target_directory: targetDirectory,
              branch: branch || 'default',
              command: gitCommand,
              instructions: [
                'To clone this repository, run the following command:',
                gitCommand,
                '',
                'Note: For SSH cloning, ensure you have:',
                '1. SSH keys configured in your Bitbucket account',
                '2. SSH agent running with your key loaded',
                '3. Bitbucket.org added to your known_hosts'
              ].join('\n'),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        
        if (status === 404) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Repository '${repository}' not found in workspace '${this.workspace}'`
          );
        }
      }
      throw error;
    }
  }
}
