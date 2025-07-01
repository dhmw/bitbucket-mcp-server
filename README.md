# Bitbucket MCP Server

A Model Context Protocol (MCP) server that provides comprehensive tools for interacting with Bitbucket repositories through the Bitbucket API. This server enables agents to perform repository operations, manage branches, handle pull requests, analyze commit history, work with repository tags, and monitor deployments.

## Version 0.3.0

## Features

### Repository Management
- List repositories in your workspace
- Browse repository branches
- List repository tags with detailed information
- Get commit history for any branch

### Branch Operations
- Create new branches from any source branch
- List all branches in a repository
- View detailed commit history and messages for branches

### Pull Request Management
- Create pull requests with reviewers
- List pull requests by state (OPEN, MERGED, DECLINED)
- Get detailed pull request information
- Retrieve all comments from pull requests
- Add comments to pull requests

### Pull Request Reviews & Actions
- Approve pull requests
- Decline pull requests with reasons
- Merge pull requests with different strategies
- Close source branches after merging

### Deployment Management
- List all deployments for a repository
- Filter deployments by environment
- Get detailed deployment information
- Monitor deployment status and state
- Track deployment history and releases

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Bitbucket account with repository access
- Bitbucket App Password

### Setup

1. **Clone/Create the server:**
   ```bash
   cd /path/to/your/mcp/servers
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the server:**
   ```bash
   npm run build
   ```

4. **Create Bitbucket App Password:**
   - Go to https://bitbucket.org/account/settings/app-passwords/
   - Click "Create app password"
   - Select permissions:
     - **Repositories**: Read, Write, Admin
     - **Pull requests**: Read, Write
     - **Account**: Read
   - Copy the generated password

## Configuration

### MCP Settings
Add the server to your MCP configuration file:

```json
{
  "mcpServers": {
    "bitbucket-mcp-server": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": ["/path/to/bitbucket-mcp-server/build/index.js"],
      "env": {
        "BITBUCKET_USERNAME": "your-username@domain.com",
        "BITBUCKET_APP_PASSWORD": "your-app-password",
        "BITBUCKET_WORKSPACE": "your-workspace-name"
      },
      "transportType": "stdio"
    }
  }
}
```

### Environment Variables
- `BITBUCKET_USERNAME`: Your Bitbucket username/email
- `BITBUCKET_APP_PASSWORD`: Your Bitbucket App Password (not regular password)
- `BITBUCKET_WORKSPACE`: Your workspace/organization name

## Available Tools

### Repository Management Tools

#### 1. list_repositories
List repositories in your workspace with pagination support.

**Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `pagelen` (optional): Number of repositories per page (default: 10, max: 100)

**Example:**
```json
{
  "page": 1,
  "pagelen": 20
}
```

#### 2. list_branches
List all branches in a specific repository.

**Parameters:**
- `repository` (required): Repository name

**Example:**
```json
{
  "repository": "my-awesome-project"
}
```

#### 3. list_tags
List all tags in a repository with detailed information.

**Parameters:**
- `repository` (required): Repository name
- `page` (optional): Page number for pagination (default: 1)
- `pagelen` (optional): Number of tags per page (default: 10, max: 100)

**Example:**
```json
{
  "repository": "my-awesome-project",
  "page": 1,
  "pagelen": 25
}
```

**Returns:**
- Tag name and commit information
- Commit hash and message
- Commit date
- Tagger information (if available)

#### 4. get_branch_commits
Get detailed commit history for any branch.

**Parameters:**
- `repository` (required): Repository name
- `branch` (required): Branch name (e.g., "main", "develop")
- `page` (optional): Page number for pagination (default: 1)
- `pagelen` (optional): Number of commits per page (default: 10, max: 100)

**Example:**
```json
{
  "repository": "my-awesome-project",
  "branch": "main",
  "page": 1,
  "pagelen": 20
}
```

**Returns:**
- Commit hash, message, and date
- Author information
- Parent commit hashes
- Direct link to commit in Bitbucket

### Branch Operations

#### 5. create_branch
Create a new branch in a repository.

**Parameters:**
- `repository` (required): Repository name
- `branch_name` (required): Name for the new branch
- `source_branch` (optional): Source branch to create from (default: "main")

**Example:**
```json
{
  "repository": "my-awesome-project",
  "branch_name": "feature/user-authentication",
  "source_branch": "develop"
}
```

### Pull Request Management

#### 6. create_pull_request
Create a new pull request.

**Parameters:**
- `repository` (required): Repository name
- `title` (required): Pull request title
- `source_branch` (required): Source branch name
- `description` (optional): Pull request description
- `destination_branch` (optional): Destination branch (default: "main")
- `reviewers` (optional): Array of reviewer usernames

**Example:**
```json
{
  "repository": "my-awesome-project",
  "title": "Add user authentication feature",
  "description": "This PR implements OAuth2 authentication with Google and GitHub providers.",
  "source_branch": "feature/user-authentication",
  "destination_branch": "develop",
  "reviewers": ["john.doe", "jane.smith"]
}
```

#### 7. list_pull_requests
List pull requests in a repository.

**Parameters:**
- `repository` (required): Repository name
- `state` (optional): Filter by state - "OPEN", "MERGED", "DECLINED" (default: "OPEN")
- `page` (optional): Page number for pagination (default: 1)

**Example:**
```json
{
  "repository": "my-awesome-project",
  "state": "OPEN",
  "page": 1
}
```

#### 8. get_pull_request
Get detailed information about a specific pull request.

**Parameters:**
- `repository` (required): Repository name
- `pull_request_id` (required): Pull request ID

**Example:**
```json
{
  "repository": "my-awesome-project",
  "pull_request_id": 42
}
```

#### 9. get_pull_request_comments
Get all comments from a pull request.

**Parameters:**
- `repository` (required): Repository name
- `pull_request_id` (required): Pull request ID
- `page` (optional): Page number for pagination (default: 1)
- `pagelen` (optional): Number of comments per page (default: 20, max: 100)

**Example:**
```json
{
  "repository": "my-awesome-project",
  "pull_request_id": 42,
  "page": 1,
  "pagelen": 50
}
```

**Returns:**
- Comment ID, content (raw and HTML)
- Author information
- Creation and update timestamps
- Direct link to comment
- Inline comment details (file path, line numbers) if applicable

#### 10. add_pull_request_comment
Add a comment to a pull request.

**Parameters:**
- `repository` (required): Repository name
- `pull_request_id` (required): Pull request ID
- `content` (required): Comment content

**Example:**
```json
{
  "repository": "my-awesome-project",
  "pull_request_id": 42,
  "content": "Great work! Just a few minor suggestions: consider adding unit tests for the new authentication methods."
}
```

### Pull Request Actions

#### 11. approve_pull_request
Approve a pull request.

**Parameters:**
- `repository` (required): Repository name
- `pull_request_id` (required): Pull request ID

**Example:**
```json
{
  "repository": "my-awesome-project",
  "pull_request_id": 42
}
```

#### 12. decline_pull_request
Decline a pull request.

**Parameters:**
- `repository` (required): Repository name
- `pull_request_id` (required): Pull request ID
- `reason` (optional): Reason for declining

**Example:**
```json
{
  "repository": "my-awesome-project",
  "pull_request_id": 42,
  "reason": "Code doesn't meet our quality standards. Please address the linting issues."
}
```

#### 13. merge_pull_request
Merge a pull request.

**Parameters:**
- `repository` (required): Repository name
- `pull_request_id` (required): Pull request ID
- `merge_strategy` (optional): "merge_commit", "squash", or "fast_forward" (default: "merge_commit")
- `close_source_branch` (optional): Whether to close source branch after merge (default: false)

**Example:**
```json
{
  "repository": "my-awesome-project",
  "pull_request_id": 42,
  "merge_strategy": "squash",
  "close_source_branch": true
}
```

### Deployment Management

#### 14. list_deployments
List deployments for a repository with optional environment filtering.

**Parameters:**
- `repository` (required): Repository name
- `environment` (optional): Filter by environment name
- `page` (optional): Page number for pagination (default: 1)
- `pagelen` (optional): Number of deployments per page (default: 10, max: 100)

**Example:**
```json
{
  "repository": "my-awesome-project",
  "environment": "production",
  "page": 1,
  "pagelen": 20
}
```

**Returns:**
- Deployment UUID, key, and name
- Deployment state (UNDEPLOYED, IN_PROGRESS, SUCCESSFUL, FAILED, STOPPED)
- Environment information
- Release details with commit information
- Last update time
- Deployable information

#### 15. get_deployment
Get detailed information about a specific deployment.

**Parameters:**
- `repository` (required): Repository name
- `deployment_uuid` (required): Deployment UUID

**Example:**
```json
{
  "repository": "my-awesome-project",
  "deployment_uuid": "12345678-1234-1234-1234-123456789abc"
}
```

**Returns:**
- Complete deployment information
- Environment details
- Release and commit information
- Deployment state and timing
- Links to related resources

## Usage Examples

### Repository Analysis Workflow
```bash
# List all repositories
"List all repositories in our workspace"

