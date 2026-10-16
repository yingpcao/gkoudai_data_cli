'use strict';
// 资讯 (news) domain logic.
//
// The client's "资讯" surface is five unrelated backends, not one API:
//   flash     - per-instrument newswire  (officialNetworkApi/attachNews/getNewsFlash)
//   wire      - global 7x24 stream       (officialNetworkApi/RealTimeList[Byid])
//   column    - editorial columns        (officialNetworkApi/newsServer/…)
//   viewpoint - broker commentary        (futures/getPointNews — different prefix!)
//   report    - research reports         (officialNetworkApi/newsServer/reportListV2)
// Each has its own cursor style and time encoding; the fetchers below normalise
// all of them into one item shape.

const { request } = require('./http');

const CST_OFFSET_MS = 8 * 3600 * 1000;

// Upstream renders wall-clock strings in Beijing time and epoch-ms as strings too.
function parseCstWallClock(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (/^\d{12,13}$/.test(s)) return Number(s);
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - CST_OFFSET_MS;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function formatCst(ms) {
  if (ms == null) return null;
  return new Date(ms + CST_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
}

function toMs(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stripTags(text) {
  return String(text == null ? '' : text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Mirrors the client: a leading 【…】 is the headline, the remainder is the body.
function splitHeadline(text) {
  const m = /【(.*?)】/.exec(text);
  if (!m) return { title: text, body: null };
  const body = text.replace(m[0], '').trim();
  return { title: m[1].trim(), body: body || null };
}

function effectLabel(effect) {
  const n = Number(effect);
  if (!Number.isFinite(n)) return null;
  return n === 0 ? '影响较小' : n > 0 ? '利多金银' : '利空金银';
}

// ---- normalisers -----------------------------------------------------------

// Shared by `flash` and `wire`. `wire` omits `important` and marks it via color.
function normaliseFlashItem(n) {
  const { title, body } = splitHeadline(stripTags(n.context));
  const timestamp = toMs(n.time);
  const item = {
    id: n.id,
    timestamp,
    time: timestamp == null ? null : formatCst(timestamp),
    title,
    body,
    important: n.important != null ? Number(n.important) : (n.color === '红色' ? 1 : 0),
  };
  if (n.type === 'data' && n.type_data) {
    const t = n.type_data;
    item.economic = {
      event: t.context || null,
      country: t.country || null,
      showTime: t.show_time || null,
      result: t.result == null ? null : String(t.result),
      forecast: t.forecast == null ? null : String(t.forecast),
      previous: t.lastValue == null ? null : String(t.lastValue),
      revised: t.revise == null ? null : String(t.revise),
      level: toMs(t.level),
      effect: toMs(t.effect),
      effectText: t.conclusion || effectLabel(t.effect),
    };
  }
  return item;
}

function normaliseViewpointItem(r) {
  return {
    id: r.id,
    timestamp: parseCstWallClock(r.time),
    time: r.time || null,
    title: stripTags(r.title),
    body: null,
    important: 0,
    source: r.media || null,
    digest: Number(r.newsType || 0) === 1,
  };
}

function normaliseReportItem(r) {
  return {
    id: r.reportId,
    timestamp: parseCstWallClock(r.publishTime),
    time: r.publishTime || null,
    title: stripTags(r.title),
    body: null,
    important: 0,
    author: r.author || null,
    tag: r.tag || null,
    pdfUrl: r.pdfPath || null,
    needRisk: !!r.needRisk,
    directPdf: !!r.directPdf,
  };
}

function normaliseColumnItem(n) {
  return {
    id: n.id,
    timestamp: parseCstWallClock(n.time),
    time: n.time || null,
    title: stripTags(n.title),
    body: null,
    important: 0,
    media: n.media || null,
    original: Number(n.original || 0),
    top: Number(n.topPost || 0),
  };
}

// Upstream mixes `"YYYY-MM-DD HH:mm:ss"` and ISO `…T…` for the same concept.
function normaliseTimeText(value) {
  return value ? String(value).replace('T', ' ') : null;
}

// Some columns are pure image posts, so the HTML body strips down to "". Counting
// the images tells a consumer the article is not actually empty.
function countImages(html) {
  return String(html || '').split(/<img\b/i).length - 1;
}

// ---- list fetchers (each hides its own pagination) -------------------------

// Wraps `request` so a short page / missing hasNext always terminates the loop.
async function collect(count, fetchPage) {
  const items = [];
  let page = 1;
  while (items.length < count) {
    const { batch, hasMore } = await fetchPage(page);
    items.push(...batch);
    if (!batch.length || !hasMore) break;
    page++;
  }
  return items.slice(0, count);
}

async function fetchInstrumentFlash({ qid, count = 20 }) {
  let cursor = null;
  return collect(count, async (page) => {
    const params = { qid, page };
    if (cursor != null) params.time = cursor;
    const data = await request('instrumentFlash', params);
    const batch = (data.data || []).map(normaliseFlashItem);
    const last = (data.data || [])[batch.length - 1];
    if (last) cursor = last.time;
    return { batch, hasMore: batch.length >= 10 };
  });
}

// `wire` pages backwards by item id, not by page number.
async function fetchWire({ count = 20, important = false } = {}) {
  let anchor = null;
  const imp = important ? 1 : 0;
  return collect(count, async () => {
    const data = anchor == null
      ? await request('newsWire', { page: 1, important: imp })
      : await request('newsWireBefore', { id: anchor, important: imp });
    const raw = data.data || [];
    const batch = raw.map(normaliseFlashItem);
    if (raw.length) anchor = raw[raw.length - 1].id;
    return { batch, hasMore: raw.length >= 20 };
  });
}

async function fetchViewpoint({ qid, count = 10 }) {
  return collect(count, async (page) => {
    const data = await request('viewpointList', { qid, page, size: 10 });
    const batch = ((data.data || {}).data || []).map(normaliseViewpointItem);
    return { batch, hasMore: batch.length >= 10 };
  });
}

async function fetchReport({ qid, count = 10 }) {
  return collect(count, async (page) => {
    const data = await request('reportList', { qid, page, size: 10 });
    const body = data.data || {};
    return { batch: (body.reports || []).map(normaliseReportItem), hasMore: !!body.hasNext };
  });
}

async function fetchColumn({ type = 1, count = 20 }) {
  return collect(count, async (pageNum) => {
    const data = await request('newsColumnPage', { type, pageNum });
    const body = data.data || {};
    return { batch: (body.list || []).map(normaliseColumnItem), hasMore: !!body.hasNext };
  });
}

async function fetchColumnTypes() {
  const data = await request('newsTypes');
  return (data.data || []).map(t => ({ typeId: t.typeId, name: t.name }));
}

// ---- detail fetchers -------------------------------------------------------

async function fetchColumnContent({ type, id }) {
  const data = await request('newsContent', { type, id });
  const n = data.data || {};
  return {
    id: n.id, title: stripTags(n.title), time: normaliseTimeText(n.newsTime), source: n.source || null,
    content: n.content || '', text: stripTags(n.content), imageCount: countImages(n.content),
    picture: n.picture || null,
  };
}

async function fetchViewpointContent({ id }) {
  const data = await request('viewpointDetail', { id });
  const n = data.data || {};
  return {
    id: n.id, title: stripTags(n.title), time: normaliseTimeText(n.time), source: n.media || null,
    content: n.content || '', text: stripTags(n.content), imageCount: countImages(n.content),
    ingestedAt: n.createTime ? formatCst(n.createTime) : null,
  };
}

// Reports are PDF-only: the useful payload is the direct download link.
async function fetchReportContent({ id }) {
  const data = await request('reportDetail', { reportId: id });
  const n = data.data || {};
  return {
    id: n.reportId, title: stripTags(n.title), time: normaliseTimeText(n.publishTime),
    author: n.author || null, source: n.source || null, tag: n.tag || null,
    pdfUrl: n.pdfPath || null, riskLevel: n.riskLevel == null ? null : n.riskLevel,
  };
}

module.exports = {
  fetchInstrumentFlash, fetchWire, fetchViewpoint, fetchReport, fetchColumn, fetchColumnTypes,
  fetchColumnContent, fetchViewpointContent, fetchReportContent,
  parseCstWallClock, formatCst, stripTags, splitHeadline, effectLabel, normaliseTimeText,
};
