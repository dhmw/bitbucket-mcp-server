# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2025-07-01

### Added
- **Deployment Management**: New deployment monitoring and management capabilities
  - `list_deployments` - List all deployments for a repository with optional environment filtering
  - `get_deployment` - Get detailed information about specific deployments by UUID
  - Support for deployment state tracking (UNDEPLOYED, IN_PROGRESS, SUCCESSFUL, FAILED, STOPPED)
  - Environment-based deployment filtering
  - Complete deployment metadata including release and commit information

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
