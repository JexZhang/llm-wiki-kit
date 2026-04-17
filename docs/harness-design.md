# Harness 设计理念

> 为什么本项目的核心不是 CLI，而是 Skill 包的三层 harness。

## 问题

LLM 生成 wiki 页面时会稳定地出现这类错误：

- frontmatter 漏字段、值类型错、拼错字段名
- 链接指向不存在的页面
- index.md 忘记更新
- 新建页成为孤岛

单纯依赖更好的 prompt 不能彻底解决——任何非确定性输出都可能漂移。

## 方案：三层 Harness

```
┌─────────────────────────────────┐
│  SKILL.md（提示词层）            │  ← 定义工作流、硬约束
├─────────────────────────────────┤
│  scripts/（校验层）              │  ← 确定性检查，JSON 反馈
├─────────────────────────────────┤
│  examples/（示范层）             │  ← few-shot 锚定输出风格
└─────────────────────────────────┘
```

每层缺一不可：
- 没提示词 → LLM 不知道要做什么
- 没校验 → 错误会沉默地累积
- 没示例 → 输出质量漂移

## 校验脚本设计原则

### 1. 单一职责
每个 `.sh` 只检查一件事：frontmatter 是 frontmatter，链接是链接，不混着。这样报错明确，LLM 修复指向清楚。

### 2. JSON 输出
统一格式：

```json
{
  "status": "pass" | "fail",
  "errors": [
    { "file": "...", "rule": "...", "message": "..." }
  ]
}
```

`rule` 是机器友好的 ID，LLM 可以基于它查到修复策略。`message` 给人看。

### 3. 修复循环上限
SKILL.md 规定最多重试 2 次。超过就把 JSON 抛给用户，不让 LLM 陷入死循环。

### 4. 独立可运行
用户可以手动跑脚本做批量检查，不必进入 LLM 会话。这让 harness 成为工具，而不是黑盒。

## Skill 之间的协作

- `schema-wizard` 产出的 schema 是其他三个 Skill 的规则来源
- `lint` 的脚本是 `ingest` 校验的**全量超集**——ingest 只校验被改动的页，lint 扫全库
- **每个 Skill 完全自包含**：通用工具函数内联到各自脚本，允许少量代码重复换取独立拷贝安装

## 本地模型兼容

Skill 提示词不依赖 tool use 或特定模型能力——纯文本指令 + 脚本兜底。即使小模型写出糟糕的 frontmatter，`validate-frontmatter.sh` 仍然能捕获并要求修复。

## 反面教材

本项目**不做**：
- LLM-as-judge 质量评估（v1 不值得复杂度）
- 依赖特定 LLM 客户端的 tool calling
- 把校验逻辑内嵌到 TypeScript（脚本版任何客户端都能跑）

## 参考

- [ai-daily-news Skill](https://github.com/turingcode-ai/ai-daily-news) — 本项目的精神前身
- [Anthropic Agent SDK guidance](https://docs.anthropic.com/) — tool use 模式
