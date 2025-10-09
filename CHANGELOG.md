# Changelog

All notable changes to this project will be documented in this file.

## [0.6.0] - 2025-10-09

### Breaking Changes

- **OAuth2-Only Authentication**: Removed all legacy authentication methods
  - Removed support for `BITBUCKET_APP_PASSWORD` (deprecated by Bitbucket)
  - Removed support for `BITBUCKET_TOKEN` (HTTP Access Tokens - insufficient scope)
  - Removed `BITBUCKET_USERNAME` parameter
  - Now requires OAuth2 authentication only

### Added

- **Per-User OAuth2 Authentication**: Users authenticate with their own Bitbucket accounts
  - OAuth2 authorization code flow with refresh tokens
  - **Automatic authorization** - browser opens automatically when tokens are missing or expired
  - No manual authorization commands needed
  - Automatic token refresh every hour
  - Automatic re-authorization on token refresh failures
  - Secure token storage in `~/.bitbucket-mcp-tokens.json`
  - Long-lived refresh tokens (no re-authorization needed unless revoked)
  - 5-minute timeout for authorization flow
- **Authorization Helper**: `oauth-authorize.js` script available for manual authorization if needed

### Enhanced

- **Security**: Per-user authentication instead of shared credentials
- **Token Management**: Automatic access token refresh with 5-minute buffer
- **User Experience**: Zero-friction setup - OAuth flow integrated directly into MCP server
  - Browser opens automatically on first use
  - Clear console messages guide users through authorization
  - Seamless re-authorization when needed

### Environment Variables

- **Added**: `BITBUCKET_OAUTH_CLIENT_ID` (required) - OAuth consumer key
- **Added**: `BITBUCKET_OAUTH_CLIENT_SECRET` (required) - OAuth consumer secret
- **Added**: `BITBUCKET_OAUTH_TOKEN_FILE` (optional) - Custom token storage path
- **Removed**: `BITBUCKET_USERNAME`
- **Removed**: `BITBUCKET_APP_PASSWORD`
- **Removed**: `BITBUCKET_TOKEN`

### Migration Guide

Users migrating from App Passwords or HTTP Access Tokens:

1. Create OAuth consumer in Bitbucket workspace settings
   - Callback URL: `http://localhost:8234/callback`
   - **Do NOT check** "This is a private consumer"
   - Permissions: Account (Read), Repositories (Read/Write), Pull requests (Read/Write), Workspace (Read)
2. Update `~/.claude.json` with OAuth credentials
3. Remove old authentication environment variables
4. Restart Claude Code - authorization will happen automatically on first use

### Technical Details

- OAuth2 authorization flow integrated directly into MCP server
- Uses Bearer token authentication with Bitbucket API
- Axios interceptor handles automatic token injection
- Refresh token flow prevents re-authorization
- Token file created with 0600 permissions
- HTTP server on port 8234 receives OAuth callbacks
- Supports custom token file locations via environment variable

### Documentation

- Updated README.md with simplified OAuth2 setup instructions
- Removed outdated documentation about App Passwords
- Added troubleshooting section for common OAuth2 issues
- Consolidated multiple setup guides into single README
- Removed redundant markdown files

---

## [0.5.0] - 2025-07-03

### Added

- **Repository Cloning**: SSH and HTTPS repository cloning support
  - `clone_repository` - Generate git clone commands with SSH (default) or HTTPS protocol
  - Support for specific branch cloning with `--branch` parameter
  - Custom directory naming for cloned repositories
  - SSH setup instructions and prerequisites for secure cloning
  - Complete git command generation ready for terminal execution
  - Repository verification before generating clone commands

### Enhanced

- **Protocol Flexibility**: SSH protocol as default for secure cloning with HTTPS fallback option
- **Branch-Specific Cloning**: Support for cloning specific branches directly
- **User Experience**: Comprehensive clone instructions with setup guidance for SSH
- **Error Handling**: Repository validation and detailed error messages for clone operations

### Technical Improvements

- Updated version to 0.5.0 across all files
- Added new API endpoint integration for repository clone URLs
- Enhanced TypeScript interfaces for clone URL data structures
- Improved Bitbucket API response parsing for clone links
- Added comprehensive SSH setup documentation

### Code Structure Improvements

