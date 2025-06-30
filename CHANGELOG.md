# Changelog

All notable changes to the Bitbucket MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-06-20

### Added

- Bitbucket MCP Server initial release

- **Repository Management Tools:**
  - `list_repositories` - List repositories in workspace with pagination support
  - `list_branches` - List all branches in a specific repository

- **Branch Operations:**
  - `create_branch` - Create new branches from any source branch (defaults to main)

- **Pull Request Management:**
  - `create_pull_request` - Create pull requests with title, description, and reviewers
  - `list_pull_requests` - List pull requests by state (OPEN, MERGED, DECLINED) with pagination
  - `get_pull_request` - Get detailed information about specific pull requests
  - `add_pull_request_comment` - Add comments to pull requests

- **Pull Request Review & Actions:**
  - `approve_pull_request` - Approve pull requests
  - `decline_pull_request` - Decline pull requests with optional reason
  - `merge_pull_request` - Merge pull requests with configurable strategies:
    - merge_commit (default)
    - squash
    - fast_forward
  - Option to close source branch after merging

- **Authentication & Security:**
  - Bitbucket App Password authentication
  - Secure credential handling via environment variables
  - HTTPS-only API communications
  - Comprehensive error handling for authentication failures

- **Error Handling:**
  - Detailed error messages for API failures
  - Proper handling of rate limiting
  - Repository and branch not found errors
  - Insufficient permissions errors
  - Network connectivity issues

- **Configuration:**
  - Environment variable configuration for credentials
  - MCP settings integration
  - Workspace-based operations
  - Configurable timeout settings

### Technical Details
- Built with TypeScript for type safety
- Uses Axios for HTTP requests to Bitbucket API v2.0
- Implements MCP SDK server protocol
- Comprehensive input validation with JSON Schema
- Pagination support for list operations
- RESTful API design following Bitbucket API conventions

### Documentation
- Complete README.md with setup instructions
- Tool reference documentation with examples
- Usage examples for common workflows
- Troubleshooting guide
- Security best practices
- Development setup instructions

### Tested With
- Bitbucket Cloud API v2.0
- Test workspace (716+ repositories)
- Node.js v14+ compatibility
- MCP Client integration

---

## Release Notes

### Version 0.1.0 - Initial Release

This is the first stable release of the Bitbucket MCP Server, providing comprehensive integration with Bitbucket repositories through the Model Context Protocol.

**Key Features:**
- Complete repository management workflow support
- Full pull request lifecycle management
- Branch operations and management
- Secure authentication with App Passwords
- Extensive error handling and validation
- Production-ready with comprehensive documentation

**Use Cases:**
- Automated repository operations
- Pull request management and reviews
- Branch creation for feature development
- Code review workflows
- Repository administration
- DevOps automation

**Getting Started:**
1. Install dependencies: `npm install`
2. Build the server: `npm run build`
3. Create Bitbucket App Password with appropriate permissions
4. Configure MCP settings with your credentials
5. Start using the tools for repository operations

For detailed setup instructions, see the README.md file.

---

## Future Roadmap

### Planned Features (v0.2.0)
- [ ] Repository creation and deletion
- [ ] Webhook management
- [ ] Issue tracking integration
- [ ] Pipeline/Build status integration
- [ ] Advanced search capabilities
- [ ] Bulk operations support
