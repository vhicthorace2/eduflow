const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Google Identity Services integration.
 *
 * Verifies the ID token (a Google-signed RS256 JWT) that the browser button
 * hands back, using Google's published signing keys. No extra dependency: the
 * JWK is imported with Node's crypto and verified with the jsonwebtoken package
 * already used for session tokens.
 */

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const JWKS_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

let keyCache = { keys: [], fetchedAt: 0 };

const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID);

const authError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

async function fetchSigningKeys(force = false) {
  const fresh = Date.now() - keyCache.fetchedAt < JWKS_TTL_MS;
  if (!force && keyCache.keys.length > 0 && fresh) return keyCache.keys;

  const response = await fetch(JWKS_URL, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    throw authError(`Could not load Google signing keys (${response.status})`, 503);
  }

  const body = await response.json();
  keyCache = { keys: Array.isArray(body.keys) ? body.keys : [], fetchedAt: Date.now() };
  return keyCache.keys;
}

function findKey(keys, kid) {
  const jwk = keys.find((key) => key.kid === kid);
  if (!jwk) return null;
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

/**
 * Verify a Google ID token and return its payload. Throws an error carrying a
 * `statusCode` when the token is missing, malformed, expired, or not issued for
 * this application.
 */
async function verifyGoogleIdToken(idToken) {
  if (!isGoogleConfigured()) {
    throw authError('Google sign-in is not configured', 503);
  }

  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded && decoded.header && decoded.header.kid;
  if (!kid) {
    throw authError('Invalid Google credential', 401);
  }

  let publicKey = findKey(await fetchSigningKeys(), kid);
  if (!publicKey) {
    // The key set may have rotated since it was cached; refresh once.
    publicKey = findKey(await fetchSigningKeys(true), kid);
  }
  if (!publicKey) {
    throw authError('Invalid Google credential', 401);
  }

  try {
    return jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: process.env.GOOGLE_CLIENT_ID,
      issuer: VALID_ISSUERS
    });
  } catch (error) {
    throw authError('Google authentication failed', 401);
  }
}

module.exports = { isGoogleConfigured, verifyGoogleIdToken };
