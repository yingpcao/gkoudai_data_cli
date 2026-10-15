'use strict';
// Builds the machine-readable contract that an agent consumes to drive the CLI.
// Single source of truth: this object is what `koudai spec` prints as JSON and
// what SPEC.md documents as prose. Keep them in sync via this module.

const pkg = require('../package.json');
const { PERIOD_CODES, PERIOD_ALIASES, BUILTIN_SYMBOLS, STATUS_CODES, CANDLE_FIELDS, ENVELOPE } = require('./reference');

const COMMANDS = [
  {
    name: 'kline',
    summary: 'Fetch OHLC candlestick bars for any instrument.',
    usage: 'koudai kline <symbol> [--period day] [--count 100] [--format table|json|csv] [--start <date>] [--raw]',
    args: [
      { name: 'symbol', positional: true, required: true, desc: 'Built-in alias, Chinese name, code, a raw numeric qid, or any instrument name (auto-resolved over the live catalog of ~388 instruments).' },
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
    data: { envelope: ENVELOPE, statusCodes: STATUS_CODES, candleRawFields: CANDLE_FIELDS },
    periods: { codes: PERIOD_CODES, aliases: PERIOD_ALIASES },
    builtInSymbols: Object.fromEntries(Object.entries(BUILTIN_SYMBOLS).map(([k, v]) => [k, v.qid])),
    commands: COMMANDS,
  };
}

module.exports = { buildSpec, COMMANDS };
