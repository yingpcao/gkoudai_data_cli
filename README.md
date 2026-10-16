# gkoudai_data_cli · Koudai Precious-Metals Market Data Toolkit

> Language: **English (default)** · [中文说明](./README.zh-CN.md)

Call the 口袋贵金属 (Koudai) desktop app's backend (`official.gkoudai.com`) directly — no client needed —
to fetch **K-line (OHLC candlesticks)**, **real-time quotes** and **news** (a 7x24 newswire, per-instrument
flashes, broker viewpoints, research reports and editorial columns) across **396 instruments**
(precious metals, China & international futures, international spot, global indices, forex, crude oil …;
full list in [docs/instruments.md](./docs/instruments.md)).
The endpoints and the encryption envelope were reverse-engineered from the Electron installer and verified live.
**Zero third-party dependencies, no login for any of it.** Ships with a machine-readable contract for agents (`koudai spec`).

[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![deps](https://img.shields.io/badge/dependencies-0-green)]()
[![license](https://img.shields.io/badge/license-MIT-blue)]()

---

## Install (online)

> The command is `koudai`. Requires Node ≥ 18.

**Option A · Install globally straight from GitHub (recommended, no clone)**
```bash
npm install -g git+https://github.com/yingpcao/gkoudai_data_cli.git
koudai kline xau --period day --count 100
```

**Option B · Run on the fly with npx (no install)**
```bash
npx --yes git+https://github.com/yingpcao/gkoudai_data_cli.git kline lmecopper --period 1h --count 50 -f json
```

> **Why the full `git+https://` URL instead of `github:yingpcao/gkoudai_data_cli`?**
> npm resolves the `github:` shorthand over **SSH** (`ssh://git@github.com/...`), which fails with
> `git@github.com: Permission denied (publickey)` on machines without a GitHub key. `git+https://` uses HTTPS,
> so this public repo installs without any authentication.

**Option C · Clone and install locally (development / customization)**
```bash
git clone https://github.com/yingpcao/gkoudai_data_cli.git
cd gkoudai_data_cli
npm install -g .      # or run directly: node bin/koudai.js kline dxy
```

<details>
<summary>Option D · From the npm registry (once published)</summary>

```bash
npm install -g koudai-data
```
</details>

**Windows tip**: if `koudai` isn't on PATH after a global install, reopen the terminal, or use `npx koudai` / the full path `%AppData%\npm\koudai.cmd`.

---

## Quick start

```bash
koudai kline xau --period day --count 200 -f csv     # built-in symbol, resolved offline
koudai kline dxy --period 1h --count 50 -f json      # US Dollar Index, hourly
koudai kline 35082 --period 5m --count 30            # pass a raw numeric qid directly
koudai kline lmetin --start 2026-01-01 --count 200   # bars near a historical start time
koudai quote xau                                     # real-time quote snapshot
koudai news wire --important                         # 7x24 newswire, important items only
koudai news flash shanghai-tin --count 30 -f json    # per-instrument flashes
koudai news report 35105 -f json                     # research reports (with PDF links)
koudai symbol resolve lmecopper                      # name/code/qid => qid
koudai symbol search LME                             # fuzzy search across all 396 instruments
koudai spec                                          # machine-readable contract (JSON)
koudai --help
```

## Commands

| Command | Description |
|---|---|
| `koudai kline <symbol> [--period day] [--count 100] [--format table\|json\|csv] [--start <date>] [--raw]` | Fetch OHLC candlestick bars |
| `koudai quote <symbol> [--format table\|json] [--tail 10]` | Fetch a real-time quote (tick snapshot) |
| `koudai news <mode> [symbol] [--count 20] [--format table\|json\|csv]` | Fetch news (see below) |
| `koudai symbol resolve <name\|code\|qid>` | Resolve an instrument's qid |
| `koudai symbol search <keyword>` | Fuzzy search across all 396 instruments |
| `koudai symbol list` | List built-in aliases |
| `koudai spec` | Print the agent contract (JSON) |
| `koudai version` | Print version |

### `<symbol>` resolution rules
1. **Built-in alias** (offline, fastest): `xau` `xag` `dxy` `lmecopper` `lmetin` `shanghai-tin` (also the Chinese names `现货黄金` `美元指数` …)
2. **Pure number** → used directly as the backend `qid`
3. **Chinese name / code** → matched exactly against the live instrument tree, falling back to substring matching (covers all 396 instruments)

### `--period`
`1m 3m 5m 10m 15m 20m 30m 60m|1h 2h 3h 4h day week month quarter year`, or a numeric `type` code (see `koudai spec`).

## News (`news`)

The app's "资讯" panel is backed by **five unrelated endpoints**, not one API. This command wraps each of
them and normalises every item into one shape. Omitting `mode` defaults to `wire`;
`koudai news <symbol>` is shorthand for `news flash <symbol>`.

| mode | UI it maps to | needs symbol | options |
|---|---|---|---|
| `flash` | "相关快讯" tab under the chart | ✅ | `--count` |
| `wire` | the 7x24 stream in the left panel | — | `--count` `--important` |
| `column` | editorial columns | — | `--count` `--type 黄金分析` |
| `viewpoint` | "机构观点" tab | ✅ | `--count` |
| `report` | "研报" tab | ✅ | `--count` |
| `types` | list column categories | — | — |
| `show <id> --kind column\|viewpoint\|report` | open one article | — | `--type` `--format` |

```bash
koudai news wire --count 30 -f json                     # global 7x24 stream
koudai news wire --important                            # red-flagged important items only
koudai news flash xau --count 30                        # instrument flashes (auto-paginated)
koudai news column --type 地缘局势                      # 1 Gold 2 Central banks 3 Commodities 4 Equities/Bonds 5 Geopolitics
koudai news show 73450 --kind column --type 黄金分析 -f json   # article body (HTML + plain text)
koudai news viewpoint xau -f json                       # broker commentary
koudai news report 35105 -f json                        # research reports, with direct PDF links
```

**Two limits worth knowing**

- `report` **only has data for exchange-traded futures qids**: 沪锡主连 (35105) returns reports, while
  Spot Gold (12), Spot Silver (13), LME Copper (95), LME Tin (92) and US Dollar Index (22) always return an
  empty list — that is upstream coverage, not a bug. Reports are PDF-only; there is no HTML body, just `pdfUrl`.
- In `wire`, items with `type="data"` are **economic-calendar releases** and carry an extra
  `economic:{result,forecast,previous,level,effect,effectText}` object. `effect` is 0 = minor,
  positive = bullish for gold/silver, negative = bearish — directly usable for trading signals.

## Built-in instruments

| Name | Code | qid | | Name | Code | qid |
|---|---|---|---|---|---|---|
| LME Copper | LMECU | 95 | | Spot Gold | XAU | 12 |
| LME Tin | LMESN | 92 | | US Dollar Index | DINI | 22 |
| Spot Silver | XAG | 13 | | Shanghai Tin (main) | sn6666 | 35105 |

Every other instrument is reachable by its name / code / qid; to add a frequently used one, extend `BUILTIN_SYMBOLS` in [src/reference.js](./src/reference.js).

## Instrument dictionary (all 396)

The full list lives in **[docs/instruments.en.md](./docs/instruments.en.md)** — each instrument's `name / code / qid` grouped by category/board, so you can pass a `qid` straight as `<symbol>`. Names are shown in the backend's native Chinese (the string `symbol resolve`/`search` matches); `code` and `qid` are language-neutral. The dictionary is auto-exported from the backend catalog and can be regenerated:

```bash
npm run gen:instruments:all   # regenerate zh (docs/instruments.md) + en (docs/instruments.en.md)
```

> 中文版字典见 [docs/instruments.md](./docs/instruments.md)。

## Agent / programmatic integration

- **Contract**: run `koudai spec` to get JSON (commands, args, `periods`, built-in `symbols`, `statusCodes`, output schema, envelope notes). Human-readable version: [SPEC.md](./SPEC.md).
- **Fetching data**: prefer `--format json`; the shape is stable:
  ```jsonc
  { "name":"现货黄金","qid":"12","period":{"code":6,"name":"day"},"count":200,
    "candles":[ {"time":"2026-10-15","timestamp":1791993600000,"open":4106.59,"high":4151.42,"low":4099.95,"close":4146.77,"volume":56942} ] }
  ```
  (the `name` field carries the backend's native Chinese label — `XAU`/`dxy` etc. are inputs, not returned names)
- **Embedding**:
  ```js
  const { fetchKline, resolveSymbol, fetchNewsWire, fetchNewsFlash } = require('koudai-data');
  const hit = await resolveSymbol('xau');
  const { candles } = await fetchKline({ qid: hit.qid, period: 'day', count: 200 });
  const wire = await fetchNewsWire({ count: 30, important: true });
  ```
- **Exit codes**: `0` success · `1` usage / resolution error · `2` upstream API error · `3` transport / decryption error.

> ⚠️ Responses are a **two-layer envelope**. The outer `status` only means the transport and decryption
> succeeded; the real business status is inside the DES-decrypted object. A non-existent id passes the outer
> check with `1000` and only fails on the inner layer with `1008` and `data: null`. `src/http.js` validates
> both layers; if you call `request()` directly, don't trust the outer status alone.

## Install as an Agent Skill

The repo ships an [Agent Skill `skills/koudai-data/SKILL.md`](./skills/koudai-data/SKILL.md) so skill-aware agents can discover and call this tool automatically (install prerequisite, commands, `symbol` resolution, periods, news modes, exit codes). It does not duplicate the contract — it defers to `koudai spec`.

**Claude Code / Claude** (consumes `SKILL.md`) — install the skill:

```bash
# user-level (available everywhere)
mkdir -p ~/.claude/skills && cp -r skills/koudai-data ~/.claude/skills/
# or project-level: after cloning, drop skills/koudai-data into the repo's .claude/skills/
```

Once installed, agents trigger it automatically when they need quotes, K-lines or news; it can also be invoked explicitly with `/koudai-data`.

**Agents that don't read SKILL.md (e.g. Codex)** — fold the snippet below into your repo/project `AGENTS.md`:

```markdown
## koudai — Koudai market-data CLI
Use the `koudai` command (Node ≥ 18) when you need K-lines, real-time quotes or news for precious metals / futures / forex / indices / crude oil.
Install: npm install -g git+https://github.com/yingpcao/gkoudai_data_cli.git
Run `koudai spec` first for the authoritative commands/periods/status codes; add `-f json` when fetching.
K-line: koudai kline xau --period day --count 200 -f json
Quote:  koudai quote dxy -f json   ·   lookup: koudai symbol resolve lmecopper
News:   koudai news wire --count 30 -f json   ·   koudai news flash xau   ·   koudai news report 35105
```

## How it works (reverse-engineering notes)

- Base: `https://official.gkoudai.com/officialNetworkApi/…`
- K-line `CandleStickV2`; real-time `getRealTimeQuote`; catalog `GetQuoteTypesV4 → typeQuotesByTidV4` (read `id` = qid).
- News: `attachNews/getNewsFlash` (per instrument), `RealTimeList`/`RealTimeListByid` (global stream), `newsServer/*` (columns and reports), `futures/getPointNews*` (broker viewpoints — **a different prefix**, not under officialNetworkApi).
- **Encryption envelope**: a random 8-char session key → `DES-CBC` (IV `sojexcom`) encrypts the query string into `x`; `RSA-PKCS1#1.5` (built-in 1024-bit public key) encrypts the session key into `y`; the GET request sends `?x=&y=`; the response `data` is DES-decrypted with the same session key. Market, K-line and news endpoints all require **no login**.
- DES-CBC needs Node's OpenSSL legacy provider on newer Node; the `koudai` entry re-execs itself with `--openssl-legacy-provider` automatically, so no manual setup is needed.
- Implementation lives in [src/protocol.js](./src/protocol.js), constants in [src/reference.js](./src/reference.js).

## Project layout

```
bin/koudai.js               CLI entry (legacy-provider re-exec + exit codes)
index.js                    Programmatic API
src/reference.js            Endpoints / period codes / built-ins / news kinds & columns / status codes / field glossary (single source of truth)
src/protocol.js             DES-CBC + RSA envelope
src/http.js                 Encrypted request / decrypt / retry / business errors (checks both envelope layers)
src/catalog.js              Name↔qid resolution and search
src/kline.js                K-line fetch and normalization
src/news.js                 The five news backends: cursors and field normalization
src/quote.js                Real-time quotes
src/format.js               table/csv/json
src/spec.js                 Agent contract generation
src/cli.js                  Argument parsing and dispatch
scripts/gen-instruments.js  Export docs/instruments.md (.en.md) — full dictionary
docs/instruments.md / docs/instruments.en.md  396-instrument dictionary (zh/en; name/code/qid/board)
skills/koudai-data/SKILL.md Agent Skill for Claude / Claude Code
SPEC.md README.md README.zh-CN.md LICENSE package.json
```

## Development & publishing

```bash
npm run smoke      # live smoke test across all subcommands
npm run pack:dry   # preview the packaged contents
# publish to npm (optional): npm login && npm publish   (package name: koudai-data)
```

## Disclaimer

- This project is a technical wrapper over a public market-data endpoint for learning purposes only, and is **unaffiliated with 口袋贵金属 / gkoudai**; data copyright belongs to the original providers.
- The reverse-engineered interface may break at any time if the backend changes (new key, signing, path changes). If it does, first check the envelope via `koudai spec`, then re-inspect `resources/app/*.asar.gz` in the installer to update `src/protocol.js` and `src/reference.js`.
- Respect the data source's terms of use — **throttle requests; do not use for high-frequency scraping or redistribution**.

## License

[MIT](./LICENSE)
