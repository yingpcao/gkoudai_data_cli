'use strict';
// Instrument catalog: walks the live quote tree and resolves any name/code/qid
// to a canonical { qid, code, name }. Covers all ~396 instruments, far beyond the
// built-in aliases. Results are cached per process.

const { request } = require('./http');
const { BUILTIN_SYMBOLS } = require('./reference');

const categoriesCache = new Map(); // tid -> flattened leaf list
let allCache = null;

function flatten(list, out) {
  for (const it of list || []) {
    if (Array.isArray(it.list)) flatten(it.list, out);
    if (it.id != null && it.name != null && it.code != null) {
      out.push({ qid: String(it.id), code: it.code, name: it.name });
    }
  }
}

async function categoryLeaves(tid) {
  if (categoriesCache.has(tid)) return categoriesCache.get(tid);
  const data = await request('quotesByCategory', { tid });
  const leaves = [];
  const root = data && data.data ? data.data : data; // envelope { status, data:{list} }
  flatten(root && root.list, leaves);
  categoriesCache.set(tid, leaves);
  return leaves;
}

async function categories() {
  return (await request('quoteCategories')).data || [];
}

async function allInstruments() {
  if (allCache) return allCache;
  const cats = await categories();
  const map = new Map();
  for (const c of cats) for (const leaf of await categoryLeaves(c.tid)) map.set(leaf.qid, leaf);
  allCache = [...map.values()];
  return allCache;
}

// Resolve a query. Tries built-in aliases first (no network), then the live tree.
async function resolve(query) {
  const sym = builtinLookup(query);
  if (sym) return sym;
  if (/^\d+$/.test(query)) return { qid: query, code: query, name: query, source: 'raw-qid' };
  const matches = await search(query);
  const exact = matches.find(m => m.name === query || m.code.toLowerCase() === String(query).toLowerCase() || m.qid === query);
  return exact || matches[0] || null;
}

async function search(query) {
  const list = await allInstruments();
  const q = String(query).toLowerCase();
  return list.filter(a => a.name === query || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.qid === query);
}

function builtinLookup(query) {
  const byKey = BUILTIN_SYMBOLS[query] || BUILTIN_SYMBOLS[String(query).toLowerCase()];
  if (byKey) return { ...byKey, source: 'builtin' };
  const byName = Object.values(BUILTIN_SYMBOLS).find(s => s.name === query || s.code.toLowerCase() === String(query).toLowerCase());
  return byName ? { ...byName, source: 'builtin' } : null;
}

module.exports = { resolve, search, categories, allInstruments, builtinLookup };
