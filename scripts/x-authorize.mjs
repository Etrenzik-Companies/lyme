#!/usr/bin/env node
/**
 * One-time X (Twitter) OAuth 2.0 PKCE authorization, to obtain the first refresh token.
 *
 *   X_CLIENT_ID=... X_CLIENT_SECRET=... node scripts/x-authorize.mjs
 *
 * Run this locally, signed in to the browser as the PROJECT account — not a personal one.
 * It starts a throwaway listener on 127.0.0.1:8899, prints an authorization URL, and
 * exchanges the returned code for tokens.
 *
 * The refresh token it prints is a SEED. X rotates refresh tokens on every exchange, and
 * the worker stores the rotated value in KV from then on. See SOCIAL-SETUP.md.
 *
 * Add http://127.0.0.1:8899/callback as a callback URL in the X app settings while you run
 * this, then remove it afterwards.
 */
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';

const CLIENT_ID = process.env.X_CLIENT_ID;
const CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const REDIRECT = 'http://127.0.0.1:8899/callback';
const SCOPES = 'tweet.read tweet.write users.read offline.access';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set X_CLIENT_ID and X_CLIENT_SECRET in the environment first.');
  process.exit(1);
}

const b64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const verifier = b64url(randomBytes(48));
const challenge = b64url(createHash('sha256').update(verifier).digest());
const state = b64url(randomBytes(16));

const authUrl =
  'https://twitter.com/i/oauth2/authorize?' +
  new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

console.log('\nOpen this URL while signed in as the PROJECT account:\n');
console.log(authUrl);
console.log('\nWaiting for the callback on', REDIRECT, '...\n');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end('not found');
    return;
  }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (returnedState !== state) {
    res.writeHead(400).end('State mismatch — start over.');
    console.error('State mismatch. Aborting.');
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400).end('No code returned.');
    return;
  }

  try {
    const token = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT,
        code_verifier: verifier,
        client_id: CLIENT_ID,
      }),
    });

    const data = await token.json();
    if (!token.ok) throw new Error(JSON.stringify(data));

    res.writeHead(200, { 'content-type': 'text/html' }).end(
      '<h1>Done</h1><p>Refresh token printed in the terminal. You can close this tab.</p>'
    );

    console.log('Scopes granted :', data.scope);
    console.log('Expires in     :', data.expires_in, 'seconds (access token)');
    console.log('\nREFRESH TOKEN (store this, it is the seed):\n');
    console.log(data.refresh_token);
    console.log('\n  npx wrangler secret put X_REFRESH_TOKEN --config worker/wrangler.toml');
    console.log('  npx wrangler pages secret put X_REFRESH_TOKEN --project-name=lyme\n');
    console.log('Now remove http://127.0.0.1:8899/callback from the X app settings.\n');
  } catch (err) {
    res.writeHead(500).end('Token exchange failed — see the terminal.');
    console.error('Token exchange failed:', err.message);
  } finally {
    server.close();
  }
});

server.listen(8899, '127.0.0.1');
