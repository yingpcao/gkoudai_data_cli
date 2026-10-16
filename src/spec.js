'use strict';
// Builds the machine-readable contract that an agent consumes to drive the CLI.
// Single source of truth: this object is what `koudai spec` prints as JSON and
// what SPEC.md documents as prose. Keep them in sync via this module.

const pkg = require('../package.json');
const { PERIOD_CODES, PERIOD_ALIASES, BUILTIN_SYMBOLS, STATUS_CODES, CANDLE_FIELDS, ENVELOPE, ENDPOINTS, NEWS_COLUMNS, NEWS_KINDS, NEWS_NOTES } = require('./reference');

const COMMANDS = [
  {
    name: 'kline',
    summary: 'Fetch OHLC candlestick bars for any instrument.',
    usage: 'koudai kline <symbol> [--period day] [--count 100] [--format table|json|csv] [--start <date>] [--raw]',
    args: [
      { name: 'symbol', positional: true, required: true, desc: 'Built-in alias, Chinese name, code, a raw numeric qid, or any instrument name (auto-resolved over the live catalog of ~396 instruments; full list in docs/instruments.md).' },
      { name: '--period', default: 'day', desc: 'Bar period alias or numeric type code. See spec.periods.' },
      { name: '--count', default: 100, desc: 'Number of most-recent bars.' },
      { name: '--start', desc: 'ISO date / timestamp; returns bars around that historical start (server-side pagination hint).' },
      { name: '--format', default: 'table', enum: ['table', 'json', 'csv'], desc: 'Output format. json is the stable machine-readable contract.' },
      { name: '--raw', desc: 'With --format json, emit raw upstream candle fields instead of normalised ones.' },
    ],
    output: {
      shape: 'kline.json',
      fields: { name: 'string', qid: 'string', period: { code: 'number', name: 'string' }, count: 'number', candles: 'Candle[]' },
      candle: { time: 'string', timestamp: 'epoch-ms', open: 'number', high: 'number', low: 'number', close: 'number', volume: 'number|null', amount: 'number|null', settlement: 'string', openInterest: 'string', latest: 'string' },
    },
    exitCodes: { 0: 'ok', 1: 'usage / unknown symbol or period', 2: 'API business error (see status)', 3: 'transport / decrypt error' },
  },
  {
    name: 'quote',
    summary: 'Fetch real-time quote snapshot(s).',
    usage: 'koudai quote <symbol> [--format table|json]',
    args: [{ name: 'symbol', positional: true, required: true, desc: 'Same resolution rules as kline.' }],
    exitCodes: { 0: 'ok', 1: 'usage / unknown symbol', 2: 'API business error', 3: 'transport error' },
  },
  {
    name: 'news',
    summary: 'Fetch 资讯: instrument flashes, the global 7x24 wire, broker viewpoints, research reports and editorial columns.',
    usage: 'koudai news <mode> [symbol] [--count 20] [--format table|json|csv]',
    args: [
      { name: 'mode', positional: true, required: true, enum: ['flash', 'wire', 'column', 'viewpoint', 'report', 'types', 'show'], desc: 'flash=品种快讯(needs symbol, defaults when mode omitted); wire=全局7x24快讯流(no symbol); column=资讯专栏; viewpoint=机构观点(needs symbol); report=研报(needs symbol); types=列出专栏分类; show=按 id 取正文。' },
      { name: 'symbol', positional: true, desc: 'Same resolution rules as kline. Required for flash/viewpoint/report; unused by wire/column.' },
      { name: '--count', default: 20, desc: 'Number of items. Pages upstream cursors transparently (flash/wire page by id-or-time cursor; column/viewpoint/report by page number).' },
      { name: '--important', desc: 'wire only. Restrict to the red-flagged "重要" stream (upstream marks it with color="红色").' },
      { name: '--type', default: '黄金分析', desc: 'column/show only. Column name or numeric id. See `koudai news types`.' },
      { name: '--kind', desc: 'show only. One of column|viewpoint|report — selects the detail endpoint.' },
      { name: '--format', default: 'table', enum: ['table', 'json', 'csv'], desc: 'json is the stable machine-readable contract.' },
    ],
    output: {
      shape: 'news.json',
      fields: { kind: 'string', label: 'string', symbol: '{name,qid}|null', count: 'number', items: 'NewsItem[]' },
      item: {
        id: 'string|number', timestamp: 'epoch-ms', time: '"YYYY-MM-DD HH:mm:ss" Beijing', title: 'string',
        body: 'string|null (flash/wire only — full text after the 【headline】)',
        important: '0|1 (flash/wire)',
        economic: '{event,country,showTime,result,forecast,previous,revised,level,effect,effectText}|null (wire items with upstream type="data", i.e. economic-calendar releases)',
        source: 'string|null (viewpoint media, column source)', digest: 'bool (viewpoint: multi-house morning summary)',
        author: 'string|null (report)', tag: 'string|null (report)', pdfUrl: 'string|null (report — direct PDF on the broker site)',
        needRisk: 'bool (report — client gates it behind a risk assessment, which needs login)',
      },
      detail: 'show --format json returns {id,title,time,source|author,content(HTML),text(plain)}; report returns {…,pdfUrl} with no HTML body.',
    },
    caveats: NEWS_NOTES,
    exitCodes: { 0: 'ok', 1: 'usage / unknown symbol or column', 2: 'API business error', 3: 'transport error' },
  },
  {
    name: 'symbol',
    summary: 'Resolve or search instruments.',
    usage: 'koudai symbol resolve <query> | koudai symbol search <keyword> | koudai symbol list',
    args: [
      { name: 'resolve', desc: 'Print best qid match.' },
      { name: 'search', desc: 'List matches (name/code/qid substring).' },
      { name: 'list', desc: 'List built-in aliases.' },
    ],
  },
  { name: 'spec', summary: 'Print this machine-readable contract (JSON).', usage: 'koudai spec' },
  { name: 'version', summary: 'Print package version.', usage: 'koudai version' },
];

function buildSpec() {
  return {
    tool: pkg.name,
    version: pkg.version,
    summary: pkg.description,
    runtime: { command: 'koudai', entry: 'bin/koudai.js', node: pkg.engines?.node, notes: 'Re-execs with --openssl-legacy-provider for DES-CBC.' },
    data: { envelope: ENVELOPE, statusCodes: STATUS_CODES, candleRawFields: CANDLE_FIELDS, endpoints: ENDPOINTS },
    periods: { codes: PERIOD_CODES, aliases: PERIOD_ALIASES },
    news: { kinds: NEWS_KINDS, columns: NEWS_COLUMNS, notes: NEWS_NOTES },
    builtInSymbols: Object.fromEntries(Object.entries(BUILTIN_SYMBOLS).map(([k, v]) => [k, v.qid])),
    commands: COMMANDS,
  };
}

module.exports = { buildSpec, COMMANDS };
