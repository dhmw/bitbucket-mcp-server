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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { TOOL_SCHEMAS } from './tools.js';
import { RepositoryHandlers } from './handlers/repository.js';
import { BranchHandlers } from './handlers/branch.js';
import { PullRequestHandlers } from './handlers/pullRequest.js';
import { DeploymentHandlers } from './handlers/deployment.js';
import { WorkspaceHandlers } from './handlers/workspace.js';
import { runOAuthFlow, TokenData } from './oauth-flow.js';

// Environment variables for authentication
const BITBUCKET_OAUTH_CLIENT_ID = process.env.BITBUCKET_OAUTH_CLIENT_ID;
const BITBUCKET_OAUTH_CLIENT_SECRET = process.env.BITBUCKET_OAUTH_CLIENT_SECRET;
const BITBUCKET_OAUTH_TOKEN_FILE = process.env.BITBUCKET_OAUTH_TOKEN_FILE || path.join(os.homedir(), '.bitbucket-mcp-tokens.json');
const BITBUCKET_WORKSPACE = process.env.BITBUCKET_WORKSPACE;

// Validate required environment variables
if (!BITBUCKET_OAUTH_CLIENT_ID || !BITBUCKET_OAUTH_CLIENT_SECRET) {
  throw new Error('BITBUCKET_OAUTH_CLIENT_ID and BITBUCKET_OAUTH_CLIENT_SECRET environment variables are required');
}

if (!BITBUCKET_WORKSPACE) {
  throw new Error('BITBUCKET_WORKSPACE environment variable is required');
}

// OAuth2 token management
let tokenData: TokenData | null = null;

async function loadTokens(): Promise<void> {
  try {
    if (fs.existsSync(BITBUCKET_OAUTH_TOKEN_FILE)) {
      const data = fs.readFileSync(BITBUCKET_OAUTH_TOKEN_FILE, 'utf8');
      tokenData = JSON.parse(data);
    }
  } catch (error) {
    console.error('Warning: Failed to load OAuth tokens:', error);
  }
}

