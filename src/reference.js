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

// Business endpoint paths (relative to BASE_URL). `viewpoint*` deliberately lives
// under a different prefix (/futures) than everything else here.
const ENDPOINTS = {
  kline: 'officialNetworkApi/CandleStickV2',
  realtimeQuote: 'officialNetworkApi/getRealTimeQuote',
  quoteCategories: 'officialNetworkApi/GetQuoteTypesV4',
  quotesByCategory: 'officialNetworkApi/typeQuotesByTidV4',
  // 资讯 — five unrelated backends behind one UI panel.
  instrumentFlash: 'officialNetworkApi/attachNews/getNewsFlash',
  newsWire: 'officialNetworkApi/RealTimeList',
  newsWireBefore: 'officialNetworkApi/RealTimeListByid',
  newsTypes: 'officialNetworkApi/newsServer/getNewsType',
  newsColumnPage: 'officialNetworkApi/newsServer/pageSpecialColumnNewsByType',
  newsContent: 'officialNetworkApi/newsServer/getNewsContent',
  viewpointList: 'futures/getPointNews',
  viewpointDetail: 'futures/getPointNewsById',
  reportList: 'officialNetworkApi/newsServer/reportListV2',
  reportDetail: 'officialNetworkApi/newsServer/reportDetail',
};

// Editorial columns (newsServer/getNewsType). Server is authoritative; kept here
// so `--type 黄金分析` resolves offline.
const NEWS_COLUMNS = {
  1: '黄金分析', 2: '央行动态', 3: '大宗商品', 4: '股债市场', 5: '地缘局势',
};

// 资讯 feed kinds and what each one maps to.
const NEWS_KINDS = {
  flash: { label: '品种快讯', endpoint: 'instrumentFlash', needsSymbol: true, detail: null },
  wire: { label: '7x24 快讯流', endpoint: 'newsWire', needsSymbol: false, detail: null },
  column: { label: '资讯专栏', endpoint: 'newsColumnPage', needsSymbol: false, detail: 'newsContent' },
  viewpoint: { label: '机构观点', endpoint: 'viewpointList', needsSymbol: true, detail: 'viewpointDetail' },
  report: { label: '研报', endpoint: 'reportList', needsSymbol: true, detail: 'reportDetail' },
};

// Research reports only exist for exchange-traded futures qids (e.g. 沪锡主连
// 35105); spot metals (12/13), LME (95/92) and indices (22) always return empty.
const NEWS_NOTES = {
  reportCoverage: '研报仅覆盖期货品种 qid，现货/LME/指数类标的恒为空列表',
  viewpointPrefix: '机构观点走 /futures/ 前缀，与其余 officialNetworkApi 接口不同',
  reportPdf: 'report.pdfUrl 是券商官网直链，可离线下载；正文不提供 HTML',
  economicEvents: 'wire 条目 type="data" 时带 economic 字段，是经济日历发布',
  authRequired: 'indicator/queryNewsByTsRange 等带 accessToken 的接口需登录，本工具未实现',
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

// Response envelope status codes observed from the API. Both the outer transport
// envelope and the decrypted body carry `status`; see http.js — the body layer is
// the one that reports bad ids.
const STATUS_CODES = {
  1000: 'OK / success (data decrypted)',
  1002: 'Response Error (e.g. unknown news id)',
  1003: 'Parameters Error',
  1008: 'Server Error (upstream rejects the arguments, e.g. unknown detail id)',
  1502: 'Login expired / requires auth',
  404: 'Route not found (usually a missing officialNetworkApi/ prefix)',
};

// Candle field glossary (raw API keys).
const CANDLE_FIELDS = {
  t: 'bar time label (e.g. "2026-10-15" or "10-15 09:00")',
  ts: 'bar start time, epoch milliseconds',
  o: 'open', h: 'high', l: 'low', c: 'close',
  v: 'volume', a: 'amount (成交额)',
  sp: 'settlement price', p: 'open interest / position', nsp: 'latest price',
};

module.exports = {
  HOST, BASE_URL, ENVELOPE, ENDPOINTS, NEWS_COLUMNS, NEWS_KINDS, NEWS_NOTES,
  PERIOD_CODES, PERIOD_ALIASES, BUILTIN_SYMBOLS, STATUS_CODES, CANDLE_FIELDS,
};
