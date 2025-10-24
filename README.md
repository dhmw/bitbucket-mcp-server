# Bitbucket MCP Server

Model Context Protocol (MCP) server for Bitbucket Cloud with per-user OAuth2 authentication.

## Quick Setup

### Part A: Platform Admin Setup (Do Once Per Workspace)

**Who does this:** Bitbucket workspace administrator
**How often:** Once per Bitbucket workspace
**Purpose:** Create OAuth credentials that all MCP users in your organization will share

#### 1. Create a Bitbucket OAuth Consumer

1. **Navigate to OAuth Settings**

   - Go to [Bitbucket.org](https://bitbucket.org)
   - Click on your workspace avatar (bottom left)
   - Select the workspace you want to use
   - Click **Settings** in the left sidebar
   - Click **OAuth consumers** under the workspace settings
   - Or use direct URL: `https://bitbucket.org/<your-workspace>/workspace/settings/api`

2. **Create New Consumer**

   - Click **Add consumer**
   - Fill in the details:
     - **Name**: `Bitbucket MCP Server` (or any name you prefer)
     - **Description**: `MCP server for Claude Code integration` (optional)
     - **Callback URL**: `http://localhost:8234/callback`
     - **URL**: Leave empty or add your company URL (optional)

3. **Configure Consumer Settings**

   - **IMPORTANT**: **Do NOT check** "This is a private consumer"
   - This must be a public OAuth consumer for the authorization flow to work

4. **Set Permissions**
   Select the following scopes (checkboxes):

   - **Account**
     - ☑ Read
   - **Workspace membership**
     - ☑ Read
   - **Projects**
     - ☑ Write (this grants read and write access to projects)
   - **Repositories**
     - ☑ Write (this grants read and write access)
     - ☑ Admin (this allows creating repositories)
   - **Pull requests**
     - ☑ Write (this grants read and write access to PRs)
   - **Pipelines** (optional, for deployment info)
     - ☑ Read

5. **Save and Copy Credentials**

   - Click **Save**
   - You'll see your **Key** (Client ID) and **Secret** (Client Secret)
   - **IMPORTANT**: Copy both values immediately - you won't be able to see the secret again!

6. **Distribute Credentials to MCP Users**
   - Share the **Client ID** and **Client Secret** with users who need MCP access
   - Also provide the **workspace name/slug** (e.g., `mycompany`)
   - Users will need these values for their personal Claude Code configuration

---

### Part B: MCP User Setup (Each User Does This)

**Who does this:** Each individual developer/user
**How often:** Once per user
**Purpose:** Install and configure the MCP server for your personal Claude Code installation

#### 1. Build the Server

```bash
cd <path to this repo clone>
npm install
npm run build
```

#### 2. Configure Claude Code

Add to your `~/.claude.json` (using the credentials provided by your platform admin):

```json
{
  "mcpServers": {
    "bitbucket": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/bitbucket-mcp-server/build/index.js"],
      "env": {
        "BITBUCKET_WORKSPACE": "your-workspace-name",
        "BITBUCKET_OAUTH_CLIENT_ID": "your-client-key-from-admin",
        "BITBUCKET_OAUTH_CLIENT_SECRET": "your-client-secret-from-admin"
      }
    }
  }
}
```

**Replace:**

- `/path/to/bitbucket-mcp-server/build/index.js` - Full path to where you cloned this repo
- `your-workspace-name` - Your Bitbucket workspace slug (e.g., `mycompany`, not the display name)
- `your-client-key-from-admin` - The **Key** value provided by your admin
- `your-client-secret-from-admin` - The **Secret** value provided by your admin

#### 3. Authorize Your Personal Access

When you first use Bitbucket tools, the server will automatically:

- Open your browser to Bitbucket authorization page
- Ask you to authorize the app **with your personal Bitbucket account**
- Save **your personal tokens** to `~/.bitbucket-mcp-tokens.json`

**Important:** Even though all users share the same OAuth app credentials, each user authorizes with their own Bitbucket account and gets their own isolated tokens. Actions are performed as the individual user.

Done! Now you can ask Claude:

- "List my Bitbucket repositories"
- "Show me all workspace members"
- "Who is Gareth in our workspace?" (finds username from display name)
- "Create a new project called 'Engineering' with key ENG"
- "Create a repository called 'my-app' in the ENG project"
- "Show open pull requests in my-app"
- "Create a pull request from feature-branch to main"
- "Add Gareth to PR #42 as a reviewer" (uses member list to find correct username)

## Available Commands

### Workspace

- List all workspace members (with usernames and display names for finding reviewers)

### Projects

- List all projects in workspace
- Create a new project
- Update project details (name, description, privacy)

### Repositories

- List repositories in workspace (with optional project filter)
- Create a new repository (with optional project assignment)
- List branches in a repository
- List tags with commit info
- Get commit history for a branch
- Create a new branch
- Clone repository via SSH or HTTPS

### Pull Requests

- Create a pull request (with automatic default reviewers)
- Get default reviewers for a repository
- Update pull request (title, description, destination branch, reviewers)
- List pull requests (by state)
- Get PR details
- Get PR comments
- Add comments to PRs
- Approve/decline/merge PRs

**Note on Default Reviewers**: When creating pull requests, the server automatically fetches and includes default reviewers configured in your repository or project settings. This behavior can be disabled by setting `include_default_reviewers: false`.

### Deployments

- List deployments (filter by environment)
- Get deployment details

## How It Works

1. **Automatic authorization**: First time you use Bitbucket tools, browser opens automatically
2. **Token storage**: Your refresh token saved to `~/.bitbucket-mcp-tokens.json`
3. **Auto-refresh**: Access tokens refresh automatically every hour
4. **No re-authorization needed**: Refresh tokens don't expire unless revoked

## Troubleshooting

### OAuth Consumer Setup Issues

**Problem**: "Invalid OAuth credentials" or "Unauthorized" errors

**Solutions**:

- Verify the OAuth consumer is **NOT** marked as "This is a private consumer"
- Double-check that you copied the **Key** (not the name) as your Client ID
- Confirm the **Secret** was copied correctly (you can regenerate it if needed)
- Ensure the callback URL is exactly: `http://localhost:8234/callback`
- Verify all required permissions are checked (Account:Read, Workspace:Read, Projects:Write, Repositories:Write+Admin, Pull requests:Write)

### "Bitbucket API error (undefined)" or Network Errors

This error typically means the OAuth authorization hasn't been completed yet.

**First time setup**:

1. The MCP server should automatically open your browser to authorize
2. If the browser doesn't open, check the Claude Code logs for a URL like `http://localhost:8234`
3. Open that URL in your browser and complete the authorization
4. After authorizing, retry your command in Claude Code

**If you've already authorized**:

- Check that `~/.bitbucket-mcp-tokens.json` exists and is readable
- Try deleting `~/.bitbucket-mcp-tokens.json` and restart Claude Code to re-authorize
- Verify your `BITBUCKET_WORKSPACE` environment variable matches your workspace slug (not display name)

### Authorization not working

The server will automatically start the OAuth flow when needed. If the browser doesn't open automatically:

- Look for the authorization URL in the Claude Code MCP logs
- Copy and paste the URL into your browser manually
- The URL should start with `http://localhost:8234`

### Token refresh fails

The server will automatically re-authorize if token refresh fails. Just approve in the browser when prompted.

### Permission denied errors

If you see errors like "Insufficient privileges" or "Permission denied":

- Go back to your OAuth consumer settings in Bitbucket
- Verify all required permissions are enabled (especially Projects:Write and Repositories:Admin)
- You may need to re-authorize (delete `~/.bitbucket-mcp-tokens.json` and restart Claude Code)

### Manual authorization (if needed)

You can manually run the authorization flow:

```bash
node build/oauth-authorize.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

This is useful for testing your OAuth setup without involving Claude Code.

## Security Notes

- ✅ Each user has their own isolated tokens
- ✅ Token file has 0600 permissions (owner only)
- ✅ Never commit `~/.bitbucket-mcp-tokens.json` to git
- ✅ OAuth credentials are workspace-specific
- ✅ OAuth consumer is "public" (can't access data without user authorization)

## Example Use Cases

### Project Management

```
Create a new project with key "WEB" called "Web Applications"
List all projects in the workspace
Update the WEB project description
```

### Repository Creation

```
Create a repository called "my-new-service" in the WEB project
Create a private repository with issues and wiki enabled
List all repositories in the WEB project
```

### Development Workflow

```
Create a branch called "feature/new-login" in my-new-service
Show me the commit history for the main branch
Create a pull request from feature/new-login to main
Update the pull request description to include testing notes
List workspace members to find Gareth's username
Update pull request reviewers to add gareth.jones
```

### Finding and Adding Reviewers

The MCP server makes it easy to add reviewers by display name:

```
List workspace members
Add Sarah to pull request #15 as a reviewer
```

Claude will:
1. Call `list_workspace_members` to get all members
2. Search for "Sarah" in display names
3. Get the current PR reviewers with `get_pull_request`
4. Update the PR with `update_pull_request` using Sarah's exact username

This works even if you don't know the exact Bitbucket username.

## Using with Multiple Workspaces

To use this MCP server with additional Bitbucket workspaces:

1. **Create a new OAuth consumer** in the new workspace (follow step 1 in Quick Setup above)
2. **Add another MCP server entry** to your `~/.claude.json` with a different name:
   ```json
   {
     "mcpServers": {
       "bitbucket": { ... },
       "bitbucket-other-workspace": {
         "type": "stdio",
         "command": "node",
         "args": ["/path/to/bitbucket-mcp-server/build/index.js"],
         "env": {
           "BITBUCKET_WORKSPACE": "other-workspace-name",
           "BITBUCKET_OAUTH_CLIENT_ID": "other-client-id",
           "BITBUCKET_OAUTH_CLIENT_SECRET": "other-client-secret"
         }
       }
     }
   }
   ```
3. **Restart Claude Code** - authorization will happen automatically on first use

**Note**: Each workspace requires its own OAuth consumer and separate MCP server configuration.

## Development

Build:

```bash
npm run build
```

Test (automatic authorization will occur if no tokens exist):

```bash
BITBUCKET_OAUTH_CLIENT_ID=your-id BITBUCKET_OAUTH_CLIENT_SECRET=your-secret BITBUCKET_WORKSPACE=your-workspace node build/index.js
```

## OAuth Permissions Reference

This table shows which OAuth permissions are required for each feature:

| Feature                | Required Permissions            |
| ---------------------- | ------------------------------- |
| List repositories      | Account:Read, Repositories:Read |
| Create repositories    | Repositories:Admin              |
| List projects          | Account:Read, Workspace:Read    |
| Create/update projects | Projects:Write                  |
| List/create branches   | Repositories:Write              |
| Create pull requests   | Pull requests:Write             |
| Approve/merge PRs      | Pull requests:Write             |
| View deployments       | Pipelines:Read (optional)       |

**Recommended setup**: Enable all permissions listed in Step 1 to ensure full functionality.

## License

MIT
