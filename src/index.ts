#!/usr/bin/env node

/**
 * Bitbucket MCP Server
 * 
 * This MCP server provides tools for interacting with Bitbucket repositories:
 * - Creating branches
 * - Creating and managing pull requests
 * - Reviewing pull requests
 * - Managing repositories
 * - Repository cloning with SSH/HTTPS support
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

import { TOOL_SCHEMAS } from './tools.js';
import { RepositoryHandlers } from './handlers/repository.js';
import { BranchHandlers } from './handlers/branch.js';
import { PullRequestHandlers } from './handlers/pullRequest.js';
import { DeploymentHandlers } from './handlers/deployment.js';

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

class BitbucketServer {
  private server: Server;
  private axiosInstance: AxiosInstance;
  
  // Handler instances
  private repositoryHandlers: RepositoryHandlers;
  private branchHandlers: BranchHandlers;
  private pullRequestHandlers: PullRequestHandlers;
  private deploymentHandlers: DeploymentHandlers;

  constructor() {
    this.server = new Server(
      {
        name: "bitbucket-mcp-server",
        version: "0.5.0",
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

    // Initialize handler instances
    this.repositoryHandlers = new RepositoryHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);
    this.branchHandlers = new BranchHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);
    this.pullRequestHandlers = new PullRequestHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!, BITBUCKET_USERNAME!);
    this.deploymentHandlers = new DeploymentHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // Register all tool schemas
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_SCHEMAS,
    }));

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          // Repository operations
          case 'list_repositories':
            return await this.repositoryHandlers.listRepositories(request.params.arguments);
          
          case 'list_projects':
            return await this.repositoryHandlers.listProjects(request.params.arguments);
          
          case 'list_branches':
            return await this.repositoryHandlers.listBranches(request.params.arguments);
          
          case 'list_tags':
            return await this.repositoryHandlers.listTags(request.params.arguments);
          
          case 'get_branch_commits':
            return await this.repositoryHandlers.getBranchCommits(request.params.arguments);
          
          case 'clone_repository':
            return await this.repositoryHandlers.cloneRepository(request.params.arguments);
          
          // Branch operations
          case 'create_branch':
            return await this.branchHandlers.createBranch(request.params.arguments);
          
          // Pull Request operations
          case 'create_pull_request':
            return await this.pullRequestHandlers.createPullRequest(request.params.arguments);
          
          case 'list_pull_requests':
            return await this.pullRequestHandlers.listPullRequests(request.params.arguments);
          
          case 'get_pull_request':
            return await this.pullRequestHandlers.getPullRequest(request.params.arguments);
          
          case 'approve_pull_request':
            return await this.pullRequestHandlers.approvePullRequest(request.params.arguments);
          
          case 'decline_pull_request':
            return await this.pullRequestHandlers.declinePullRequest(request.params.arguments);
          
          case 'merge_pull_request':
            return await this.pullRequestHandlers.mergePullRequest(request.params.arguments);
          
          case 'get_pull_request_comments':
            return await this.pullRequestHandlers.getPullRequestComments(request.params.arguments);
          
          case 'add_pull_request_comment':
            return await this.pullRequestHandlers.addPullRequestComment(request.params.arguments);
          
          // Deployment operations
          case 'list_deployments':
            return await this.deploymentHandlers.listDeployments(request.params.arguments);
          
          case 'get_deployment':
            return await this.deploymentHandlers.getDeployment(request.params.arguments);
          
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Bitbucket MCP server running on stdio');
  }
}

const server = new BitbucketServer();
server.run().catch(console.error);
