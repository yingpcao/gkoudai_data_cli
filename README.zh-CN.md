# gkoudai_data_cli · 口袋贵金属行情数据工具集

> 语言:**中文** · [English (default)](./README.md)

免开「口袋贵金属」客户端,直接调用其后端(`official.gkoudai.com`)取 **K 线**、**实时报价**与
**资讯**(7x24 快讯流、品种快讯、机构观点、研报、资讯专栏),
覆盖 **396 个标的**(贵金属、国内/国际期货、国际现货、全球指数、外汇、原油 …,完整清单见
[标的字典 docs/instruments.md](./docs/instruments.md))。
接口与加密信封均从 Electron 安装包逆向还原并实测验证,**零第三方依赖、全部免登录**。
内置一份供 agent 消费的机器可读契约(`koudai spec`)。

[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![deps](https://img.shields.io/badge/dependencies-0-green)]()
[![license](https://img.shields.io/badge/license-MIT-blue)]()

---

## 安装(在线)

> 命令名统一为 `koudai`。要求 Node ≥ 18。

**方式 A · 直接从 GitHub 全局安装(推荐,免克隆)**
```bash
npm install -g git+https://github.com/yingpcao/gkoudai_data_cli.git
koudai kline 现货黄金 --period day --count 100
```

**方式 B · 用 npx 临时运行(不安装)**
```bash
npx --yes git+https://github.com/yingpcao/gkoudai_data_cli.git kline LME铜 --period 1h --count 50 -f json
```

> **为什么写完整的 `git+https://` 而不是 `github:yingpcao/gkoudai_data_cli`?**
> npm 对 `github:` 简写默认走 **SSH**(`ssh://git@github.com/...`),本机没有配置 GitHub 公钥时会报
> `git@github.com: Permission denied (publickey)`。写成 `git+https://` 则走 HTTPS,公开仓库免鉴权即可安装。

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
koudai news wire --important                           # 7x24 快讯流,只看重要条
koudai news flash 沪锡主连 --count 30 -f json          # 品种快讯
koudai news report 35105 -f json                       # 研报(含 PDF 直链)
koudai symbol search 沪银                              # 搜索标的 => qid
koudai spec                                           # 机器可读调用契约(JSON)
koudai --help
```

## 命令

| 命令 | 说明 |
|---|---|
| `koudai kline <symbol> [--period day] [--count 100] [--format table\|json\|csv] [--start <date>] [--raw]` | 取 OHLC K 线 |
| `koudai quote <symbol> [--format table\|json] [--tail 10]` | 取实时报价(分时快照) |
| `koudai news <mode> [symbol] [--count 20] [--format table\|json\|csv]` | 取资讯(见下表) |
| `koudai symbol resolve <name\|code\|qid>` | 解析标的 qid |
| `koudai symbol search <关键词>` | 在全部 396 个标的里搜索 |
| `koudai symbol list` | 列出内置别名 |
| `koudai spec` | 打印 agent 调用契约(JSON) |
| `koudai version` | 版本 |

### `<symbol>` 解析规则
1. **内置别名**(离线,最快):`现货黄金/xau` `现货白银/xag` `美元指数/dxy` `LME铜/lmecopper` `LME锡/lmetin` `沪锡主连/shanghai-tin`
2. **纯数字** → 直接作为后端 `qid`
3. **中文名/代码** → 联网在行情目录精确匹配,退化为包含匹配(覆盖 396 个标的)

### `--period`
`1m 3m 5m 10m 15m 20m 30m 60m|1h 2h 3h 4h day week month quarter year`,或数字 `type` 码(见 `koudai spec`)。

## 资讯(`news`)

客户端「资讯」面板背后是**五个互不相通的后端**,本命令逐个封装并统一成同一套条目字段。
省略 mode 时默认 `wire`;`koudai news <symbol>` 等价于 `news flash <symbol>`。

| mode | 对应 UI | 需要标的 | 选项 |
|---|---|---|---|
| `flash` | K线下方「相关快讯」 | ✅ | `--count` |
| `wire` | 左侧「资讯」栏 7x24 流 | — | `--count` `--important` |
| `column` | 资讯页分类专栏 | — | `--count` `--type 黄金分析` |
| `viewpoint` | 「机构观点」tab | ✅ | `--count` |
| `report` | 「研报」tab | ✅ | `--count` |
| `types` | 列出专栏分类 | — | — |
| `show <id> --kind column\|viewpoint\|report` | 点开正文 | — | `--type` `--format` |

```bash
koudai news wire --count 30 -f json                     # 全局快讯流
koudai news wire --important                            # 只看标红的重要条
koudai news flash 现货黄金 --count 30                   # 品种快讯(自动跨游标翻页)
koudai news column --type 地缘局势                      # 1黄金分析 2央行动态 3大宗商品 4股债市场 5地缘局势
koudai news show 73450 --kind column --type 黄金分析 -f json   # 专栏正文(HTML + 纯文本)
koudai news viewpoint 现货黄金 -f json                  # 期货公司观点
koudai news report 35105 -f json                        # 研报,返回 pdfUrl 直链
```

**两点必须知道的限制**

- `report` **只有期货品种有数据**:沪锡主连(35105)有;现货黄金(12)、现货白银(13)、LME铜(95)、LME锡(92)、美元指数(22) 恒返回空列表 —— 上游覆盖范围如此,不是 bug。研报正文只有 PDF,无 HTML。
- `wire` 条目里 `type="data"` 的是**经济日历发布**,JSON 里额外给 `economic:{result,forecast,previous,level,effect,effectText}`,`effect` 0=影响较小、正=利多金银、负=利空 —— 可直接用于盯盘信号。

## 内置常用标的

| 名称 | 代码 | qid | | 名称 | 代码 | qid |
|---|---|---|---|---|---|---|
| LME铜 | LMECU | 95 | | 现货黄金 | XAU | 12 |
| LME锡 | LMESN | 92 | | 美元指数 | DINI | 22 |
| 现货白银 | XAG | 13 | | 沪锡主连 | sn6666 | 35105 |

其余标的用名称/代码/qid 均可访问;新常用标的可加进 `src/reference.js` 的 `BUILTIN_SYMBOLS`。

## 标的字典(全量 396)

完整清单见 **[docs/instruments.md](./docs/instruments.md)** —— 按分类/板块列出每个标的的 `名称 / 代码 / qid`,
调用时可直接把 `qid` 当作 `<symbol>` 传入。字典由脚本从后端目录自动导出,可随行情变动重新生成:

```bash
npm run gen:instruments:all   # 重新抓取并更新 中文 docs/instruments.md + 英文 docs/instruments.en.md
```

> 需要英文版(表头/分类译为英文,标的名保留后端原生中文以便精确匹配)见 **[docs/instruments.en.md](./docs/instruments.en.md)**。

## Agent / 程序化集成

- **契约**:运行 `koudai spec` 得到 JSON(命令、参数、`periods`、内置 `symbols`、`statusCodes`、输出 schema、信封说明)。人类可读版见 [SPEC.md](./SPEC.md)。
- **取数**:优先 `--format json`,结构稳定:
  ```jsonc
  { "name":"现货黄金","qid":"12","period":{"code":6,"name":"day"},"count":200,
    "candles":[ {"time":"2026-10-15","timestamp":1791993600000,"open":4106.59,"high":4151.42,"low":4099.95,"close":4146.77,"volume":56942} ] }
  ```
- **嵌入调用**:
  ```js
  const { fetchKline, resolveSymbol, fetchNewsWire, fetchNewsFlash } = require('koudai-data');
  const hit = await resolveSymbol('现货黄金');
  const { candles } = await fetchKline({ qid: hit.qid, period: 'day', count: 200 });
  const wire = await fetchNewsWire({ count: 30, important: true });
  ```
- **退出码**:`0` 成功 · `1` 用法/解析失败 · `2` 后端业务错误 · `3` 传输/解密错误。

> ⚠️ 后端响应是**两层信封**:外层 `status` 只说明传输/解密成功,真正的业务状态在 DES 解密后的内层对象里(不存在的 id 会外层 `1000`、内层 `1008`)。`src/http.js` 已同时校验两层;自行调 `request()` 时别只看外层。

## 供 Agent 安装(Skill)

仓库自带一份 [Agent Skill `skills/koudai-data/SKILL.md`](./skills/koudai-data/SKILL.md) —— 让支持 skills 约定的 agent 自动发现并调用本工具(安装前置、命令、`symbol` 解析、周期、资讯 mode、退出码)。它不重复维护契约,而是指向 `koudai spec`。

**Claude Code / Claude**(消费 `SKILL.md`)—— 安装本 skill:

```bash
# 用户级(全局可用)
mkdir -p ~/.claude/skills && cp -r skills/koudai-data ~/.claude/skills/
# 或项目级:克隆后把 skills/koudai-data 放到仓库的 .claude/skills/ 下
```

装好后 agent 会在需要行情/K线/报价/资讯时自动触发,也可 `/koudai-data` 手动调用。

**Codex 等不吃 SKILL.md 的 agent** —— 把下面片段并入仓库/项目的 `AGENTS.md`:

```markdown
## koudai — 口袋贵金属行情 CLI
需要贵金属/期货/外汇/指数/原油的 K 线、实时报价或资讯时使用 `koudai` 命令(Node≥18)。
安装:npm install -g git+https://github.com/yingpcao/gkoudai_data_cli.git
先运行 `koudai spec` 获取权威命令/周期/状态码;取数加 `-f json`。
K线:koudai kline <名称|代码|qid> --period day --count 200 -f json
报价:koudai quote 美元指数 -f json   ·   查标的:koudai symbol search 沪银
资讯:koudai news wire --count 30 -f json   ·   koudai news flash 沪锡主连   ·   koudai news report 35105
```

## 工作原理(逆向记录)

- 基础:`https://official.gkoudai.com/officialNetworkApi/…`
- K线 `CandleStickV2`;实时 `getRealTimeQuote`;目录 `GetQuoteTypesV4 → typeQuotesByTidV4`(取 `id`=qid)。
- 资讯:`attachNews/getNewsFlash`(品种)、`RealTimeList`/`RealTimeListByid`(全局流)、`newsServer/*`(专栏/研报)、`futures/getPointNews*`(机构观点,**换前缀**,不在 officialNetworkApi 下)。
- **加密信封**:8 位随机会话密钥 → `DES-CBC`(IV `sojexcom`)加密查询串得 `x`;`RSA-PKCS1#1.5`(内置 1024bit 公钥)加密会话密钥得 `y`;GET 传 `?x=&y=`;响应 `data` 用同一会话密钥 DES 解密。行情/K线/资讯接口**全部无需登录**。
- DES-CBC 在新版 Node 需 OpenSSL legacy provider;`koudai` 入口会自动带 `--openssl-legacy-provider` 重启自身,无需手动配置。
- 实现集中在 `src/protocol.js`,常量在 `src/reference.js`。

## 项目结构

```
bin/koudai.js     CLI 入口(legacy provider 重启 + 退出码)
index.js          编程接口
src/reference.js  端点/周期码/内置标的/资讯分类/状态码/字段含义(单一事实来源)
src/protocol.js   DES-CBC + RSA 信封
src/http.js       加密请求/解密/重试/业务异常(校验内外两层 status)
src/catalog.js    名称↔qid 解析与搜索
src/kline.js      K 线取数与规范化
src/news.js       资讯五套后端的取数、翻页游标与字段归一
src/quote.js      实时报价
src/format.js     table/csv/json
src/spec.js       agent 契约生成
src/cli.js        参数解析与分发
scripts/gen-instruments.js  导出 docs/instruments.md(.en.md) 全量标的字典
docs/instruments.md / docs/instruments.en.md  396 个标的字典(中/英;名称/代码/qid/板块)
skills/koudai-data/SKILL.md  供 Claude/Claude Code 消费的 Agent Skill
SPEC.md README.md README.zh-CN.md LICENSE package.json
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
