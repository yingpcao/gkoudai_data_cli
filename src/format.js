'use strict';
// Output formatters for kline results.

function table(result) {
  const cols = [['time', 17], ['open', 12], ['high', 12], ['low', 12], ['close', 12], ['volume', 13]];
  const pad = (v, w) => String(v).padEnd(w);
  const out = [];
  out.push(`${result.name}  [${result.typeName}]  ${result.count} bars`);
  out.push(cols.map(c => pad(c[0], c[1])).join(''));
  out.push('-'.repeat(78));
  for (const c of result.candles) {
    out.push(
      pad(c.time, 17) + pad(c.open, 12) + pad(c.high, 12) + pad(c.low, 12) + pad(c.close, 12) + pad(c.volume == null ? '-' : c.volume, 13)
    );
  }
  return out.join('\n');
}

function csv(result) {
  const lines = ['time,timestamp,open,high,low,close,volume'];
  for (const c of result.candles) lines.push([c.time, c.timestamp, c.open, c.high, c.low, c.close, c.volume].join(','));
  return lines.join('\n');
}

function json(result, { raw = false } = {}) {
  const body = raw
    ? { name: result.name, qid: result.qid, period: { code: result.typeCode, name: result.typeName }, count: result.count, candles: result.candles.map(c => c.raw) }
    : { name: result.name, qid: result.qid, period: { code: result.typeCode, name: result.typeName }, count: result.count, candles: result.candles.map(({ raw: _r, ...c }) => c) };
  return JSON.stringify(body, null, 2);
}

function format(result, kind, opts) {
  if (kind === 'csv') return csv(result);
  if (kind === 'json') return json(result, opts);
  return table(result);
}

// ---- 资讯 (news) outputs ----------------------------------------------------

const CSV_CELL = /[",\r\n]/;
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return CSV_CELL.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function newsTable(result) {
  const head = result.symbol
    ? `${result.symbol.name} (qid=${result.symbol.qid}) — ${result.label}`
    : result.label;
  const out = [`${head}  ${result.count} 条`];
  for (const it of result.items) {
    const flag = it.important ? '[重要]' : (it.digest ? '[汇总]' : '      ');
    out.push(`${it.time || '-'}  ${flag} ${it.title}`);
    if (it.body) out.push(`           ${it.body}`);
    if (it.economic) {
      const e = it.economic;
      out.push(`           ${e.event}  公布 ${e.result ?? '-'} / 预期 ${e.forecast ?? '-'} / 前值 ${e.previous ?? '-'}` +
        `${e.level ? `  重要级 ${e.level}` : ''}${e.effectText ? `  ${e.effectText}` : ''}`);
    }
    const extra = [];
    if (it.author) extra.push(`作者 ${it.author}`);
    if (it.source) extra.push(it.source);
    if (it.tag) extra.push(`标签 ${it.tag}`);
    if (it.pdfUrl) extra.push(it.pdfUrl);
    if (it.needRisk) extra.push('需风险测评');
    if (extra.length) out.push(`           ${extra.join(' | ')}`);
  }
  return out.join('\n');
}

const NEWS_CSV_COLS = 'id,time,important,title,source,author,tag,pdfUrl,body';

function newsCsv(result) {
  const lines = [NEWS_CSV_COLS];
  for (const it of result.items) {
    lines.push([
      it.id, it.time, it.important, it.title, it.source || it.media || '', it.author || '',
      it.tag || '', it.pdfUrl || '', it.body || '',
    ].map(csvCell).join(','));
  }
  return lines.join('\n');
}

function newsJson(result) {
  return JSON.stringify({
    kind: result.kind,
    label: result.label,
    symbol: result.symbol || null,
    count: result.count,
    items: result.items,
  }, null, 2);
}

function newsDetailJson(detail) {
  return JSON.stringify(detail, null, 2);
}

function formatNews(result, kind) {
  if (kind === 'csv') return newsCsv(result);
  if (kind === 'json') return newsJson(result);
  return newsTable(result);
}

module.exports = { format, table, csv, json, formatNews, newsTable, newsCsv, newsJson, newsDetailJson };
