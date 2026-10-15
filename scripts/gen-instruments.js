'use strict';
// Generate docs/instruments.md — a full dictionary of every instrument the
// 口袋贵金属 quote catalog exposes (name / code / qid / category / board).
// Run: node --openssl-legacy-provider scripts/gen-instruments.js   (or: npm run gen:instruments)

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

async function main() {
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
    // de-dup by qid within category, keep order
    const seen = new Set();
    leaves = leaves.filter(l => !seen.has(l.qid) && seen.add(l.qid));
    total += leaves.length;
    sections.push({ cat, leaves });
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const lines = [];
  lines.push('# 口袋贵金属 · 标的字典');
  lines.push('');
  lines.push(`> 共 **${total}** 个标的,由 \`scripts/gen-instruments.js\` 从后端行情目录自动导出。`);
  lines.push(`> 生成时间:${now} UTC · 数据源:official.gkoudai.com`);
  lines.push('>');
  lines.push('> 调用方式:`koudai kline <名称|代码|qid> [--period day] [--format json]`。');
  lines.push('> 表中 **qid** 可直接作为 `<symbol>` 传入(无需联网反查);名称/代码亦可,CLI 会自动解析。');
  lines.push('');
  lines.push('## 目录');
  for (const { cat, leaves } of sections) {
    const anchor = String(cat.tname).toLowerCase().replace(/\s+/g, '-');
    lines.push(`- [${cat.tname}](#${anchor}) — ${cat.tid} · ${leaves.length} 个`);
  }
  lines.push('');

  for (const { cat, leaves, error } of sections) {
    lines.push(`## ${cat.tname}`);
    lines.push('');
    lines.push(`分类 id (tid): \`${cat.tid}\``);
    if (error) { lines.push(''); lines.push(`> 拉取失败:${esc(error)}`); lines.push(''); continue; }
    lines.push('');
    lines.push(`共 ${leaves.length} 个。`);
    lines.push('');
    lines.push('| 板块 | 名称 | 代码 | qid |');
    lines.push('|---|---|---|---|');
    for (const l of leaves) lines.push(`| ${esc(l.board)} | ${esc(l.name)} | ${esc(l.code)} | ${l.qid} |`);
    lines.push('');
  }

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'instruments.md');
  fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
  console.log(`wrote ${outFile} (${total} instruments, ${sections.length} categories)`);
}

main().catch(e => { console.error('gen failed:', e.message); process.exit(1); });