async function saveTokens(tokens: TokenData): Promise<void> {
  try {
    fs.writeFileSync(BITBUCKET_OAUTH_TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
    tokenData = tokens;
  } catch (error) {
    console.error('Warning: Failed to save OAuth tokens:', error);
  }
}

// OAuth2 authorization flow wrapper
async function runAuthorizationFlow(): Promise<TokenData> {
  return await runOAuthFlow({
    clientId: BITBUCKET_OAUTH_CLIENT_ID!,
    clientSecret: BITBUCKET_OAUTH_CLIENT_SECRET!,
  });
}

// Track if we're currently in an authorization flow to provide better error messages
let authorizationInProgress = false;

async function getOAuthAccessToken(): Promise<string> {
  // Load tokens if not already loaded
  if (!tokenData) {
    await loadTokens();
  }

  // Return cached token if still valid (with 5 minute buffer)
  if (tokenData && tokenData.access_token && Date.now() < tokenData.expires_at - 300000) {
    return tokenData.access_token;
  }

  // Try to refresh token if we have a refresh token
  if (tokenData?.refresh_token) {
    try {
      const response = await axios.post(
        'https://bitbucket.org/site/oauth2/access_token',
        `grant_type=refresh_token&refresh_token=${tokenData.refresh_token}`,
        {
          auth: {
            username: BITBUCKET_OAUTH_CLIENT_ID!,
            password: BITBUCKET_OAUTH_CLIENT_SECRET!,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const newTokens: TokenData = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || tokenData.refresh_token,
        expires_at: Date.now() + (response.data.expires_in * 1000),
        scopes: response.data.scopes || response.data.scope || tokenData.scopes,
      };

      await saveTokens(newTokens);
      return newTokens.access_token;
    } catch (error) {
      // Refresh failed, need to re-authorize
      if (authorizationInProgress) {
        throw new Error('Authorization already in progress. Please complete the authorization in your browser.');
      }

      console.error('⚠️  Token refresh failed, starting new authorization flow...');
      authorizationInProgress = true;

      // Start the flow in the background
      runAuthorizationFlow()
        .then(async (tokens) => {
          await saveTokens(tokens);
          authorizationInProgress = false;
          console.error('✅ Authorization completed! You can now retry your request.');
        })
        .catch((error) => {
          authorizationInProgress = false;
          console.error('❌ Authorization failed:', error.message);
        });

      throw new Error(
        'Token refresh failed. Opening browser for re-authorization...\n\n' +
        'A browser window should open automatically. If it doesn\'t, check the MCP server logs for the authorization URL.\n' +
        'Please authorize the application, then try your request again.'
      );
    }
  }

  // No refresh token available - start authorization flow
  if (authorizationInProgress) {
    throw new Error('Authorization already in progress. Please complete the authorization in your browser.');
  }

  console.error('⚠️  No OAuth tokens found, starting authorization flow...');
  authorizationInProgress = true;

  // Start the flow in the background
  runAuthorizationFlow()
    .then(async (tokens) => {
      await saveTokens(tokens);
      authorizationInProgress = false;
      console.error('✅ Authorization completed! You can now retry your request.');
    })
    .catch((error) => {
      authorizationInProgress = false;
      console.error('❌ Authorization failed:', error.message);
    });

  throw new Error(
    'OAuth authorization required. Opening browser for authorization...\n\n' +
    'A browser window should open automatically at http://localhost:8234\n' +
    'Please authorize the application in your browser, then try your request again.'
  );
}

class BitbucketServer {
  private server: Server;
  private axiosInstance: AxiosInstance;

  // Handler instances
  private repositoryHandlers: RepositoryHandlers;
  private branchHandlers: BranchHandlers;
  private pullRequestHandlers: PullRequestHandlers;
  private deploymentHandlers: DeploymentHandlers;
  private workspaceHandlers: WorkspaceHandlers;

  constructor() {
    this.server = new Server(
      {
        name: "bitbucket-mcp-server",
        version: "0.6.0",
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
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add OAuth2 interceptor to inject Bearer token on every request
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await getOAuthAccessToken();
      config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });

    // Initialize handler instances
    this.repositoryHandlers = new RepositoryHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);
    this.branchHandlers = new BranchHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);
    this.pullRequestHandlers = new PullRequestHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);
    this.deploymentHandlers = new DeploymentHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);
    this.workspaceHandlers = new WorkspaceHandlers(this.axiosInstance, BITBUCKET_WORKSPACE!);

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

          case 'list_workspace_members':
            return await this.workspaceHandlers.listWorkspaceMembers(request.params.arguments);

          case 'list_branches':
            return await this.repositoryHandlers.listBranches(request.params.arguments);

          case 'list_tags':
            return await this.repositoryHandlers.listTags(request.params.arguments);

          case 'get_branch_commits':
            return await this.repositoryHandlers.getBranchCommits(request.params.arguments);

          case 'get_default_reviewers':
            return await this.repositoryHandlers.getDefaultReviewers(request.params.arguments);

          case 'clone_repository':
            return await this.repositoryHandlers.cloneRepository(request.params.arguments);

          // Project operations
          case 'create_project':
            return await this.repositoryHandlers.createProject(request.params.arguments);

          case 'update_project':
            return await this.repositoryHandlers.updateProject(request.params.arguments);

          case 'create_repository':
            return await this.repositoryHandlers.createRepository(request.params.arguments);

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

          case 'update_pull_request':
            return await this.pullRequestHandlers.updatePullRequest(request.params.arguments);

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

          // Check if this is a network/connection error
          if (!axiosError.response) {
            if (axiosError.code === 'ECONNREFUSED') {
              throw new McpError(
                ErrorCode.InternalError,
                `Cannot connect to Bitbucket API. Please check your internet connection.`
              );
            }
            throw new McpError(
              ErrorCode.InternalError,
              `Network error: ${axiosError.message}. This might be an OAuth authorization issue - check that you've authorized the app.`
            );
          }

          const status = axiosError.response.status;
          const message = axiosError.response.data || axiosError.message;

          // Provide specific error messages for common issues
          if (status === 401) {
            throw new McpError(
              ErrorCode.InternalError,
              `Unauthorized: OAuth token invalid or expired. Try deleting ~/.bitbucket-mcp-tokens.json and reauthorizing.`
            );
          }

          if (status === 403) {
            throw new McpError(
              ErrorCode.InternalError,
              `Forbidden: Insufficient OAuth permissions. Check that your OAuth consumer has the required scopes.`
            );
          }

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