- **Modular Architecture**: Refactored monolithic index.ts into logical, maintainable modules
- **Separation of Concerns**: Split code into dedicated handler classes by functionality
  - `src/types.ts` - Centralized TypeScript interfaces and type definitions
  - `src/tools.ts` - MCP tool schema definitions and configurations
  - `src/handlers/repository.ts` - Repository operations (list, clone, branches, tags, commits)
  - `src/handlers/branch.ts` - Branch operations (create branch)
  - `src/handlers/pullRequest.ts` - Pull request operations (create, list, approve, merge, comments)
  - `src/handlers/deployment.ts` - Deployment operations (list, get details)
  - `src/index.ts` - Main server orchestrator using modular handlers
- **Improved Maintainability**: Each module has single responsibility, making code easier to navigate and modify
- **Enhanced Readability**: Clean imports and organized file structure for better developer experience
- **Scalable Design**: Easy to extend functionality by adding new handlers or modifying existing ones
- **Consistent Error Handling**: Centralized error management in main server class
- **Dependency Injection**: Handler classes receive dependencies via constructor for better testability

### Usage Examples

- Generate SSH clone commands (recommended and default)
- Generate HTTPS clone commands for environments without SSH setup
- Clone specific branches directly without additional git operations
- Custom directory naming for better project organization
- Complete workflow integration for repository setup

## [0.4.0] - 2025-02-07

### Added

- **Project Management**: New project-related functionality for enhanced workspace organization
  - `list_projects` - List all projects in the workspace with comprehensive project information
  - Project filtering support for `list_repositories` - Filter repositories by project key
  - Project metadata including key, name, description, privacy status, owner information
  - Direct links to projects in Bitbucket web interface

### Enhanced

- **Repository Filtering**: Enhanced `list_repositories` tool with optional project parameter
  - Added `project` parameter for filtering repositories by project key
  - Uses Bitbucket query API (`q=project.key="PROJECT_KEY"`) for precise filtering
  - Maintains backward compatibility - project parameter is optional
  - Returns filter information in response showing which project was used

### Technical Improvements

- Updated version to 0.4.0 across all files
- Added new API endpoint integration: `/workspaces/{workspace}/projects`
- Enhanced TypeScript interfaces for project data structures
- Improved error handling for project-related API responses
- Updated documentation with project management examples

### Usage Examples

- List all projects in workspace for better organization visibility
- Filter repositories by specific project for focused development workflows
- Enhanced project-based repository management
- Better workspace organization and navigation

## [0.3.0] - 2025-07-01

### Added

- **Deployment Management**: New deployment monitoring and management capabilities
  - `list_deployments` - List all deployments for a repository with optional environment filtering
  - `get_deployment` - Get detailed information about specific deployments by UUID
  - Support for deployment state tracking (UNDEPLOYED, IN_PROGRESS, SUCCESSFUL, FAILED, STOPPED)
  - Environment-based deployment filtering
  - Complete deployment metadata including release and commit information
    **_Be aware that bitbucket does not provide a way to get the most recent deployments, so we need to fetch a lot of data and filter it ourselves. This can be slow for large repositories with many deployments, basically makes the deployment functionality unusable for large repositories._**

### Enhanced

- **Deployment Interface**: New `BitbucketDeployment` TypeScript interface for type safety
- **API Coverage**: Extended Bitbucket API coverage to include deployment endpoints
- **Pagination Support**: Consistent pagination for deployment listing operations
- **Error Handling**: Enhanced error handling for deployment-specific API responses

### Technical Improvements

- Updated version to 0.3.0 across all files
- Added comprehensive deployment data structures
- Enhanced TypeScript type definitions for deployment objects
- Improved API response parsing for deployment endpoints

### New Interfaces Added

- `BitbucketDeployment`: Complete deployment information structure with environment, release, and deployable details

### Usage Examples

- Monitor deployment status across environments
- Track deployment history and releases
- Analyze deployment success/failure patterns
- Environment-specific deployment management

## [0.2.1] - 2025-07-01

### Fixed

- **Pull Request Approval**: Fixed 400 Bad Request error when approving pull requests
  - Added empty request body to approve endpoint call as required by Bitbucket API
  - Enhanced approval response with timestamp for better tracking

