/**
 * CHRIST University IQAC Platform - Google Drive Personal OAuth2 Setup Helper
 * 
 * Usage:
 *   node src/app/backend/scripts/getGoogleDriveOAuthToken.js <CLIENT_ID> <CLIENT_SECRET>
 *
 * This generates a Refresh Token for your personal Google account (@gmail.com)
 * so file uploads are saved directly into your personal Google Drive with your personal quota.
 */

const http = require('http');
const url = require('url');

const clientId = (process.argv[2] || '').trim();
const clientSecret = (process.argv[3] || '').trim();

if (!clientId || !clientSecret) {
  console.log(`
========================================================================
   CHRIST IQAC - Personal Google Drive OAuth Setup
========================================================================

To upload files directly to your personal Google Drive (@gmail.com):

1. Go to Google Cloud Console:
   https://console.cloud.google.com/apis/credentials
   (Ensure project 'christ-iqac-platform-513214' is selected)

2. Click '+ CREATE CREDENTIALS' -> 'OAuth client ID'
   - Application type: Web application
   - Name: IQAC Personal Drive Uploader
   - Authorized redirect URIs: http://localhost:3000/oauth2callback
   - Click 'Create'

3. Copy the Client ID and Client Secret, then run:
   node src/app/backend/scripts/getGoogleDriveOAuthToken.js <YOUR_CLIENT_ID> <YOUR_CLIENT_SECRET>
========================================================================
`);
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPE = 'https://www.googleapis.com/auth/drive';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent'
  }).toString();

console.log('\n========================================================================');
console.log('   CHRIST IQAC - Authorize Your Personal Google Account');
console.log('========================================================================\n');
console.log('1. Open the following link in your browser to authorize Drive uploads:\n');
console.log(authUrl);
console.log('\n2. Waiting for authorization on http://localhost:3000/oauth2callback ...\n');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === '/oauth2callback') {
    const code = parsed.query.code;
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h3>Authorization failed: No authorization code received.</h3>');
      server.close();
      return;
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.refresh_token) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h3>Error retrieving refresh token</h3><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
        server.close();
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family:sans-serif;padding:30px;text-align:center;">
          <h2 style="color:#15803d;">Authorization Successful!</h2>
          <p>Your Google Drive Refresh Token has been generated.</p>
          <p>You can close this tab and return to your terminal.</p>
        </div>
      `);

      console.log('========================================================================');
      console.log('SUCCESS! Copy the following lines into your src/app/backend/.env file:');
      console.log('========================================================================\n');
      console.log(`GOOGLE_DRIVE_CLIENT_ID=${clientId}`);
      console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${clientSecret}`);
      console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokenData.refresh_token}\n`);
      console.log('========================================================================\n');
    } catch (err) {
      console.error('Token exchange error:', err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h3>Internal server error during token exchange</h3>');
    } finally {
      setTimeout(() => server.close(), 1500);
    }
  }
});

server.listen(3000);

