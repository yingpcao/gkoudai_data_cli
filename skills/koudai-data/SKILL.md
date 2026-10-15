---
name: koudai-data
description: Fetch K-line (OHLC candlestick) history, real-time quotes, and resolve instrument codes for 口袋贵金属 / official.gkoudai.com via the `koudai` CLI. Use when asked for precious-metals, futures, forex, global-index, crude-oil or bond candlesticks or live prices — e.g. 现货黄金/现货白银, LME铜/LME锡, 美元指数(DXY), 沪锡主连/沪银, 布伦特/WTI原油, 全球指数 — or to map a Chinese name/code to a numeric qid. Zero-dependency, no login.
when_to_use: When the user needs market data (K线/行情/报价/OHLC) for koudai/gkoudai-covered instruments, or must look up an instrument's qid before querying.
argument-hint: <command> <symbol> [--period day] [--count N]
---

# Koudai market data

Pull candlestick history, real-time quotes and instrument lookups from the
口袋贵金属 (official.gkoudai.com) endpoint through the `koudai` CLI. ~396
instruments across 贵金属/国内外期货/全球外汇/全球指数/原油/国际债券/特色指数.

## Prerequisite

Requires Node ≥ 18 and the `koudai` command on PATH. If `koudai` is missing:

```bash
npm install -g git+https://github.com/yingpcao/gkoudai_data_cli.git
```

Use the full `git+https://` URL — the `github:` shorthand resolves to SSH and
fails with `Permission denied (publickey)` on machines without a GitHub key.

## Discover the contract first

Do not hardcode command flags, period codes or status codes from memory. Query
the authoritative, machine-readable spec:

```bash
koudai spec
```

It returns JSON with `commands`, `periods.codes`/`periods.aliases`,
`builtInSymbols`, `statusCodes`, and the encryption `envelope`. Treat it as the
single source of truth; the CLI below may drift from this document.

## Commands

Always add `-f json` for programmatic use (default is human `table`).

```bash
# K-line: <symbol> required; --period (default day), --count (default 100)
koudai kline 现货黄金 --period day  --count 200 -f json
koudai kline LME铜   --period 60m  --count 50  -f json
koudai kline 布伦特原油连续 --start 2026-01-01 --count 30 -f json   # historical window

# Real-time quote snapshot (add --tail N for raw ticks)
koudai quote 美元指数 -f json

# Resolve / search instruments
koudai symbol resolve 现货黄金       # name | code | qid | source
koudai symbol search  沪银           # fuzzy search across all ~396 instruments
koudai symbol list                   # built-in aliases (no network)

koudai version
koudai --help
```

## Symbol resolution

`<symbol>` accepts, in priority order:
1. Built-in alias / English code (e.g. `xau`, `dxy`, `lmecopper`) — resolved offline.
2. A raw numeric qid (e.g. `35105`) — used as-is, no lookup.
3. Any Chinese name or code — auto-resolved against the live instrument tree.

When a name is ambiguous or unknown, run `koudai symbol search <关键词>` first
to get the exact `qid`, then pass the qid. `kline`/`quote` exit `1` with a hint
if a symbol cannot be resolved.

## Periods

`--period` takes an alias (`1m 3m 5m 10m 15m 20m 30m 60m|1h 2h 3h 4h day week
month quarter year`, or Chinese like `日线`) or a raw numeric type code. See
`koudai spec` → `periods` for the full mapping.

## Output shape (kline json)

`{ name, qid, period:{code,name}, count, candles:[{time,timestamp,open,high,low,
close,volume,amount,settlement,openInterest,latest}, ...] }`. Non-time-series
fields may come back as `"0.0"` strings for spot instruments — parse tolerantly.

## Exit codes

- `0` success · `1` usage error (missing/unknown symbol or period) · `2` upstream API error (see `statusCodes` in spec) · `3` runtime/network error.

On failure the reason is on stderr as `koudai: ...`.

## Notes

- No login or token is needed; requests are self-signed by the CLI.
- The DES-based endpoint needs Node's legacy OpenSSL provider; the CLI re-execs
  itself with that flag, so plain `koudai ...` works out of the box.
- Historical `--start` returns bars around that timestamp, newest first.