## [0.2.0] - 2025-07-01

### Added

- **Repository Tags Support**: New `list_tags` tool for comprehensive tag management

  - List all tags in a repository with pagination
  - Get tag metadata including commit info, dates, and tagger details
  - Support for release management workflows

- **Branch Commit History**: New `get_branch_commits` tool for detailed commit analysis

  - Get complete commit history for any branch
  - Retrieve commit messages, authors, dates, and parent commits
  - Direct links to commits in Bitbucket web interface
  - Pagination support for large commit histories

- **Pull Request Comments Management**: New `get_pull_request_comments` tool
  - Retrieve all comments from any pull request
  - Get both raw text and HTML formatted content
  - Access inline code review comments with file paths and line numbers
  - Full pagination support for lengthy discussions

### Enhanced

- **Improved Documentation**: Comprehensive README.md update with detailed usage examples
- **Enhanced Error Handling**: Better error messages and API response handling
- **TypeScript Interfaces**: Added proper type definitions for all new API responses
- **Pagination Support**: Consistent pagination across all list operations

### Technical Improvements

- Updated version numbering to 0.2.0 across all files
- Enhanced TypeScript type safety with new interfaces
- Improved code organization and structure
- Better API response parsing and error handling

### New Interfaces Added

- `BitbucketTag`: Complete tag metadata structure
- `BitbucketCommit`: Comprehensive commit information
- `BitbucketComment`: Full comment data with inline support

### Usage Examples Added

- Repository analysis workflows
- Development and branching workflows
- Code review and commenting workflows
- Release management with tags

## [0.1.0] - 2024-06-01

### Added

- **Initial Release**: Basic Bitbucket MCP Server functionality
- **Repository Management**:

  - `list_repositories` - List repositories in workspace
  - `list_branches` - List branches in repository

- **Branch Operations**:

  - `create_branch` - Create new branches from source branches

- **Pull Request Management**:

  - `create_pull_request` - Create pull requests with reviewers
  - `list_pull_requests` - List PRs by state (OPEN, MERGED, DECLINED)
  - `get_pull_request` - Get detailed PR information
  - `add_pull_request_comment` - Add comments to pull requests

- **Pull Request Actions**:

  - `approve_pull_request` - Approve pull requests
  - `decline_pull_request` - Decline PRs with reasons
  - `merge_pull_request` - Merge PRs with different strategies

- **Authentication & Security**:

  - Bitbucket App Password authentication
  - Environment variable configuration
  - Secure HTTPS API communication

- **Error Handling**:
  - Comprehensive API error handling
  - Authentication validation
  - Resource existence checking

### Technical Foundation

- Model Context Protocol (MCP) integration
- TypeScript implementation with proper typing
- Axios HTTP client for Bitbucket API
- Environment-based configuration
- Standard MCP server architecture

---

## Version Comparison

### What's New in 0.2.0 vs 0.1.0

**Repository Insights (NEW)**

- Tag management and release tracking
- Complete commit history analysis
- Enhanced repository exploration capabilities

**Enhanced Pull Request Workflow (IMPROVED)**

- Full comment thread retrieval and analysis
- Better code review support with inline comments
- More comprehensive PR discussion management

**Developer Experience (ENHANCED)**

- Detailed documentation with usage examples
- Better error messages and troubleshooting guide
- Improved TypeScript type safety
- Consistent pagination across all operations

**Total Tools Available**

- v0.1.0: 10 tools
- v0.2.0: 13 tools (+3 new major features)

---

## Migration Guide

### From 0.1.0 to 0.2.0

No breaking changes - all existing functionality remains the same. Simply update your installation:

1. Pull the latest code
2. Run `npm run build`
3. Restart your MCP server

New tools are immediately available without configuration changes.

### New Environment Variables

No new environment variables required - all existing configuration remains valid.

### New Tool Usage

The new tools follow the same patterns as existing tools:

- Consistent parameter naming
- Same authentication method
- Standard JSON response format
- Same pagination patterns

---

## Roadmap

Future versions may include:

- Webhook support for real-time notifications
- Advanced search and filtering capabilities
- Batch operations for multiple repositories
- Integration with Bitbucket Pipelines
- Support for repository settings management
- File content operations (read/write repository files)
