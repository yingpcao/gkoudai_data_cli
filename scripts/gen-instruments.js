'use strict';
// Generate the instrument dictionary docs — a full listing of every instrument the
// 口袋贵金属 quote catalog exposes (name / code / qid / board).
//   node --openssl-legacy-provider scripts/gen-instruments.js            -> docs/instruments.md (zh)
//   node --openssl-legacy-provider scripts/gen-instruments.js --lang en  -> docs/instruments.en.md
// Instrument names are the backend's native (Chinese) labels; only the document
// scaffolding and category titles are translated. Codes and qid are language-neutral.

const fs = require('fs');
const path = require('path');
const { request } = require('../src/http');

// Recursively collect leaf quotes, tagging the nearest board (group name).
function collectLeaves(list, board, out) {
  for (const it of list || []) {
    if (Array.isArray(it.list)) {
      collectLeaves(it.list, it.name || board, out);
    } else if (it.id != null && it.name != null && it.code != null) {
      out.push({ name: it.name, code: it.code, qid: String(it.id), board: board || '' });
    }
  }
}

const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|');

// Category title translations (keyed by the backend tid).
const CAT_EN = {
  10000: 'Precious Metals', 10002: 'China Futures', 10006: 'International Futures',
  3: 'International Spot', 6: 'Global Indices', 4: 'Global FX', 50: 'International Bonds',
  9: 'Crude Oil', 1: 'Bank Account Gold', 1128: 'Specialty Indices',
};
// English labels for the built-in instruments (keyed by qid).
const BUILTIN_EN = {
  95: 'LME Copper', 92: 'LME Tin', 13: 'Spot Silver', 12: 'Spot Gold',
  22: 'US Dollar Index', 35105: 'Shanghai Tin (main)',
};

const LABELS = {
  zh: {
    title: '# 口袋贵金属 · 标的字典',
    note: (t, gen) => [
      `> 共 **${t}** 个标的,由 \`scripts/gen-instruments.js\` 从后端行情目录自动导出。`,
      `> 生成时间:${gen} UTC · 数据源:official.gkoudai.com`,
      '>',
      '> 调用方式:`koudai kline <名称|代码|qid> [--period day] [--format json]`。',
      '> 表中 **qid** 可直接作为 `<symbol>` 传入(无需联网反查);名称/代码亦可,CLI 会自动解析。',
    ],
    toc: '## 目录',
    tocItem: (name, anchor, tid, n) => `- [${name}](#${anchor}) — ${tid} · ${n} 个`,
    tid: (id) => `分类 id (tid): \`${id}\``,
    count: (n) => `共 ${n} 个。`,
    cols: '| 板块 | 名称 | 代码 | qid |',
    fetchFail: (e) => `> 拉取失败:${e}`,
    file: 'instruments.md',
    xref: null,
  },
  en: {
    title: '# Koudai · Instrument Dictionary',
    note: (t, gen) => [
      `> **${t}** instruments, auto-exported from the backend catalog by \`scripts/gen-instruments.js\`.`,
      `> Generated:${gen} UTC · Source:official.gkoudai.com · 中文:[docs/instruments.md](./instruments.md)`,
      '>',
      '> Usage:`koudai kline <name|code|qid> [--period day] [--format json]`.',
      '> **`qid`** can be passed directly as `<symbol>` (no online lookup). Names/codes also work — the CLI resolves them.',
      '> The **Name** column keeps each instrument\'s native Chinese label (that is the exact string the backend uses and that `symbol resolve`/`search` match against); `Code` and `qid` are language-neutral.',
    ],
    toc: '## Contents',
    tocItem: (name, anchor, tid, n) => `- [${name}](#${anchor}) — ${tid} · ${n}`,
    tid: (id) => `Category id (tid): \`${id}\``,
    count: (n) => `${n} instruments.`,
    cols: '| Board | Name | Code | qid |',
    fetchFail: (e) => `> Fetch failed:${e}`,
    file: 'instruments.en.md',
    xref: null,
  },
};

async function main() {
  const langArg = process.argv.indexOf('--lang');
  const lang = langArg >= 0 && LABELS[process.argv[langArg + 1]] ? process.argv[langArg + 1] : 'zh';
  const L = LABELS[lang];

  const cats = (await request('quoteCategories')).data || [];
  const sections = [];
  let total = 0;

  for (const cat of cats) {
    let leaves = [];
    try {
      const d = await request('quotesByCategory', { tid: cat.tid });
      const root = d && d.data ? d.data : d;
      collectLeaves(root && root.list, '', leaves);
    } catch (e) {
      sections.push({ cat, leaves: [], error: e.message });
      continue;
    }
    const seen = new Set();
    leaves = leaves.filter(l => !seen.has(l.qid) && seen.add(l.qid));
    total += leaves.length;
    sections.push({ cat, leaves });
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const catTitle = (cat) => lang === 'en' ? (CAT_EN[cat.tid] || cat.tname) : cat.tname;
  const anchorOf = (title) => String(title).toLowerCase().replace(/\s+/g, '-');

  const lines = [];
  lines.push(L.title);
  lines.push('');
  L.note(total, now).forEach((x) => lines.push(x));
  lines.push('');
  lines.push(L.toc);
  for (const { cat, leaves } of sections) {
    const name = catTitle(cat);
    lines.push(L.tocItem(name, anchorOf(name), cat.tid, leaves.length));
  }
  lines.push('');

  for (const { cat, leaves, error } of sections) {
    lines.push(`## ${catTitle(cat)}`);
    lines.push('');
    lines.push(L.tid(cat.tid));
    if (error) { lines.push(''); lines.push(L.fetchFail(esc(error))); lines.push(''); continue; }
    lines.push('');
    lines.push(L.count(leaves.length));
    lines.push('');
    lines.push(L.cols);
    lines.push('|---|---|---|---|');
    for (const l of leaves) {
      const en = lang === 'en' && BUILTIN_EN[l.qid];
      const nameCell = en ? `${esc(l.name)} (${en})` : esc(l.name);
      lines.push(`| ${esc(l.board)} | ${nameCell} | ${esc(l.code)} | ${l.qid} |`);
    }
    lines.push('');
  }

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, L.file);
  fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
  console.log(`wrote ${outFile} (${total} instruments, ${sections.length} categories, lang=${lang})`);
}

main().catch(e => { console.error('gen failed:', e.message); process.exit(1); });
