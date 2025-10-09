# Bitbucket MCP Server

Model Context Protocol (MCP) server for Bitbucket Cloud with per-user OAuth2 authentication.

## Quick Setup (3 minutes)

### 1. Build the Server

```bash
cd <path to this repo clone>
npm install
npm run build
```

### 2. Configure Claude Code

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "bitbucket": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/bitbucket-mcp-server/build/index.js"
      ],
      "env": {
        "BITBUCKET_WORKSPACE": "your-workspace-name",
        "BITBUCKET_OAUTH_CLIENT_ID": "your-client-id",
        "BITBUCKET_OAUTH_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### 3. Start Claude Code

When you first use Bitbucket tools, the server will automatically:

- Open your browser to Bitbucket authorization page
- Ask you to authorize the app
- Save your personal tokens to `~/.bitbucket-mcp-tokens.json`

Done! Now you can ask Claude:

- "List my Bitbucket repositories"
- "Show open pull requests in mw-event-ingest"
- "Create a pull request from feature-branch to main"

## Available Commands

### Repositories

- List repositories in workspace
- List branches in a repository
- List tags with commit info
- Get commit history for a branch
- Create a new branch

### Pull Requests

- Create a pull request
- List pull requests (by state)
- Get PR details
- Get PR comments
- Add comments to PRs
- Approve/decline/merge PRs

### Deployments

- List deployments (filter by environment)
- Get deployment details

## How It Works

1. **Automatic authorization**: First time you use Bitbucket tools, browser opens automatically
2. **Token storage**: Your refresh token saved to `~/.bitbucket-mcp-tokens.json`
3. **Auto-refresh**: Access tokens refresh automatically every hour
4. **No re-authorization needed**: Refresh tokens don't expire unless revoked

## Troubleshooting

### Authorization not working

The server will automatically start the OAuth flow when needed. If the browser doesn't open automatically, look for the URL in the Claude Code MCP logs and open it manually.

### Token refresh fails

The server will automatically re-authorize if token refresh fails. Just approve in the browser when prompted.

### Manual authorization (if needed)

You can manually run the authorization flow:

```bash
node build/oauth-authorize.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

## Security Notes

- ✅ Each user has their own isolated tokens
- ✅ Token file has 0600 permissions (owner only)
- ✅ Never commit `~/.bitbucket-mcp-tokens.json` to git
- ✅ OAuth credentials are workspace-specific
- ✅ OAuth consumer is "public" (can't access data without user authorization)

## Using with Other Workspaces

To use with a different workspace:

1. Create an OAuth consumer in Bitbucket:

   - Go to workspace settings → OAuth consumers
   - Name: `Bitbucket MCP Server`
   - Callback: `http://localhost:8234/callback`
   - **Do NOT check** "This is a private consumer"
   - Permissions: Account (Read), Repositories (Read/Write), Pull requests (Read/Write), Workspace (Read)

2. Update `~/.claude.json` with your credentials and workspace name

3. Restart Claude Code - authorization will happen automatically on first use

## Development

Build:

```bash
npm run build
```

Test (automatic authorization will occur if no tokens exist):

```bash
BITBUCKET_OAUTH_CLIENT_ID=your-id BITBUCKET_OAUTH_CLIENT_SECRET=your-secret BITBUCKET_WORKSPACE=your-workspace node build/index.js
```

## License

MIT
