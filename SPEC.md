# koudai-data — Agent 调用规范 (SPEC)

> 本文件是给 **agent / 程序化调用方** 的接口契约。运行时可用 `koudai spec` 打印同一份契约的 JSON 版本(单一事实来源:`src/reference.js` + `src/spec.js`)。

## 0. 元信息

| 项 | 值 |
|---|---|
| 命令 | `koudai`(等价 `node bin/koudai.js`) |
| 数据源 | `https://official.gkoudai.com/`(口袋贵金属后端) |
| 覆盖标的 | 396 个(贵金属 / 国内期货 / 国际期货 / 国际现货 / 全球指数 / 外汇 / 原油 …;完整清单见 [docs/instruments.md](./docs/instruments.md)) |
| 依赖 | 无第三方依赖,仅 Node 内置 `crypto`/`https` |
| 运行要求 | Node ≥18;CLI 会自带 `--openssl-legacy-provider` 重启自身,直接调用即可 |
| 鉴权 | 行情/K线接口**无需登录** |

## 1. 调用约定

- **解析结果走 stdout,错误走 stderr**,退出码见第 5 节。
- **给 agent 取数请优先用 `--format json`**,结构稳定(第 4 节)。
- 任何命令加 `--help` 或无参数运行可看用法。

## 2. 命令一览

| 命令 | 作用 |
|---|---|
| `koudai kline <symbol> [--period day] [--count 100] [--format table\|json\|csv] [--start <date>] [--raw]` | 取 OHLC K 线 |
| `koudai quote <symbol> [--format table\|json]` | 取实时报价快照 |
| `koudai news <mode> [symbol] [--count 20] [--format table\|json\|csv]` | 取资讯(快讯/专栏/机构观点/研报) |
| `koudai symbol resolve <name\|code\|qid>` | 解析出标的 qid |
| `koudai symbol search <关键词>` | 在全部标的里搜索 |
| `koudai symbol list` | 列出内置别名 |
| `koudai spec` | 打印本契约的 JSON |
| `koudai version` | 打印版本 |

### 2.1 `news <mode>` — 资讯不是一套接口，是五套

客户端"资讯"面板背后是五个互不相通的后端，本命令逐个封装并统一成同一套条目字段。**省略 mode 时默认 `wire`；`koudai news <symbol>` 等价于 `news flash <symbol>`。**

| mode | 对应 UI | 需要 symbol | 上游端点 |
|---|---|---|---|
| `flash` | K线下方"相关快讯" | ✅ | `officialNetworkApi/attachNews/getNewsFlash` |
| `wire` | 左侧"资讯"栏 7x24 流 | ❌ | `RealTimeList` + `RealTimeListByid` |
| `column` | 资讯页分类专栏 | ❌ | `newsServer/pageSpecialColumnNewsByType` |
| `viewpoint` | "机构观点" tab | ✅ | `futures/getPointNews`（**前缀不同**） |
| `report` | "研报" tab | ✅ | `newsServer/reportListV2` |
| `types` | — 列出专栏分类 | ❌ | `newsServer/getNewsType` |
| `show <id> --kind …` | 点开正文 | ❌ | `getNewsContent` / `getPointNewsById` / `reportDetail` |

选项：`--count N`(默认 20，内部自动翻页)、`--important`(仅 `wire`，只看红色重要条)、`--type <专栏名\|id>`(仅 `column`/`show`，默认 `黄金分析`)、`--kind column|viewpoint|report`(仅 `show`)。

> **`report` 只有期货品种有数据**：沪锡主连(35105)有，现货黄金(12)/现货白银(13)/LME铜(95)/LME锡(92)/美元指数(22) 恒返回空列表 —— 这是上游覆盖范围，不是 bug。研报正文只有 PDF，`pdfUrl` 是券商官网直链。

### 2.2 `<symbol>` 解析规则(按优先级)

1. 内置别名(免联网):`现货黄金 xau`、`现货白银 xag`、`美元指数 dxy`、`LME铜 lmecopper`、`LME锡 lmetin`、`沪锡主连 shanghai-tin`
2. 纯数字 → 直接当作 `qid`
3. 中文名/代码 → 联网在行情目录里精确匹配,再退化为包含匹配

