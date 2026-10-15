'use strict';
// Real-time quote domain logic.
// getRealTimeQuote returns the current-session tick (分时) series; we expose the
// latest snapshot plus a short tail.

const { request } = require('./http');

function toTick(q) {
  return {
    price: q.price != null ? Number(q.price) : null,
    volume: q.nowVol != null ? Number(q.nowVol) : null,
    totalVolume: q.totalVol != null ? Number(q.totalVol) : null,
    openInterest: q.positionVol != null ? Number(q.positionVol) : null,
    timestamp: q.time != null ? Number(q.time) : null,
  };
}

async function fetchQuote({ qid, tail = 10 }) {
  const data = await request('realtimeQuote', { qid });
  const raw = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : (data && data.data ? [data.data] : []);
  const ticks = raw.map(toTick).filter(t => t.price != null).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const last = ticks[ticks.length - 1] || null;
  const first = ticks[0] || null;
  const latest = last ? { ...last, change: first ? +(last.price - first.price).toFixed(4) : null } : null;
  return { qid, tickCount: ticks.length, latest, ticks: ticks.slice(-tail) };
}

module.exports = { fetchQuote, toTick };