# Analyze a specific repository
"Show me all branches in the 'workspace-api' repository"
"List all tags in the 'workspace-api' repository"
"Get the last 20 commits from the 'main' branch in 'workspace-api'"
```

### Development Workflow
```bash
# 1. Check commit history
"Show me the recent commits on the 'develop' branch in 'workspace-api'"

# 2. Create a new feature branch
"Create a branch called 'feature/payment-improvements' in the 'workspace-api' repository from the 'develop' branch"

# 3. Create a pull request
"Create a pull request in 'workspace-api' from 'feature/payment-improvements' to 'develop' with title 'Improve payment processing speed' and add 'john.doe' as reviewer"
```

### Code Review Workflow
```bash
# List open PRs
"List all open pull requests in 'workspace-api'"

# Get PR details and comments
"Get details for pull request #123 in 'workspace-api'"
"Show me all comments from pull request #123 in 'workspace-api'"

# Add review comments
"Add comment to pull request #123 in 'workspace-api': Please add error handling for the API timeout scenario"

# Approve and merge
"Approve pull request #123 in 'workspace-api'"
"Merge pull request #123 in 'workspace-api' using squash strategy and close the source branch"
```

### Release Management
```bash
# Check tags for version information
"List all tags in 'workspace-web' to see the release history"

