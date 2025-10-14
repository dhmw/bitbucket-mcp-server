/**
 * MCP Tool definitions and schemas for Bitbucket operations
 */

export const TOOL_SCHEMAS = [
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
  {
    name: 'clone_repository',
    description: 'Clone a repository using SSH protocol (default) or HTTPS',
    inputSchema: {
      type: 'object',
      properties: {
        repository: {
          type: 'string',
          description: 'Repository name (e.g., "my-repo")',
        },
        directory: {
          type: 'string',
          description: 'Local directory to clone into (optional, defaults to repository name)',
        },
        protocol: {
          type: 'string',
          enum: ['ssh', 'https'],
          description: 'Protocol to use for cloning (default: ssh)',
        },
        branch: {
          type: 'string',
          description: 'Specific branch to clone (optional)',
        },
      },
      required: ['repository'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project in the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Project key (must be unique, uppercase, max 10 characters, e.g., "PROJ")',
        },
        name: {
          type: 'string',
          description: 'Project name',
        },
        description: {
          type: 'string',
          description: 'Project description (optional)',
        },
        is_private: {
          type: 'boolean',
          description: 'Whether the project is private (default: true)',
        },
      },
      required: ['key', 'name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update an existing project in the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Project key (e.g., "PROJ")',
        },
        name: {
          type: 'string',
          description: 'New project name (optional)',
        },
        description: {
          type: 'string',
          description: 'New project description (optional)',
        },
        is_private: {
          type: 'boolean',
          description: 'Whether the project is private (optional)',
        },
      },
      required: ['key'],
    },
  },
  {
    name: 'create_repository',
    description: 'Create a new repository in the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Repository name (lowercase with hyphens, e.g., "my-repo")',
        },
        project_key: {
          type: 'string',
          description: 'Project key to create repository in (optional)',
        },
        description: {
          type: 'string',
          description: 'Repository description (optional)',
        },
        is_private: {
          type: 'boolean',
          description: 'Whether the repository is private (default: true)',
        },
        has_wiki: {
          type: 'boolean',
          description: 'Enable wiki (default: false)',
        },
        has_issues: {
          type: 'boolean',
          description: 'Enable issue tracker (default: false)',
        },
        fork_policy: {
          type: 'string',
          enum: ['allow_forks', 'no_public_forks', 'no_forks'],
          description: 'Fork policy (default: allow_forks)',
        },
      },
      required: ['name'],
    },
  },
];
