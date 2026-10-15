'use strict';
// CLI entry: argument parsing and subcommand dispatch.

const { fetchKline, resolvePeriod } = require('./kline');
const { fetchQuote } = require('./quote');
const catalog = require('./catalog');
const { format } = require('./format');
const { buildSpec } = require('./spec');
const { BUILTIN_SYMBOLS, PERIOD_ALIASES } = require('./reference');

function parseFlags(argv) {
  const flags = {}; const positional = [];
  const alias = { p: 'period', c: 'count', f: 'format', s: 'search', h: 'help', n: 'name' };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (['raw', 'help', 'json'].includes(key)) { flags[key] = true; continue; }
      flags[key] = argv[++i];
    } else if (a.startsWith('-') && a.length > 1) {
      const key = alias[a.slice(1)] || a.slice(1);
      if (['raw', 'help', 'json'].includes(key)) { flags[key] = true; continue; }
      flags[key] = argv[++i];
    } else positional.push(a);
  }
  return { flags, positional };
}

const HELP = `koudai - 口袋贵金属行情数据工具集 (official.gkoudai.com)

Usage: koudai <command> [options]

Commands:
  kline <symbol>   取 K 线    [--period day] [--count 100] [--format table|json|csv] [--start <date>] [--raw]
  quote <symbol>   取实时报价 [--format table|json]
  symbol resolve <name|code|qid>     解析标的 qid
  symbol search <关键词>              在全部约 388 个标的中搜索
  symbol list                         列出内置别名
  spec                                输出机器可读的调用契约 (JSON, 供 agent 使用)
  version                             输出版本

symbol 支持:内置别名 / 中文名 / 代码 / 任意数字 qid / 任意标的名称(联网自动反查)。
period  支持:1m 3m 5m 10m 15m 20m 30m 60m|1h 2h 3h 4h day week month quarter year 或数字类型码。

示例:
  koudai kline 现货黄金 --period day --count 200 -f csv
  koudai kline 布伦特原油连续 -f json
  koudai quote 美元指数
  koudai symbol search 沪银
  koudai spec`;

async function cmdKline(positional, flags) {
  const symbol = positional[0];
  if (!symbol) throw usage('kline 需要 <symbol>');
  const hit = await catalog.resolve(symbol);
  if (!hit) throw usage(`未知标的: ${symbol}。试试 koudai symbol search ${symbol}`);
  if (resolvePeriod(flags.period || 'day') == null) throw usage(`未知周期: ${flags.period}(见 koudai spec 的 periods)`);
  const result = await fetchKline({
    qid: hit.qid,
    period: flags.period || 'day',
    count: flags.count || 100,
    startTime: flags.start || null,
  });
  result.name = result.name || hit.name;
  process.stdout.write(format(result, flags.format || 'table', { raw: !!flags.raw }) + '\n');
}

async function cmdQuote(positional, flags) {
  const symbol = positional[0];
  if (!symbol) throw usage('quote 需要 <symbol>');
  const hit = await catalog.resolve(symbol);
  if (!hit) throw usage(`未知标的: ${symbol}`);
  const q = await fetchQuote({ qid: hit.qid, tail: Number(flags.tail || 10) });
  if ((flags.format || 'table') === 'json') {
    process.stdout.write(JSON.stringify({ name: hit.name, qid: hit.qid, ...q }, null, 2) + '\n');
    return;
  }
  const l = q.latest;
  process.stdout.write(`${hit.name} (qid=${hit.qid}): ${l ? l.price : 'n/a'}` +
    (l && l.change != null ? `  今涨跌 ${l.change > 0 ? '+' : ''}${l.change}` : '') +
    `  成交 ${l ? l.totalVolume : '-'}  tick ${q.tickCount}\n`);
}

async function cmdSymbol(positional, flags) {
  const sub = positional[0];
  const query = positional[1];
  if (sub === 'list') {
    for (const s of new Map(Object.values(BUILTIN_SYMBOLS).map(x => [x.qid, x])).values())
      process.stdout.write(`  ${s.name} | ${s.code} | qid=${s.qid}\n`);
    return;
  }
  if (sub === 'search') {
    if (!query) throw usage('symbol search 需要关键词');
    const m = await catalog.search(query);
    process.stdout.write(`匹配 "${query}" (${m.length}):\n`);
    for (const a of m.slice(0, 50)) process.stdout.write(`  ${a.name} | ${a.code} | qid=${a.qid}\n`);
    if (m.length > 50) process.stdout.write(`  ...共 ${m.length} 条\n`);
    return;
  }
  if (sub === 'resolve') {
    if (!query) throw usage('symbol resolve 需要名称/代码/qid');
    const hit = await catalog.resolve(query);
    process.stdout.write(hit ? `${hit.name} | ${hit.code} | qid=${hit.qid} | source=${hit.source || 'catalog'}\n` : `未找到: ${query}\n`);
    return;
  }
  throw usage('symbol 子命令: resolve | search | list');
}

function usage(msg) {
  const e = new Error(msg);
  e.usage = true;
  return e;
}

async function run(argv) {
  const [command, ...rest] = argv;
  const { flags, positional } = parseFlags(rest);
  if (flags.help || command === 'help' || !command) { console.log(HELP); return 0; }

  switch (command) {
    case 'kline': return cmdKline(positional, flags);
    case 'quote': return cmdQuote(positional, flags);
    case 'symbol': return cmdSymbol(positional, flags);
    case 'spec': process.stdout.write(JSON.stringify(buildSpec(), null, 2) + '\n'); return;
    case 'version': { const { version } = require('../package.json'); console.log(version); return; }
    default: throw usage(`未知命令: ${command}\n\n${HELP}`);
  }
}

module.exports = { run, HELP };
