/**
 * OAuth 2.0 authorization flow for Bitbucket
 * Uses authorization code flow to authenticate users
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
 * Start a local HTTP server to handle the OAuth callback
 */
function startCallbackServer(clientId: string, clientSecret: string, port: number, oauthUrl: string): Promise<TokenData> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p><p>You can close this window.</p>`);
          server.close();
          reject(new Error(`Authorization failed: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>No authorization code received</h1><p>You can close this window.</p>');
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
                username: clientId,
                password: clientSecret,
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
          res.end(`<h1>✅ Authorization Successful!</h1><p>Your tokens have been saved. You can close this window.</p><p>The MCP server will now continue starting up.</p>`);

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
        res.writeHead(302, { 'Location': oauthUrl });
        res.end();
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(port, () => {
      // Server started silently; console output happens in runOAuthFlow
    });

    server.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Run the OAuth2 authorization code flow
 *
 * @param options - OAuth flow configuration
 * @returns Promise that resolves with token data
 */
export async function runOAuthFlow(options: OAuthFlowOptions): Promise<TokenData> {
  const PORT = options.port || 8234;
  const CALLBACK_URL = `http://localhost:${PORT}/callback`;
  const authUrl = `https://bitbucket.org/site/oauth2/authorize?client_id=${options.clientId}&response_type=code&redirect_uri=${encodeURIComponent(CALLBACK_URL)}`;

  const oauthUrlString = authUrl.toString();

  console.error('\n🔐 OAuth2 Authorization Required');
  console.error('=================================\n');
  console.error('Starting authorization flow...');
  console.error('\n🌐 Opening browser for authorization...');
  console.error(`   If the browser doesn't open, visit: ${oauthUrlString}\n`);

  // Start callback server
  const tokenPromise = startCallbackServer(options.clientId, options.clientSecret, PORT, oauthUrlString);

  // Open browser with landing page
  setTimeout(() => {
    openBrowser(oauthUrlString);
  }, 1000);

  console.error('⏳ Waiting for authorization...');

  return tokenPromise;
}
