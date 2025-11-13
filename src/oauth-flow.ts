/**
 * Shared OAuth2 Authorization Flow
 *
 * This module provides the OAuth2 authorization code flow logic
 * used by both the MCP server and the standalone authorization script.
 */

import http from 'http';
import axios from 'axios';
import * as childProcess from 'child_process';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scopes?: string;
}

export interface OAuthFlowOptions {
  clientId: string;
  clientSecret: string;
  port?: number;
  timeout?: number;
}

/**
 * Open a URL in the default browser
 */
function openBrowser(url: string): void {
  const start = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';

  childProcess.exec(`${start} "${url}"`);
}

/**
 * Run the OAuth2 authorization code flow
 *
 * @param options - OAuth flow configuration
 * @returns Promise that resolves with token data
 */
export async function runOAuthFlow(options: OAuthFlowOptions): Promise<TokenData> {
  const PORT = options.port || 8234;
  const TIMEOUT = options.timeout || 5 * 60 * 1000; // 5 minutes default
  const CALLBACK_URL = `http://localhost:${PORT}/callback`;
  const authUrl = `https://bitbucket.org/site/oauth2/authorize?client_id=${options.clientId}&response_type=code&redirect_uri=${encodeURIComponent(CALLBACK_URL)}`;

  return new Promise((resolve, reject) => {
    console.error('\n🔐 OAuth2 Authorization Required');
    console.error('=================================\n');
    console.error('Starting authorization flow...');

    const server = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const url = new URL(req.url, `http://localhost:${PORT}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p><p>You can close this window.</p>`);
          console.error('❌ Authorization failed:', error);
          server.close();
          reject(new Error(`Authorization failed: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>No authorization code received</h1><p>You can close this window.</p>');
          console.error('❌ No authorization code received');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        try {
          // Exchange code for tokens
          console.error('📝 Exchanging authorization code for tokens...');
          const tokenResponse = await axios.post(
            'https://bitbucket.org/site/oauth2/access_token',
            `grant_type=authorization_code&code=${code}`,
            {
              auth: {
                username: options.clientId,
                password: options.clientSecret,
              },
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );

          const tokens: TokenData = {
            access_token: tokenResponse.data.access_token,
            refresh_token: tokenResponse.data.refresh_token,
            expires_at: Date.now() + (tokenResponse.data.expires_in * 1000),
            scopes: tokenResponse.data.scopes || tokenResponse.data.scope,
          };

          console.error('✅ Authorization successful!');

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <h1>✅ Authorization Successful!</h1>
            <p>Your tokens have been saved. You can close this window.</p>
            <p>The MCP server will now continue starting up.</p>
          `);

          setTimeout(() => {
            server.close();
            resolve(tokens);
          }, 1000);

        } catch (error: any) {
          console.error('❌ Failed to exchange code for tokens:', error.response?.data || error.message);
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Token Exchange Failed</h1><p>${error.message}</p><p>You can close this window.</p>`);
          server.close();
          reject(error);
        }
      } else if (url.pathname === '/') {
        // Landing page that redirects to Bitbucket OAuth
        res.writeHead(302, { 'Location': authUrl });
        res.end();
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Start server and open browser
    server.listen(PORT, () => {
      console.error(`📡 Authorization server started on http://localhost:${PORT}`);
      console.error('\n🌐 Opening browser for authorization...');
      console.error(`   If your browser does not open then follow this link: ${authUrl.toString()}\n`);

      // Open browser with landing page
      setTimeout(() => {
        openBrowser(authUrl.toString());
      }, 1000);

      console.error('⏳ Waiting for authorization...');
    });

    // Handle timeout
    setTimeout(() => {
      server.close();
      reject(new Error(`Authorization timeout - no response received after ${TIMEOUT / 1000} seconds`));
    }, TIMEOUT);
  });
}
