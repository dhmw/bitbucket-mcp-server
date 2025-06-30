# Bitbucket MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Bitbucket repositories through the Bitbucket API. This server enables agents to perform common repository operations like creating branches, managing pull requests, and reviewing code.

## Features

### Repository Management
- List repositories in your workspace
- Browse repository branches

### Branch Operations
- Create new branches from any source branch
- List all branches in a repository

### Pull Request Management
- Create pull requests with reviewers
- List pull requests by state (OPEN, MERGED, DECLINED)
- Get detailed pull request information
- Add comments to pull requests

### Pull Request Reviews & Actions
- Approve pull requests
- Decline pull requests with reasons
- Merge pull requests with different strategies
- Close source branches after merging

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
   # The server is already created at /Users/fernandonogueira/Documents/Cline/MCP/bitbucket-server
   ```

2. **Install dependencies:**
   ```bash
   cd bitbucket-server
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
      "args": ["/path/to/bitbucket-server/build/index.js"],
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

### 1. list_repositories
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

### 2. list_branches
List all branches in a specific repository.

**Parameters:**
- `repository` (required): Repository name

**Example:**
```json
{
  "repository": "my-awesome-project"
}
```

### 3. create_branch
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

### 4. create_pull_request
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

### 5. list_pull_requests
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

### 6. get_pull_request
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

### 7. approve_pull_request
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

### 8. decline_pull_request
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

### 9. merge_pull_request
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

### 10. add_pull_request_comment
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

## Usage Examples

### Basic Workflow
```bash
# 1. List repositories
"List all repositories in our workspace"

# 2. Check branches in a repo
"Show me all branches in the 'api' repository"

# 3. Create a new feature branch
"Create a branch called 'feature/payment-improvements' in the 'api' repository from the 'develop' branch"

# 4. Create a pull request
"Create a pull request in 'api' from 'feature/payment-improvements' to 'develop' with title 'Improve payment processing speed' and add 'john.doe' as reviewer"

# 5. Review and approve
"List all open pull requests in 'api'"
"Approve pull request #123 in 'api'"

# 6. Merge the PR
"Merge pull request #123 in 'api' using squash strategy and close the source branch"
```

### Code Review Workflow
```bash
# Get PR details
"Get details for pull request #456 in 'web'"

# Add review comments
"Add comment to pull request #456 in 'web': Please add error handling for the API timeout scenario"

# Approve or decline
"Approve pull request #456 in 'web'"
# OR
"Decline pull request #456 in 'web' with reason 'Security vulnerabilities need to be addressed'"
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

## Development

### Project Structure
```
bitbucket-server/
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

This MCP server was created to provide comprehensive Bitbucket integration. To extend functionality:

1. Add new tool definitions in the `setupToolHandlers()` method
2. Implement the corresponding handler methods
3. Update this documentation
4. Test thoroughly with your Bitbucket repositories

## License

This project is part of the MCP ecosystem and follows standard open-source practices.
