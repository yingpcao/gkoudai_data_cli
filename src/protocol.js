'use strict';
// Request/response crypto envelope for official.gkoudai.com.
// Reconstructed from the 口袋贵金属 Electron bundle (module "1c98" + request builder P()).
//
//   sessionKey = 8 random chars from a fixed alphabet
//   x = base64( DES-CBC( plaintextQuery, key=sessionKey, iv="sojexcom" ) )
//   y = base64( RSA-PKCS1#1.5( sessionKey, <1024-bit public key> ) )
//   request : GET <path>?x=<x>&y=<y>
//   response: { status, desc, data } -> JSON.parse( DES-CBC-decrypt(data, sessionKey, iv) )
//
// Node 17+ requires the OpenSSL legacy provider for `des-cbc`; bin/koudai.js handles that.

const crypto = require('crypto');

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCSXd2sXgyTCjAcY+oeFZ/UvqRINzCFuyki506XEnyUyxJSilCvPkfoeqE4O292Fi3h/jtECNAc77P1/tcqq+RiQAZV7ZBNMWAs2XBu5wUU16uM87c+Lts7RGabAR4CyPMs9ue0bUY1AscHev8bkZRzfwX+LeyoI9XxDHM4mUQjEwIDAQAB
-----END PUBLIC KEY-----`;

const IV = 'sojexcom';
const KEY_ALPHABET = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';

function generateSessionKey() {
  let s = '';
  for (let i = 0; i < 8; i++) s += KEY_ALPHABET[Math.round(61 * Math.random())];
  return s;
}

function desEncrypt(plaintext, key) {
  const c = crypto.createCipheriv('des-cbc', Buffer.from(key, 'latin1'), Buffer.from(IV, 'latin1'));
  return c.update(plaintext, 'utf8', 'base64') + c.final('base64');
}

function desDecrypt(base64, key) {
  const d = crypto.createDecipheriv('des-cbc', Buffer.from(key, 'latin1'), Buffer.from(IV, 'latin1'));
  return d.update(base64, 'base64', 'utf8') + d.final('utf8');
}

// Mirrors the app's JSEncrypt.encrypt() -> RSA PKCS#1 v1.5, base64 output.
function rsaEncryptSessionKey(sessionKey) {
  return crypto
    .publicEncrypt({ key: RSA_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(sessionKey, 'utf8'))
    .toString('base64');
}

// serialise params the way the app does: qs.stringify(obj, { encode: false })
function serialiseQuery(params) {
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${k}=${params[k]}`)
    .join('&');
}

function buildEnvelope(params) {
  const sessionKey = generateSessionKey();
  const query = serialiseQuery(params);
  return { sessionKey, x: desEncrypt(query, sessionKey), y: rsaEncryptSessionKey(sessionKey) };
}

module.exports = { generateSessionKey, desEncrypt, desDecrypt, rsaEncryptSessionKey, serialiseQuery, buildEnvelope, RSA_PUBLIC_KEY, IV };
