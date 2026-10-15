# gkoudai_data_cli · Koudai Precious-Metals Market Data Toolkit

> Language: **English (default)** · [中文说明](./README.zh-CN.md)

Call the 口袋贵金属 (Koudai) desktop app's backend (`official.gkoudai.com`) directly — no client needed —
to fetch **K-line (OHLC candlesticks)** and **real-time quotes** across **396 instruments**
(precious metals, China & international futures, international spot, global indices, forex, crude oil …;
full list in [docs/instruments.md](./docs/instruments.md)).
The endpoints and the encryption envelope were reverse-engineered from the Electron installer and verified live.
**Zero third-party dependencies.** Ships with a machine-readable contract for agents (`koudai spec`).

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
  const { fetchKline, resolveSymbol } = require('koudai-data');
  const hit = await resolveSymbol('xau');
  const { candles } = await fetchKline({ qid: hit.qid, period: 'day', count: 200 });
  ```
- **Exit codes**: `0` success · `1` usage / resolution error · `2` upstream API error · `3` transport / decryption error.

## Install as an Agent Skill

The repo ships an [Agent Skill `skills/koudai-data/SKILL.md`](./skills/koudai-data/SKILL.md) so skill-aware agents can discover and call this tool automatically (install prerequisite, commands, `symbol` resolution, periods, exit codes). It does not duplicate the contract — it defers to `koudai spec`.

**Claude Code / Claude** (consumes `SKILL.md`) — install the skill:

```bash
# user-level (available everywhere)
mkdir -p ~/.claude/skills && cp -r skills/koudai-data ~/.claude/skills/
# or project-level: after cloning, drop skills/koudai-data into the repo's .claude/skills/
```

Once installed, agents trigger it automatically when they need quotes/K-lines; it can also be invoked explicitly with `/koudai-data`.

**Agents that don't read SKILL.md (e.g. Codex)** — fold the snippet below into your repo/project `AGENTS.md`:

```markdown
## koudai — Koudai market-data CLI
Use the `koudai` command (Node ≥ 18) when you need K-lines or real-time quotes for precious metals / futures / forex / indices / crude oil.
Install: npm install -g git+https://github.com/yingpcao/gkoudai_data_cli.git
Run `koudai spec` first for the authoritative commands/periods/status codes; add `-f json` when fetching.
K-line: koudai kline xau --period day --count 200 -f json
Quote:  koudai quote dxy -f json   ·   lookup: koudai symbol resolve lmecopper
```

## How it works (reverse-engineering notes)

- Base: `https://official.gkoudai.com/officialNetworkApi/…`
- K-line `CandleStickV2`; real-time `getRealTimeQuote`; catalog `GetQuoteTypesV4 → typeQuotesByTidV4` (read `id` = qid).
- **Encryption envelope**: a random 8-char session key → `DES-CBC` (IV `sojexcom`) encrypts the query string into `x`; `RSA-PKCS1#1.5` (built-in 1024-bit public key) encrypts the session key into `y`; the GET request sends `?x=&y=`; the response `data` is DES-decrypted with the same session key. Market/K-line endpoints require **no login**.
- DES-CBC needs Node's OpenSSL legacy provider on newer Node; the `koudai` entry re-execs itself with `--openssl-legacy-provider` automatically, so no manual setup is needed.
- Implementation lives in [src/protocol.js](./src/protocol.js), constants in [src/reference.js](./src/reference.js).

## Project layout

```
bin/koudai.js               CLI entry (legacy-provider re-exec + exit codes)
index.js                    Programmatic API
src/reference.js            Endpoints / period codes / built-ins / status codes / field glossary (single source of truth)
src/protocol.js             DES-CBC + RSA envelope
src/http.js                 Encrypted request / decrypt / retry / business errors
src/catalog.js              Name↔qid resolution and search
src/kline.js                K-line fetch and normalization
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
