#!/usr/bin/env node

/**
 * OAuth2 Authorization Helper for Bitbucket MCP Server
 *
 * This script helps you authorize the MCP server with your Bitbucket account
 * using the OAuth2 authorization code flow.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runOAuthFlow } from './oauth-flow.js';

// Configuration
const TOKEN_FILE = path.join(os.homedir(), '.bitbucket-mcp-tokens.json');

// Get client credentials from environment or command line
const CLIENT_ID = process.env.BITBUCKET_OAUTH_CLIENT_ID || process.argv[2];
const CLIENT_SECRET = process.env.BITBUCKET_OAUTH_CLIENT_SECRET || process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Usage: node oauth-authorize.js <client_id> <client_secret>');
  console.error('   or: Set BITBUCKET_OAUTH_CLIENT_ID and BITBUCKET_OAUTH_CLIENT_SECRET environment variables');
  process.exit(1);
}

console.error('🔐 Bitbucket OAuth2 Authorization');
console.error('================================\n');

// Run OAuth flow
runOAuthFlow({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
})
  .then((tokens) => {
    // Save tokens to file
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });

    console.error(`📁 Tokens saved to: ${TOKEN_FILE}`);
    console.error('\n✨ You can now use the Bitbucket MCP server!');
    console.error('   Just restart Claude Code to start using it.\n');

    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Authorization failed:', error.message);
    process.exit(1);
  });

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.error('\n\n❌ Authorization cancelled');
  process.exit(0);
});
