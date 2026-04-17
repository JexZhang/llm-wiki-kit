# 示例：一次完整的 ingest 会话

> 场景：用户把一篇"DNS 基础学习"笔记放进 raw/，让 LLM ingest。

## User
ingest raw/feishu_exports/DNS 基础学习.md

## LLM（Step 1-2）
[读取文档后]

这篇笔记的要点我提取如下，请确认：

1. DNS 是分布式命名系统，把域名映射到 IP
2. 核心概念：递归解析 vs 迭代解析
3. 常见记录类型：A / AAAA / CNAME / MX / TXT
4. 缓存机制：TTL 和递归服务器缓存
5. 实践工具：dig、nslookup

是否有遗漏或想调整的？

## User
加一条："DNSSEC 签名验证"

## LLM（Step 3）
好，生成 summary：

写入 `wiki/summaries/DNS 基础学习.md`，运行 validate-frontmatter：
```json
{"status":"pass","errors":[]}
```

## LLM（Step 4）
识别到新 concepts：
- 递归解析（不存在，创建）
- 迭代解析（不存在，创建）
- DNSSEC（不存在，创建）
- DNS 记录类型（存在，补充）

运行 validate-links：
```json
{"status":"fail","errors":[{"file":"wiki/summaries/DNS 基础学习.md","rule":"broken-link","message":"目标页面不存在：[[缓存]]"}]}
```

修复：把 `[[缓存]]` 改成 `[[DNS 缓存]]` 并创建对应 concept 页。重跑 pass。

## LLM（Step 5-7）
- domain 页 `wiki/domains/网络.md` 追加链接
- index.md 新增 3 条 concept + 1 条 summary
- 运行 validate-index-sync → pass
- log.md 追加：`2026-04-20 10:30 | ingest | raw/feishu_exports/DNS 基础学习.md | 新增 summary + 4 concepts`

完成。共新增 5 个页面，修改 2 个。
