# gkoudai_data_cli · 口袋贵金属行情数据工具集

免开「口袋贵金属」客户端,直接调用其后端(`official.gkoudai.com`)取 **K 线**与**实时报价**,
覆盖约 **388 个标的**(贵金属、国内/国际期货、国际现货、全球指数、外汇、原油 …)。
接口与加密信封均从 Electron 安装包逆向还原并实测验证,**零第三方依赖**。
内置一份供 agent 消费的机器可读契约(`koudai spec`)。

[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![deps](https://img.shields.io/badge/dependencies-0-green)]()
[![license](https://img.shields.io/badge/license-MIT-blue)]()

---

## 安装(在线)

> 命令名统一为 `koudai`。要求 Node ≥ 18。

**方式 A · 直接从 GitHub 全局安装(推荐,免克隆)**
```bash
npm install -g github:yingpcao/gkoudai_data_cli
koudai kline 现货黄金 --period day --count 100
```

**方式 B · 用 npx 临时运行(不安装)**
```bash
npx github:yingpcao/gkoudai_data_cli kline LME铜 --period 1h --count 50 -f json
```

**方式 C · 克隆本地安装(开发/定制)**
```bash
git clone https://github.com/yingpcao/gkoudai_data_cli.git
cd gkoudai_data_cli
npm install -g .      # 或本地直接用: node bin/koudai.js kline 美元指数
```

<details>
<summary>方式 D · 发布到 npm 后(若已 publish)</summary>

```bash
npm install -g koudai-data
```
</details>

**Windows 小提示**:全局安装后若 `koudai` 不在 PATH,重开终端,或用 `npx koudai` / 完整路径 `%AppData%\npm\koudai.cmd`。

---

## 快速开始

```bash
koudai kline 现货黄金 --period day --count 200 -f csv   # 内置标的,免联网解析
koudai kline 布伦特原油连续 -f json                     # 任意标的,自动联网反查 qid
koudai kline 35082 --period 5m --count 30              # 直接传数字 qid(沪银)
koudai kline 美元指数 --start 2026-01-01 --count 200    # 取历史区间附近的数据
koudai quote 现货黄金                                  # 实时报价快照
koudai symbol search 沪银                              # 搜索标的 => qid
koudai spec                                           # 机器可读调用契约(JSON)
koudai --help
```

## 命令

| 命令 | 说明 |
|---|---|
| `koudai kline <symbol> [--period day] [--count 100] [--format table\|json\|csv] [--start <date>] [--raw]` | 取 OHLC K 线 |
| `koudai quote <symbol> [--format table\|json] [--tail 10]` | 取实时报价(分时快照) |
| `koudai symbol resolve <name\|code\|qid>` | 解析标的 qid |
| `koudai symbol search <关键词>` | 在全部约 388 个标的里搜索 |
| `koudai symbol list` | 列出内置别名 |
| `koudai spec` | 打印 agent 调用契约(JSON) |
| `koudai version` | 版本 |

### `<symbol>` 解析规则
1. **内置别名**(离线,最快):`现货黄金/xau` `现货白银/xag` `美元指数/dxy` `LME铜/lmecopper` `LME锡/lmetin` `沪锡主连/shanghai-tin`
2. **纯数字** → 直接作为后端 `qid`
3. **中文名/代码** → 联网在行情目录精确匹配,退化为包含匹配(覆盖约 388 个标的)

### `--period`
`1m 3m 5m 10m 15m 20m 30m 60m|1h 2h 3h 4h day week month quarter year`,或数字 `type` 码(见 `koudai spec`)。

## 内置常用标的

| 名称 | 代码 | qid | | 名称 | 代码 | qid |
|---|---|---|---|---|---|---|
| LME铜 | LMECU | 95 | | 现货黄金 | XAU | 12 |
| LME锡 | LMESN | 92 | | 美元指数 | DINI | 22 |
| 现货白银 | XAG | 13 | | 沪锡主连 | sn6666 | 35105 |

其余标的用名称/代码/qid 均可访问;新常用标的可加进 `src/reference.js` 的 `BUILTIN_SYMBOLS`。

## Agent / 程序化集成

- **契约**:运行 `koudai spec` 得到 JSON(命令、参数、`periods`、内置 `symbols`、`statusCodes`、输出 schema、信封说明)。人类可读版见 [SPEC.md](./SPEC.md)。
- **取数**:优先 `--format json`,结构稳定:
  ```jsonc
  { "name":"现货黄金","qid":"12","period":{"code":6,"name":"day"},"count":200,
    "candles":[ {"time":"2026-10-15","timestamp":1791993600000,"open":4106.59,"high":4151.42,"low":4099.95,"close":4146.77,"volume":56942} ] }
  ```
- **嵌入调用**:
  ```js
  const { fetchKline, resolveSymbol } = require('koudai-data');
  const hit = await resolveSymbol('现货黄金');
  const { candles } = await fetchKline({ qid: hit.qid, period: 'day', count: 200 });
  ```
- **退出码**:`0` 成功 · `1` 用法/解析失败 · `2` 后端业务错误 · `3` 传输/解密错误。

## 工作原理(逆向记录)

- 基础:`https://official.gkoudai.com/officialNetworkApi/…`
- K线 `CandleStickV2`;实时 `getRealTimeQuote`;目录 `GetQuoteTypesV4 → typeQuotesByTidV4`(取 `id`=qid)。
- **加密信封**:8 位随机会话密钥 → `DES-CBC`(IV `sojexcom`)加密查询串得 `x`;`RSA-PKCS1#1.5`(内置 1024bit 公钥)加密会话密钥得 `y`;GET 传 `?x=&y=`;响应 `data` 用同一会话密钥 DES 解密。行情/K线接口**无需登录**。
- DES-CBC 在新版 Node 需 OpenSSL legacy provider;`koudai` 入口会自动带 `--openssl-legacy-provider` 重启自身,无需手动配置。
- 实现集中在 `src/protocol.js`,常量在 `src/reference.js`。

## 项目结构

```
bin/koudai.js     CLI 入口(legacy provider 重启 + 退出码)
index.js          编程接口
src/reference.js  端点/周期码/内置标的/状态码/字段含义(单一事实来源)
src/protocol.js   DES-CBC + RSA 信封
src/http.js       加密请求/解密/重试/业务异常
src/catalog.js    名称↔qid 解析与搜索
src/kline.js      K 线取数与规范化
src/quote.js      实时报价
src/format.js     table/csv/json
src/spec.js       agent 契约生成
src/cli.js        参数解析与分发
SPEC.md README.md LICENSE package.json
```

## 开发与发布

```bash
npm run smoke      # 全子命令实盘冒烟
npm run pack:dry   # 预览打包内容
# 发布到 npm(可选): npm login && npm publish   (包名 koudai-data)
```

## 免责声明

- 本项目仅对公开行情接口做技术封装与学习用途,**与口袋贵金属/gkoudai 官方无关**;数据版权归原始行情提供方。
- 逆向接口可能因后端变更(换密钥/加签/改路径)随时失效;届时先 `koudai spec` 核对信封,再重抓安装包内 `resources/app/*.asar.gz` 复核 `src/protocol.js`、`src/reference.js`。
- 请遵守数据源使用条款,**控制请求频率,勿用于高频抓取或二次分发**。

## 许可

[MIT](./LICENSE)