> 联网解析会拉取 `GetQuoteTypesV4 → typeQuotesByTidV4` 全量目录(单进程内缓存)。若只需离线,可先 `symbol resolve` 拿到 qid,后续直接传数字 qid。

### 2.3 `--period` 取值(数字为后端 `type` 码)

| 别名 | 码 | 别名 | 码 |
|---|---|---|---|
| `1m` 1分 | 1 | `1h`/`60m` 1小时 | 5 |
| `3m` 3分 | 10 | `2h` 2小时 | 12 |
| `5m` 5分 | 2 | `3h` 3小时 | 14 |
| `10m` 10分 | 13 | `4h` 4小时 | 9 |
| `15m` 15分 | 3 | `day`/`日线` | 6 |
| `20m` 20分 | 16 | `week`/`周线` | 7 |
| `30m` 30分 | 4 | `month`/`月线` | 8 |
| — | — | `quarter`/`季线` | 17 |
| — | — | `year`/`年线` | 15 |

## 3. 示例

```bash
koudai kline 现货黄金 --period day --count 200 --format csv
koudai kline LME铜 --period 1h --count 50 --format json
koudai kline 布伦特原油连续 -f json          # 任意标的,联网自动反查 qid
koudai kline 35082 --period 5m --count 30     # 直接传 qid(沪银)
koudai quote 美元指数 -f json
koudai news wire --count 30 -f json           # 7x24 全局快讯流
koudai news wire --important                  # 只看红色"重要"条
koudai news flash 沪锡主连 --count 30 -f json # 品种快讯(自动跨游标)
koudai news column --type 地缘局势            # 专栏列表
koudai news show 73450 --kind column --type 黄金分析 -f json   # 专栏正文
koudai news viewpoint 现货黄金 -f json        # 机构观点
koudai news report 35105 -f json              # 研报(带 pdfUrl 直链)
koudai symbol search 沪银
koudai spec
```

## 4. 输出结构

### 4.1 `kline --format json`(规范化,推荐 agent 消费)

```jsonc
{
  "name": "现货黄金",
  "qid": "12",
  "period": { "code": 6, "name": "day" },
  "count": 200,
  "candles": [
    {
      "time": "2026-10-15",       // 时间标签
      "timestamp": 1791993600000,  // epoch 毫秒
      "open": 4106.59, "high": 4151.42, "low": 4099.95, "close": 4146.77,
      "volume": 56942, "amount": 0,
      "settlement": "4104.40", "openInterest": null, "latest": "4146.77"
    }
  ]
}
```

`--raw` 时 `candles[]` 改为后端原始字段(`o/h/l/c/v/a/t/ts/sp/p/nsp`),字段含义见 `koudai spec` 的 `data.candleRawFields`。

### 4.2 `quote --format json`
```jsonc
{
  "name": "美元指数", "qid": "22", "tickCount": 201,
  "latest": { "price": 102.03, "volume": 1, "totalVolume": 1552, "openInterest": 0, "timestamp": 1792031934000, "change": -0.08 },
  "ticks": [ /* 最近 tail 笔,--tail 控制(默认10) */ ]
}
```
后端 `getRealTimeQuote` 返回的是当前交易日的分时逐笔序列;`latest` 为最新一笔快照(`change` = 末笔较当日首笔的价差),`ticks` 为最近若干笔原始 tick。

### 4.3 `news --format json`(五种 mode 共用一套条目形状)

```jsonc
{
  "kind": "wire",                 // flash | wire | column | viewpoint | report
  "label": "7x24 快讯流",
  "symbol": null,                 // flash/viewpoint/report 时为 { "name": "沪锡主连", "qid": "35105" }
  "count": 2,
  "items": [
    {
      "id": "4545457",
      "timestamp": 1792074601545,          // epoch 毫秒,统一可比、可排序
      "time": "2026-10-15 22:30:01",       // 北京时间字符串(上游即按 UTC+8 呈现)
      "title": "美国至10月9日当周EIA天然气库存 前值:850 预期:760 公布:670",
      "body": null,                        // flash/wire 才有:【标题】之后的剩余全文
      "important": 0,                      // 1 = 上游标红的重要条
      "economic": {                        // 仅 wire 且上游 type="data":经济日历发布
        "event": "美国至10月9日当周EIA天然气库存", "showTime": "22:30",
        "result": "670", "forecast": "760", "previous": "850",
        "level": 3, "effect": 2, "effectText": "利多金银"   // effect: 0影响较小 / >0利多 / <0利空
      }
    }
  ]
}
```

