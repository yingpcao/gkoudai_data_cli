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

module.exports = { format, table, csv, json };
