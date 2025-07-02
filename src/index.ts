#!/usr/bin/env node

/**
 * Bitbucket MCP Server
 * 
 * This MCP server provides tools for interacting with Bitbucket repositories:
 * - Creating branches
 * - Creating and managing pull requests
 * - Reviewing pull requests
 * - Managing repositories
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance, AxiosError } from 'axios';

// Environment variables for authentication
const BITBUCKET_USERNAME = process.env.BITBUCKET_USERNAME;
const BITBUCKET_APP_PASSWORD = process.env.BITBUCKET_APP_PASSWORD;
const BITBUCKET_WORKSPACE = process.env.BITBUCKET_WORKSPACE;

if (!BITBUCKET_USERNAME || !BITBUCKET_APP_PASSWORD) {
  throw new Error('BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD environment variables are required');
}

if (!BITBUCKET_WORKSPACE) {
  throw new Error('BITBUCKET_WORKSPACE environment variable is required');
}

interface BitbucketRepository {
  name: string;
  full_name: string;
  uuid: string;
  is_private: boolean;
  description?: string;
}

interface BitbucketBranch {
  name: string;
  target: {
    hash: string;
    message: string;
  };
}

interface BitbucketTag {
  name: string;
  target: {
    hash: string;
    message: string;
    date: string;
  };
  tagger?: {
    user: {
      display_name: string;
      username: string;
    };
    date: string;
  };
}

interface BitbucketCommit {
  hash: string;
  message: string;
  date: string;
  author: {
    raw: string;
    user?: {
      display_name: string;
      username: string;
      uuid: string;
    };
  };
  parents: Array<{
    hash: string;
  }>;
  links: {
    html: { href: string };
  };
}

interface BitbucketPullRequest {
  id: number;
  title: string;
  description?: string;
  state: 'OPEN' | 'MERGED' | 'DECLINED';
  source: {
    branch: { name: string };
    repository: { full_name: string };
  };
  destination: {
    branch: { name: string };
    repository: { full_name: string };
  };
  author: {
    display_name: string;
    username: string;
  };
  created_on: string;
  updated_on: string;
  links: {
    html: { href: string };
  };
}

interface BitbucketComment {
  id: number;
  content: {
    raw: string;
    html: string;
  };
  user: {
    display_name: string;
    username: string;
    uuid: string;
  };
  created_on: string;
  updated_on: string;
  links: {
    html: { href: string };
  };
  inline?: {
    from?: number;
    to?: number;
    path: string;
  };
}

interface BitbucketDeployment {
  type: string;
  uuid: string;
  number: number;
  key: string;
  version?: number;
  created_on: string;
  state: {
    type: string;
    name: string;
    trigger_url?: string;
    triggerUrl?: string;
  };
  environment: {
    uuid: string;
  };
  step?: {
    uuid: string;
  };
  deployable: {
    type: string;
    uuid: string;
    pipeline: {
      uuid: string;
      type: string;
    };
    key: string;
    name: string;
    url: string;
    commit: {
      hash: string;
      links: {
        self: { href: string };
        html: { href: string };
      };
      type: string;
    };
    created_on: string;
  };
  release: {
    type: string;
    uuid: string;
    pipeline: {
      uuid: string;
      type: string;
    };
    key: string;
    name: string;
    url: string;
    commit: {
      hash: string;
      links: {
        self: { href: string };
        html: { href: string };
      };
      type: string;
    };
    created_on: string;
  };
}

class BitbucketServer {
  private server: Server;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "bitbucket-mcp-server",
        version: "0.4.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Create axios instance with Bitbucket API configuration
    this.axiosInstance = axios.create({
      baseURL: 'https://api.bitbucket.org/2.0',
      auth: {
        username: BITBUCKET_USERNAME!,
        password: BITBUCKET_APP_PASSWORD!,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_repositories',
          description: 'List repositories in the workspace',
          inputSchema: {
            type: 'object',
            properties: {
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                minimum: 1,
              },
              pagelen: {
                type: 'number',
                description: 'Number of repositories per page (default: 10, max: 100)',
                minimum: 1,
                maximum: 100,
              },
              project: {
                type: 'string',
                description: 'Filter repositories by project key (optional)',
              },
            },
          },
        },
        {
          name: 'list_projects',
          description: 'List all projects in the workspace',
          inputSchema: {
            type: 'object',
            properties: {
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                minimum: 1,
              },
              pagelen: {
                type: 'number',
                description: 'Number of projects per page (default: 10, max: 100)',
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: 'list_branches',
          description: 'List branches in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
            },
            required: ['repository'],
          },
        },
        {
          name: 'list_tags',
          description: 'List tags in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                minimum: 1,
              },
              pagelen: {
                type: 'number',
                description: 'Number of tags per page (default: 10, max: 100)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['repository'],
          },
        },
        {
          name: 'get_branch_commits',
          description: 'Get commit history and details for a specific branch',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              branch: {
                type: 'string',
                description: 'Branch name (e.g., "main", "develop")',
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                minimum: 1,
              },
              pagelen: {
                type: 'number',
                description: 'Number of commits per page (default: 10, max: 100)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['repository', 'branch'],
          },
        },
        {
          name: 'create_branch',
          description: 'Create a new branch in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              branch_name: {
                type: 'string',
                description: 'Name of the new branch',
              },
              source_branch: {
                type: 'string',
                description: 'Source branch to create from (default: "main")',
              },
            },
            required: ['repository', 'branch_name'],
          },
        },
        {
          name: 'create_pull_request',
          description: 'Create a new pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              title: {
                type: 'string',
                description: 'Pull request title',
              },
              description: {
                type: 'string',
                description: 'Pull request description',
              },
              source_branch: {
                type: 'string',
                description: 'Source branch name',
              },
              destination_branch: {
                type: 'string',
                description: 'Destination branch name (default: "main")',
              },
              reviewers: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Array of reviewer usernames',
              },
            },
            required: ['repository', 'title', 'source_branch'],
          },
        },
        {
          name: 'list_pull_requests',
          description: 'List pull requests in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              state: {
                type: 'string',
                enum: ['OPEN', 'MERGED', 'DECLINED'],
                description: 'Filter by pull request state (default: OPEN)',
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                minimum: 1,
              },
            },
            required: ['repository'],
          },
        },
        {
          name: 'get_pull_request',
          description: 'Get details of a specific pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              pull_request_id: {
                type: 'number',
                description: 'Pull request ID',
              },
            },
            required: ['repository', 'pull_request_id'],
          },
        },
        {
          name: 'approve_pull_request',
          description: 'Approve a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              pull_request_id: {
                type: 'number',
                description: 'Pull request ID',
              },
            },
            required: ['repository', 'pull_request_id'],
          },
        },
        {
          name: 'decline_pull_request',
          description: 'Decline a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              pull_request_id: {
                type: 'number',
                description: 'Pull request ID',
              },
              reason: {
                type: 'string',
                description: 'Reason for declining the pull request',
              },
            },
            required: ['repository', 'pull_request_id'],
          },
        },
        {
          name: 'merge_pull_request',
          description: 'Merge a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              pull_request_id: {
                type: 'number',
                description: 'Pull request ID',
              },
              merge_strategy: {
                type: 'string',
                enum: ['merge_commit', 'squash', 'fast_forward'],
                description: 'Merge strategy to use (default: merge_commit)',
              },
              close_source_branch: {
                type: 'boolean',
                description: 'Whether to close the source branch after merge (default: false)',
              },
            },
            required: ['repository', 'pull_request_id'],
          },
        },
        {
          name: 'get_pull_request_comments',
          description: 'Get all comments from a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              pull_request_id: {
                type: 'number',
                description: 'Pull request ID',
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                minimum: 1,
              },
              pagelen: {
                type: 'number',
                description: 'Number of comments per page (default: 20, max: 100)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['repository', 'pull_request_id'],
          },
        },
        {
          name: 'add_pull_request_comment',
          description: 'Add a comment to a pull request',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              pull_request_id: {
                type: 'number',
                description: 'Pull request ID',
              },
              content: {
                type: 'string',
                description: 'Comment content',
              },
            },
            required: ['repository', 'pull_request_id', 'content'],
          },
        },
        {
          name: 'list_deployments',
          description: 'List deployments for a repository',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              environment: {
                type: 'string',
                description: 'Filter by environment name (optional)',
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                minimum: 1,
              },
              pagelen: {
                type: 'number',
                description: 'Number of deployments per page (default: 10, max: 100)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['repository'],
          },
        },
        {
          name: 'get_deployment',
          description: 'Get details of a specific deployment',
          inputSchema: {
            type: 'object',
            properties: {
              repository: {
                type: 'string',
                description: 'Repository name (e.g., "my-repo")',
              },
              deployment_uuid: {
                type: 'string',
                description: 'Deployment UUID',
              },
            },
            required: ['repository', 'deployment_uuid'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'list_repositories':
            return await this.listRepositories(request.params.arguments);
          
          case 'list_projects':
            return await this.listProjects(request.params.arguments);
          
          case 'list_branches':
            return await this.listBranches(request.params.arguments);
          
          case 'list_tags':
            return await this.listTags(request.params.arguments);
          
          case 'get_branch_commits':
            return await this.getBranchCommits(request.params.arguments);
          
          case 'create_branch':
            return await this.createBranch(request.params.arguments);
          
          case 'create_pull_request':
            return await this.createPullRequest(request.params.arguments);
          
          case 'list_pull_requests':
            return await this.listPullRequests(request.params.arguments);
          
          case 'get_pull_request':
            return await this.getPullRequest(request.params.arguments);
          
          case 'approve_pull_request':
            return await this.approvePullRequest(request.params.arguments);
          
          case 'decline_pull_request':
            return await this.declinePullRequest(request.params.arguments);
          
          case 'merge_pull_request':
            return await this.mergePullRequest(request.params.arguments);
          
          case 'get_pull_request_comments':
            return await this.getPullRequestComments(request.params.arguments);
          
          case 'add_pull_request_comment':
            return await this.addPullRequestComment(request.params.arguments);
          
          case 'list_deployments':
            return await this.listDeployments(request.params.arguments);
          
          case 'get_deployment':
            return await this.getDeployment(request.params.arguments);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;
          const message = axiosError.response?.data || axiosError.message;
          
          throw new McpError(
            ErrorCode.InternalError,
            `Bitbucket API error (${status}): ${JSON.stringify(message)}`
          );
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async listRepositories(args: any = {}) {
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
      `/repositories/${BITBUCKET_WORKSPACE}`,
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

  private async listProjects(args: any = {}) {
    const page = args.page || 1;
    const pagelen = args.pagelen || 10;

    const response = await this.axiosInstance.get(
      `/workspaces/${BITBUCKET_WORKSPACE}/projects`,
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
            workspace: BITBUCKET_WORKSPACE,
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

  private async listBranches(args: any) {
    const { repository } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/refs/branches`
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

  private async listTags(args: any) {
    const { repository, page = 1, pagelen = 10 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/refs/tags`,
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

  private async getBranchCommits(args: any) {
    const { repository, branch, page = 1, pagelen = 10 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/commits/${branch}`,
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

  private async createBranch(args: any) {
    const { repository, branch_name, source_branch = 'main' } = args;

    // First, get the source branch to get its target commit
    const sourceBranchResponse = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/refs/branches/${source_branch}`
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
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/refs/branches`,
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

  private async createPullRequest(args: any) {
    const {
      repository,
      title,
      description = '',
      source_branch,
      destination_branch = 'main',
      reviewers = [],
    } = args;

    const pullRequestData = {
      title,
      description,
      source: {
        branch: {
          name: source_branch,
        },
      },
      destination: {
        branch: {
          name: destination_branch,
        },
      },
      reviewers: reviewers.map((username: string) => ({ username })),
    };

    const response = await this.axiosInstance.post(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests`,
      pullRequestData
    );

    const pullRequest: BitbucketPullRequest = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Pull request created successfully',
            pull_request: {
              id: pullRequest.id,
              title: pullRequest.title,
              description: pullRequest.description,
              state: pullRequest.state,
              source_branch: pullRequest.source.branch.name,
              destination_branch: pullRequest.destination.branch.name,
              author: pullRequest.author.display_name,
              url: pullRequest.links.html.href,
              created_on: pullRequest.created_on,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async listPullRequests(args: any) {
    const { repository, state = 'OPEN', page = 1 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests`,
      {
        params: { state, page }
      }
    );

    const pullRequests: BitbucketPullRequest[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repository,
            state,
            pull_requests: pullRequests.map(pr => ({
              id: pr.id,
              title: pr.title,
              state: pr.state,
              source_branch: pr.source.branch.name,
              destination_branch: pr.destination.branch.name,
              author: pr.author.display_name,
              created_on: pr.created_on,
              updated_on: pr.updated_on,
              url: pr.links.html.href,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async getPullRequest(args: any) {
    const { repository, pull_request_id } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests/${pull_request_id}`
    );

    const pullRequest: BitbucketPullRequest = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: pullRequest.id,
            title: pullRequest.title,
            description: pullRequest.description,
            state: pullRequest.state,
            source_branch: pullRequest.source.branch.name,
            destination_branch: pullRequest.destination.branch.name,
            author: {
              display_name: pullRequest.author.display_name,
              username: pullRequest.author.username,
            },
            created_on: pullRequest.created_on,
            updated_on: pullRequest.updated_on,
            url: pullRequest.links.html.href,
          }, null, 2),
        },
      ],
    };
  }

  private async approvePullRequest(args: any) {
    const { repository, pull_request_id } = args;

    const response = await this.axiosInstance.post(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests/${pull_request_id}/approve`,
      {} // Empty object as request body
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Pull request #${pull_request_id} approved successfully`,
            repository,
            pull_request_id,
            approved_by: BITBUCKET_USERNAME,
            approval_date: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async declinePullRequest(args: any) {
    const { repository, pull_request_id, reason } = args;

    const declineData = reason ? { reason } : {};

    const response = await this.axiosInstance.post(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests/${pull_request_id}/decline`,
      declineData
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Pull request #${pull_request_id} declined successfully`,
            repository,
            pull_request_id,
            reason: reason || 'No reason provided',
            declined_by: BITBUCKET_USERNAME,
          }, null, 2),
        },
      ],
    };
  }

  private async mergePullRequest(args: any) {
    const {
      repository,
      pull_request_id,
      merge_strategy = 'merge_commit',
      close_source_branch = false,
    } = args;

    const mergeData = {
      type: merge_strategy,
      close_source_branch,
    };

    const response = await this.axiosInstance.post(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests/${pull_request_id}/merge`,
      mergeData
    );

    const mergedPR: BitbucketPullRequest = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Pull request #${pull_request_id} merged successfully`,
            repository,
            pull_request: {
              id: mergedPR.id,
              title: mergedPR.title,
              state: mergedPR.state,
              merge_strategy,
              close_source_branch,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async getPullRequestComments(args: any) {
    const { repository, pull_request_id, page = 1, pagelen = 20 } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests/${pull_request_id}/comments`,
      {
        params: { page, pagelen }
      }
    );

    const comments: BitbucketComment[] = response.data.values;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            repository,
            pull_request_id,
            comments: comments.map(comment => ({
              id: comment.id,
              content: {
                raw: comment.content.raw,
                html: comment.content.html,
              },
              author: {
                display_name: comment.user.display_name,
                username: comment.user.username,
              },
              created_on: comment.created_on,
              updated_on: comment.updated_on,
              url: comment.links.html.href,
              inline: comment.inline ? {
                path: comment.inline.path,
                from_line: comment.inline.from,
                to_line: comment.inline.to,
              } : null,
            })),
            pagination: {
              page,
              pagelen,
              total: response.data.size || comments.length,
            }
          }, null, 2),
        },
      ],
    };
  }

  private async addPullRequestComment(args: any) {
    const { repository, pull_request_id, content } = args;

    const commentData = {
      content: {
        raw: content,
      },
    };

    const response = await this.axiosInstance.post(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/pullrequests/${pull_request_id}/comments`,
      commentData
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Comment added successfully',
            repository,
            pull_request_id,
            comment: {
              id: response.data.id,
              content: response.data.content.raw,
              author: response.data.user.display_name,
              created_on: response.data.created_on,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async listDeployments(args: any) {
    const { repository, environment, page = 1, pagelen = 10 } = args;

    try {
      // Get environment information first to map UUIDs to names
      const envsResponse = await this.axiosInstance.get(`/repositories/${BITBUCKET_WORKSPACE}/${repository}/environments`);
      const environmentsMap = new Map();
      envsResponse.data.values?.forEach((env: any) => {
        environmentsMap.set(env.uuid, env.name);
      });

      // Get deployment data - need to fetch much more data to find recent deployments
      const fetchSize = Math.max(pagelen * 50, 500); // Fetch much more data to find recent ones
      const response = await this.axiosInstance.get(
        `/repositories/${BITBUCKET_WORKSPACE}/${repository}/deployments`,
        { params: { page: 1, pagelen: fetchSize } }
      );

      let deployments = response.data.values || [];

      // Sort deployments by creation date (newest first)
      deployments.sort((a: any, b: any) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime());

      // Filter by environment if specified
      if (environment) {
        const targetEnvUuid = envsResponse.data.values?.find((env: any) => env.name === environment)?.uuid;
        deployments = deployments.filter((dep: any) => dep.environment?.uuid === targetEnvUuid);
      }

      // Take only the requested number of results
      deployments = deployments.slice(0, pagelen);

      // Transform deployment data for cleaner output
      const transformedDeployments = deployments.map((deployment: any) => ({
        uuid: deployment.uuid,
        number: deployment.number,
        created_on: deployment.created_on,
        state: {
          type: deployment.state.type,
          name: deployment.state.name,
          trigger_url: deployment.state.trigger_url || deployment.state.triggerUrl,
        },
        environment: {
          uuid: deployment.environment.uuid,
          name: environmentsMap.get(deployment.environment.uuid) || 'Unknown',
        },
        deployable: {
          name: deployment.deployable.name,
          url: deployment.deployable.url,
          pipeline_uuid: deployment.deployable.pipeline.uuid,
          commit_hash: deployment.deployable.commit.hash,
          commit_url: deployment.deployable.commit.links.html.href,
          created_on: deployment.deployable.created_on,
        },
        release: {
          name: deployment.release.name,
          url: deployment.release.url,
          pipeline_uuid: deployment.release.pipeline.uuid,
          commit_hash: deployment.release.commit.hash,
          commit_url: deployment.release.commit.links.html.href,
          created_on: deployment.release.created_on,
        },
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              repository,
              environment: environment || 'all',
              deployments: transformedDeployments,
              pagination: {
                page,
                pagelen: transformedDeployments.length,
                total: response.data.size,
                has_next: !!response.data.next,
                has_previous: !!response.data.previous,
              },
              environments_available: Array.from(environmentsMap.values()),
              note: "Deployments are sorted by creation date (newest first). Use 'environment' parameter to filter by specific environment.",
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: "Failed to retrieve deployments",
              repository,
              environment: environment || 'all',
              details: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async getDeployment(args: any) {
    const { repository, deployment_uuid } = args;

    const response = await this.axiosInstance.get(
      `/repositories/${BITBUCKET_WORKSPACE}/${repository}/deployments/${deployment_uuid}`
    );

    const deployment: BitbucketDeployment = response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            uuid: deployment.uuid,
            number: deployment.number,
            key: deployment.key,
            type: deployment.type,
            version: deployment.version,
            created_on: deployment.created_on,
            state: {
              type: deployment.state.type,
              name: deployment.state.name,
              trigger_url: deployment.state.trigger_url || deployment.state.triggerUrl,
            },
            environment: {
              uuid: deployment.environment.uuid,
            },
            step: deployment.step ? {
              uuid: deployment.step.uuid,
            } : null,
            deployable: {
              type: deployment.deployable.type,
              uuid: deployment.deployable.uuid,
              key: deployment.deployable.key,
              name: deployment.deployable.name,
              url: deployment.deployable.url,
              pipeline: {
                uuid: deployment.deployable.pipeline.uuid,
                type: deployment.deployable.pipeline.type,
              },
              commit: {
                hash: deployment.deployable.commit.hash,
                html_url: deployment.deployable.commit.links.html.href,
                type: deployment.deployable.commit.type,
              },
              created_on: deployment.deployable.created_on,
            },
            release: {
              type: deployment.release.type,
              uuid: deployment.release.uuid,
              key: deployment.release.key,
              name: deployment.release.name,
              url: deployment.release.url,
              pipeline: {
                uuid: deployment.release.pipeline.uuid,
                type: deployment.release.pipeline.type,
              },
              commit: {
                hash: deployment.release.commit.hash,
                html_url: deployment.release.commit.links.html.href,
                type: deployment.release.commit.type,
              },
              created_on: deployment.release.created_on,
            },
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Bitbucket MCP server running on stdio');
  }
}

const server = new BitbucketServer();
server.run().catch(console.error);
