'use strict';
// Encrypted HTTP client. Builds the DES/RSA envelope, issues the request and
// decrypts the response. Returns the parsed business payload on success, and
// throws a typed ApiError when the server signals a non-success status.

const https = require('https');
const { HOST, ENDPOINTS } = require('./reference');
const { buildEnvelope, desDecrypt } = require('./protocol');

class ApiError extends Error {
  constructor(status, desc) {
    super(`koudai API status=${status} desc=${desc}`);
    this.name = 'ApiError';
    this.status = status;
    this.desc = desc;
  }
}

function once(path, params, timeoutMs) {
  return new Promise((resolve, reject) => {
    const { sessionKey, x, y } = buildEnvelope(params);
    const reqPath = `${path}?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`;
    const req = https.request(
      {
        hostname: HOST,
        path: reqPath,
        method: 'GET',
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'koudai-data/1.0',
          Referer: `https://${HOST}/`,
        },
      },
      res => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => {
          let env;
          try { env = JSON.parse(raw); }
          catch { return reject(new Error(`non-JSON response ${res.statusCode}: ${raw.slice(0, 200)}`)); }
          if (env.status !== 1000) return reject(new ApiError(env.status, env.desc));
          try { resolve(JSON.parse(desDecrypt(env.data, sessionKey))); }
          catch (e) { reject(new Error(`decrypt failed: ${e.message}`)); }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function request(endpoint, params = {}, { retries = 1, timeoutMs = 12000 } = {}) {
  const raw = ENDPOINTS[endpoint] || endpoint; // allow raw path passthrough
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await once(path, params, timeoutMs); }
    catch (e) {
      lastErr = e;
      if (e instanceof ApiError) break; // business error, don't retry
    }
  }
  throw lastErr;
}

module.exports = { request, ApiError };