按 mode 追加的字段：`viewpoint` → `source`、`digest`(是否"多家期货公司晨报汇总")；`report` → `author`、`tag`、`pdfUrl`、`needRisk`、`directPdf`；`column` → `media`、`original`、`top`。

`news show -f json` 返回单对象：`{id,title,time,source|author,content(HTML),text(去标签纯文本),imageCount}`；`report` 无 HTML 正文，改返回 `{…,pdfUrl}`。**`text` 为空但 `imageCount>0` 说明是纯配图文章，不是抓取失败。**

### 4.4 翻页语义(实现已屏蔽，排障时参考)

| mode | 游标 | 页大小 |
|---|---|---|
| `flash` | `time`=上一页末条的 epoch 毫秒 | ~10 |
| `wire` | `id`=上一页末条 id(严格向旧) | 20 |
| `column` | `pageNum` 递增，跟 `hasNext` | 服务端定 |
| `viewpoint` / `report` | `page` 递增(`report` 跟 `hasNext`) | 10 |

## 5. 退出码

| 码 | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 用法错误 / 未知命令 / 标的、周期或专栏无法解析 / 未知 id |
| 2 | 后端业务错误(如 `1003` 参数错误、`1008` id 不存在、`1502` 需登录) |
| 3 | 传输 / 解密 / 网络错误 |

后端响应业务状态码:`1000` 成功、`1002` 响应错误、`1003` 参数错误、`1008` 服务端拒绝(常见于 id 不存在)、`1502` 登录过期、`404` 路由不存在。

> ⚠️ **响应是两层信封**:HTTP 体外层 `{status,data}` 的 `status` 只表示传输/加解密成功;真正的业务状态在 **DES 解密后的内层对象**里。一个不存在的 id 会外层 `1000`、内层 `1008` 且 `data:null`。`src/http.js` 已同时校验两层并抛出 `ApiError`,自行调用 `request()` 时不要只看外层。

## 6. 编程接口(嵌入用)

```js
const { fetchKline, fetchQuote, resolveSymbol, fetchNewsWire, fetchNewsFlash, fetchReports } = require('koudai-data');
// 需 Node 以 --openssl-legacy-provider 启动(DES-CBC 限制)
const hit = await resolveSymbol('现货黄金');
const r = await fetchKline({ qid: hit.qid, period: 'day', count: 200 });
const wire = await fetchNewsWire({ count: 30, important: false });
const flash = await fetchNewsFlash({ qid: hit.qid, count: 20 });
const reports = await fetchReports({ qid: '35105', count: 10 });
```

## 7. 接口与加密协议(逆向记录)

- 基础:`https://official.gkoudai.com/officialNetworkApi/…`
- K线:`CandleStickV2?qid=&type=&count=[&startTime=]`;实时:`getRealTimeQuote?qid=`
- 目录:`GetQuoteTypesV4`(分类)→ `typeQuotesByTidV4?tid=`(分类下标的,含 `id`=qid、`name`、`code`)
- 资讯:`attachNews/getNewsFlash`(品种)、`RealTimeList`/`RealTimeListByid`(全局流)、`newsServer/*`(专栏/研报)、`futures/getPointNews*`(机构观点,换前缀)
- **信封**:`x = base64(DES-CBC(明文查询串, key=8位随机, iv="sojexcom"))`,`y = base64(RSA-PKCS1#1.5(key, 1024bit公钥))`,GET `?x=&y=`;响应 `data` 用同一 key/iv DES 解密。实现在 `src/protocol.js`,公钥内置其中。
- 全部资讯接口**同样免登录**,复用与行情一致的信封,无需 token。

> ⚠️ 逆向接口,后端可能变更(加签、换密钥、改路径)。失效时先用 `koudai spec` 核对信封,再重抓 Electron 包 `resources/app/*.asar.gz` 复核 `protocol`/`reference`。
