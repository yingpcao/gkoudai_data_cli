'use strict';
// Single source of truth for all endpoints, codes and field meanings.
// The `koudai spec` command serialises this into a machine-readable contract.

const HOST = 'official.gkoudai.com';
const BASE_URL = `https://${HOST}/`;

// Reverse-engineered request envelope (see protocol.js).
const ENVELOPE = {
  scheme: 'DES-CBC + RSA-1024',
  iv: 'sojexcom',
  keyLength: 8,
  transport: 'GET <path>?x=<base64(des(plaintextQuery))>&y=<base64(rsa(sessionKey))>',
  response: 'JSON {status,desc,data}; data is base64 DES ciphertext decrypted with the session key',
};

// Business endpoint paths (relative to BASE_URL).
const ENDPOINTS = {
  kline: 'officialNetworkApi/CandleStickV2',
  realtimeQuote: 'officialNetworkApi/getRealTimeQuote',
  quoteCategories: 'officialNetworkApi/GetQuoteTypesV4',
  quotesByCategory: 'officialNetworkApi/typeQuotesByTidV4',
};

// CandleStick `type` period codes.
const PERIOD_CODES = {
  1: '1min', 2: '5min', 3: '15min', 4: '30min', 5: '60min', 6: 'day',
  7: 'week', 8: 'month', 9: '4hour', 10: '3min', 12: '2hour', 13: '10min',
  14: '3hour', 15: 'year', 16: '20min', 17: 'quarter',
};

// Human aliases -> period code.
const PERIOD_ALIASES = {
  '1m': 1, '3m': 10, '5m': 2, '10m': 13, '15m': 3, '20m': 16, '30m': 4,
  '60m': 5, '1h': 5, '2h': 12, '3h': 14, '4h': 9,
  day: 6, week: 7, month: 8, quarter: 17, year: 15,
  '1分': 1, '3分': 10, '5分': 2, '10分': 13, '15分': 3, '20分': 16, '30分': 4,
  '1小时': 5, '2小时': 12, '3小时': 14, '4小时': 9,
  '日线': 6, '周线': 7, '月线': 8, '季线': 17, '年线': 15,
};

// Convenience aliases for frequently-used instruments (any of ~396 instruments
// is supported via catalog resolution or a raw numeric qid).
const BUILTIN_SYMBOLS = {
  'LME铜': { qid: '95', code: 'LMECU', name: 'LME铜' },
  'LME锡': { qid: '92', code: 'LMESN', name: 'LME锡' },
  '现货白银': { qid: '13', code: 'XAG', name: '现货白银' },
  '现货黄金': { qid: '12', code: 'XAU', name: '现货黄金' },
  '美元指数': { qid: '22', code: 'DINI', name: '美元指数' },
  '沪锡主连': { qid: '35105', code: 'sn6666', name: '沪锡主连' },
  // latin aliases
  lmecopper: { qid: '95', code: 'LMECU', name: 'LME铜' },
  lmetin: { qid: '92', code: 'LMESN', name: 'LME锡' },
  xag: { qid: '13', code: 'XAG', name: '现货白银' },
  xau: { qid: '12', code: 'XAU', name: '现货黄金' },
  dxy: { qid: '22', code: 'DINI', name: '美元指数' },
  'spot-silver': { qid: '13', code: 'XAG', name: '现货白银' },
  'spot-gold': { qid: '12', code: 'XAU', name: '现货黄金' },
  'usd-index': { qid: '22', code: 'DINI', name: '美元指数' },
  'shanghai-tin': { qid: '35105', code: 'sn6666', name: '沪锡主连' },
};

// Response envelope status codes observed from the API.
const STATUS_CODES = {
  1000: 'OK / success (data decrypted)',
  1003: 'Parameters Error',
  1502: 'Login expired / requires auth',
  404: 'Route not found',
};

// Candle field glossary (raw API keys).
const CANDLE_FIELDS = {
  t: 'bar time label (e.g. "2026-10-15" or "10-15 09:00")',
  ts: 'bar start time, epoch milliseconds',
  o: 'open', h: 'high', l: 'low', c: 'close',
  v: 'volume', a: 'amount (成交额)',
  sp: 'settlement price', p: 'open interest / position', nsp: 'latest price',
};

module.exports = { HOST, BASE_URL, ENVELOPE, ENDPOINTS, PERIOD_CODES, PERIOD_ALIASES, BUILTIN_SYMBOLS, STATUS_CODES, CANDLE_FIELDS };
