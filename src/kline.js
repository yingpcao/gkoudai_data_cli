'use strict';
// K-line (OHLC) domain logic.

const { request } = require('./http');
const { PERIOD_CODES, PERIOD_ALIASES } = require('./reference');

function resolvePeriod(period) {
  if (period == null) return PERIOD_ALIASES.day;
  const p = String(period).toLowerCase();
  if (/^\d+$/.test(p) && PERIOD_CODES[p] != null) return Number(p);
  return PERIOD_ALIASES[p] != null ? PERIOD_ALIASES[p] : null;
}

// Normalise a raw candle into stable, agent-friendly fields. Numbers are parsed
// but original strings are kept for precision-critical consumers via `raw`.
function normaliseCandle(c) {
  return {
    time: c.t,
    timestamp: c.ts,
    open: Number(c.o), high: Number(c.h), low: Number(c.l), close: Number(c.c),
    volume: c.v != null ? Number(c.v) : null,
    amount: c.a != null ? Number(c.a) : null,
    settlement: c.sp, openInterest: c.p, latest: c.nsp,
    raw: c,
  };
}

async function fetchKline({ qid, period = 'day', count = 100, startTime = null }) {
  const type = resolvePeriod(period);
  if (type == null) throw new Error(`Unknown period: ${period}`);
  const params = { qid, type: String(type), count: String(count) };
  if (startTime != null) params.startTime = String(new Date(startTime).getTime());
  const data = await request('kline', params);
  const body = data.data || data; // envelope is { status, desc, data:{info,candle} }
  const candles = (body.candle || []).map(normaliseCandle);
  return { name: body.info && body.info.name, qid: body.info && String(body.info.id), typeCode: type, typeName: PERIOD_CODES[type], count: candles.length, candles };
}

module.exports = { fetchKline, resolvePeriod, normaliseCandle };
