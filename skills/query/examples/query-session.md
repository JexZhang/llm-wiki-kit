# 示例：query 会话

## User
wiki 里关于 DNS 的内容总结一下。

## LLM（Step 1-2）
从 wiki 中找到：
- `wiki/summaries/dns-basics.md`（wiki 原有）
- `wiki/concepts/递归解析.md`（wiki 原有）
- `wiki/concepts/迭代解析.md`（wiki 原有）

**wiki 已有：** DNS 是分布式命名系统；核心概念包括递归解析和迭代解析；常见记录类型 A/AAAA/CNAME/MX/TXT。

**LLM 补充：** 实际生产环境中大规模部署经常搭配 Anycast 做就近解析，你的 wiki 里没有这部分。

## LLM（Step 3）
要把 "Anycast DNS 部署模式" 回填进 wiki 吗？

## User
嗯，回填一下。

## LLM（Step 4）
新建 `wiki/concepts/Anycast DNS.md`：

```markdown
---
type: concept
title: Anycast DNS
tags: [dns, network]
created: 2026-04-20
updated: 2026-04-20
---

一种基于 Anycast 路由的 DNS 部署模式，多个节点共享 IP。
反向链接：[[dns-basics]]、[[递归解析]]。
```

运行 validate-backfill：
```json
{"status":"pass"}
```

## LLM（Step 5）
- index.md 在 Concepts 追加 `- [[Anycast DNS]]`
- log.md：`2026-04-20 14:02 | query | DNS 总结 | 回填 +1 Anycast DNS`