# Analyze commits between releases
"Get commit history for the 'release/v2.1' branch in 'workspace-web'"
```

### Deployment Management Workflow
```bash
# Monitor deployments across all environments
"List all deployments for 'workspace-api'"

# Check production deployments specifically
"List deployments for 'workspace-api' filtered by 'production' environment"

# Get detailed deployment information
"Get details for deployment '12345678-1234-1234-1234-123456789abc' in 'workspace-api'"

# Monitor deployment status
"Show me the current deployment status for 'workspace-api' in production environment"
```

## Error Handling

The server includes comprehensive error handling for:
- Invalid authentication credentials
- Repository not found
- Branch not found
- Pull request not found
- Insufficient permissions
- API rate limiting
- Network connectivity issues

Errors are returned with descriptive messages to help troubleshoot issues.

## Security

- Uses Bitbucket App Passwords (more secure than regular passwords)
- Credentials are stored as environment variables
- All API communications use HTTPS
- No credentials are logged or exposed in responses

## API Rate Limits

Bitbucket API has rate limits. The server will return appropriate error messages if limits are exceeded. Consider implementing exponential backoff for high-frequency operations.

## What's New in Version 0.3.0

### New Features Added:
1. **Deployment Management**: Complete deployment monitoring and management capabilities
   - `list_deployments` - List and filter deployments by environment
   - `get_deployment` - Get detailed deployment information
   - Support for all deployment states (UNDEPLOYED, IN_PROGRESS, SUCCESSFUL, FAILED, STOPPED)
   - Environment-based filtering and monitoring
   - Complete deployment metadata including release and commit information

### Enhanced Capabilities:
- Deployment status tracking across multiple environments
- Release and commit information for each deployment
- Deployment history analysis and monitoring
- Environment-specific deployment filtering
- Enhanced pagination support for deployment listings

### Previous Version Highlights (0.2.0):
## What's New in Version 0.2.0

### New Features Added:
1. **Repository Tags Support**: Complete tag management with `list_tags`
2. **Branch Commit History**: Detailed commit analysis with `get_branch_commits`
3. **Pull Request Comments**: Full comment retrieval with `get_pull_request_comments`

### Enhanced Capabilities:
- Comprehensive commit history analysis for any branch
- Tag-based release management support  
- Complete pull request discussion thread access
- Enhanced pagination support across all list operations

## Development

### Project Structure
```
bitbucket-mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── build/
│   └── index.js          # Compiled JavaScript
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This documentation
```

### Building
```bash
npm run build
```

### Running Locally
```bash
# Set environment variables
export BITBUCKET_USERNAME="your-username"
export BITBUCKET_APP_PASSWORD="your-app-password"
export BITBUCKET_WORKSPACE="your-workspace"

# Run the server
node build/index.js
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your App Password is correct
   - Ensure your username is correct (use email if that's how you log in)
   - Check that the App Password has the required permissions

2. **Repository Not Found**
   - Verify the repository name is correct (case-sensitive)
   - Ensure you have access to the repository
   - Check that the workspace name is correct

3. **Branch Not Found**
   - Verify the branch name exists in the repository
   - Check for typos in branch names
   - Ensure the branch hasn't been deleted

4. **Server Not Starting**
   - Check that all environment variables are set
   - Verify the build completed successfully
   - Check the Node.js version compatibility

### Debug Mode
To enable detailed logging, you can modify the server code to include debug statements or check the MCP client logs for detailed error information.

## Contributing

This MCP server provides comprehensive Bitbucket integration. To extend functionality:

1. Add new tool definitions in the `setupToolHandlers()` method
2. Implement the corresponding handler methods  
3. Update this documentation
4. Test thoroughly with your Bitbucket repositories

## License

This project is part of the MCP ecosystem and follows standard open-source practices.
