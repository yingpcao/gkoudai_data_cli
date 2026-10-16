'use strict';
// CLI entry: argument parsing and subcommand dispatch.

const { fetchKline, resolvePeriod } = require('./kline');
const { fetchQuote } = require('./quote');
const news = require('./news');
const catalog = require('./catalog');
const { format, formatNews, newsDetailJson } = require('./format');
const { buildSpec } = require('./spec');
const { BUILTIN_SYMBOLS, PERIOD_ALIASES, NEWS_COLUMNS, NEWS_KINDS } = require('./reference');

function parseFlags(argv) {
  const flags = {}; const positional = [];
  const alias = { p: 'period', c: 'count', f: 'format', s: 'search', h: 'help', n: 'name', k: 'kind', t: 'type' };
  const boolFlags = ['raw', 'help', 'json', 'important'];
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (boolFlags.includes(key)) { flags[key] = true; continue; }
      flags[key] = argv[++i];
    } else if (a.startsWith('-') && a.length > 1) {
      const key = alias[a.slice(1)] || a.slice(1);
      if (boolFlags.includes(key)) { flags[key] = true; continue; }
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
  news <mode>      取资讯     [--count 20] [--format table|json|csv]
  symbol resolve <name|code|qid>     解析标的 qid
  symbol search <关键词>              在全部 396 个标的中搜索
  symbol list                         列出内置别名
  spec                                输出机器可读的调用契约 (JSON, 供 agent 使用)
  version                             输出版本

news <mode>:
  flash <symbol>        品种快讯        (K线下方"相关快讯")
  wire [--important]    7x24 全局快讯流 (左侧"资讯"栏; 含经济日历 type=data)
  column [--type 黄金分析]  资讯专栏     (--type 1黄金分析 2央行动态 3大宗商品 4股债市场 5地缘局势)
  viewpoint <symbol>    机构观点        (期货公司观点, 走 /futures 前缀)
  report <symbol>       研报            (仅期货品种有数据; 返回 pdfUrl 直链)
  types                 列出专栏分类
  show <id> --kind column|viewpoint|report [--type <专栏名|id>]   取正文/详情
  缺省 mode 视为 flash: koudai news 现货黄金

symbol 支持:内置别名 / 中文名 / 代码 / 任意数字 qid / 任意标的名称(联网自动反查)。
period  支持:1m 3m 5m 10m 15m 20m 30m 60m|1h 2h 3h 4h day week month quarter year 或数字类型码。

示例:
  koudai kline 现货黄金 --period day --count 200 -f csv
  koudai kline 布伦特原油连续 -f json
  koudai quote 美元指数
  koudai news wire --important -f json
  koudai news flash 沪锡主连 --count 30
  koudai news report 35105 -f json
  koudai news column --type 地缘局势
  koudai news show 73450 --kind column --type 黄金分析
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

const NEWS_MODES = ['flash', 'wire', 'column', 'viewpoint', 'report', 'types', 'show'];
const NEWS_DETAIL_KINDS = ['column', 'viewpoint', 'report'];

// `--type` accepts a column name ("黄金分析") or its numeric id.
function resolveColumnType(value) {
  if (value == null) return 1;
  const s = String(value).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const id = Object.keys(NEWS_COLUMNS).find(k => NEWS_COLUMNS[k] === s);
  if (!id) throw usage(`未知专栏: ${value}。可选: ${Object.values(NEWS_COLUMNS).join(' / ')} (koudai news types)`);
  return Number(id);
}

async function cmdNews(positional, flags) {
  // `koudai news 现货黄金` is the common case — treat a non-mode as a symbol.
  let mode = positional[0];
  let rest = positional.slice(1);
  if (mode != null && !NEWS_MODES.includes(mode)) { rest = positional; mode = 'flash'; }
  if (mode == null) mode = 'wire';
  const formatKind = flags.format || 'table';
  const count = Number(flags.count || 20);
  if (!Number.isFinite(count) || count <= 0) throw usage(`--count 需要正整数: ${flags.count}`);

  if (mode === 'types') {
    const types = await news.fetchColumnTypes();
    process.stdout.write((formatKind === 'json' ? JSON.stringify(types, null, 2)
      : types.map(t => `  ${t.typeId}  ${t.name}`).join('\n')) + '\n');
    return;
  }

  if (mode === 'show') {
    const id = rest[0];
    const kind = flags.kind;
    if (!id) throw usage('news show 需要 <id>');
    if (!NEWS_DETAIL_KINDS.includes(kind)) throw usage(`news show --kind 只能是 ${NEWS_DETAIL_KINDS.join('|')}`);
    let detail;
    if (kind === 'column') detail = await news.fetchColumnContent({ type: resolveColumnType(flags.type), id });
    else if (kind === 'viewpoint') detail = await news.fetchViewpointContent({ id });
    else detail = await news.fetchReportContent({ id });
    if (formatKind === 'json') { process.stdout.write(newsDetailJson(detail) + '\n'); return; }
    process.stdout.write(`${detail.title}\n${detail.time || ''}  ${detail.source || detail.author || ''}\n`.trimEnd() + '\n');
    if (detail.pdfUrl) { process.stdout.write(`PDF: ${detail.pdfUrl}\n`); return; }
    process.stdout.write('\n' + (detail.text || (detail.imageCount ? `(无文字正文, ${detail.imageCount} 张配图)` : '')) + '\n');
    return;
  }

  const meta = NEWS_KINDS[mode];
  let symbol = null;
  let items;
  if (meta.needsSymbol) {
    const query = rest[0];
    if (!query) throw usage(`news ${mode} 需要 <symbol>`);
    const hit = await catalog.resolve(query);
    if (!hit) throw usage(`未知标的: ${query}。试试 koudai symbol search ${query}`);
    symbol = { name: hit.name, qid: hit.qid };
    if (mode === 'flash') items = await news.fetchInstrumentFlash({ qid: hit.qid, count });
    else if (mode === 'viewpoint') items = await news.fetchViewpoint({ qid: hit.qid, count });
    else items = await news.fetchReport({ qid: hit.qid, count });
  } else if (mode === 'wire') {
    items = await news.fetchWire({ count, important: !!flags.important });
  } else {
    items = await news.fetchColumn({ type: resolveColumnType(flags.type), count });
  }
  process.stdout.write(formatNews({ kind: mode, label: meta.label, symbol, count: items.length, items }, formatKind) + '\n');
}

async function run(argv) {
  const [command, ...rest] = argv;
  if (command == null || ['help', '-h', '--help'].includes(command)) { console.log(HELP); return 0; }
  if (['-v', '--version'].includes(command)) { const { version } = require('../package.json'); console.log(version); return; }
  const { flags, positional } = parseFlags(rest);
  if (flags.help) { console.log(HELP); return 0; }

  switch (command) {
    case 'kline': return cmdKline(positional, flags);
    case 'quote': return cmdQuote(positional, flags);
    case 'news': return cmdNews(positional, flags);
    case 'symbol': return cmdSymbol(positional, flags);
    case 'spec': process.stdout.write(JSON.stringify(buildSpec(), null, 2) + '\n'); return;
    case 'version': { const { version } = require('../package.json'); console.log(version); return; }
    default: throw usage(`未知命令: ${command}\n\n${HELP}`);
  }
}

module.exports = { run, HELP };
