# Vibe Coding 日志 #1：从想法到设计文档

> **日期**：2026-04-16
> **阶段**：Brainstorm → Spec
> **工具**：Claude Code (Opus 4.6) + Superpowers Brainstorming Skill
> **耗时**：约 45 分钟
> **产出**：一份完整的设计文档 (`2026-04-16-llm-wiki-kit-design.md`)

## 背景

我最近在用 LLM Wiki 模式（来自 Shopify CEO Tobi Lutke）管理个人知识库——让 LLM 增量构建和维护一个 Obsidian wiki。过程中碰到不少痛点：文档格式杂乱、骨架手动搭建、LLM 输出质量不稳定。于是想做一个工具解决这些问题，同时作为自己学习 vibe coding 全流程的实践项目。

## 对话过程

### 第一步：方向探索

我一开始的想法比较模糊——"想研究 vibe coding，想做个项目提升简历，感觉结合 LLM Wiki 有意义"。Claude 先了解了我的现有项目（个人知识库、ai-daily-news skill），然后给了四个方向：

> **你对这个项目的核心定位是什么？**
>
> - A) 工具型：做一个开源工具/框架，让别人也能快速搭建 LLM Wiki
> - B) 平台型：做一个完整的 LLM Wiki 管理平台
> - C) 插件型：做一个 Obsidian 插件
> - D) 基础设施型：做一个 MCP Server

我选了 A——工具型。不做 MCP，不做平台。

### 第二步：发现核心痛点

我提到自己搭建时的真实痛点：文档格式太杂（Word、PDF 等），需要转成 Obsidian markdown。Claude 立刻去搜索了现有的转换工具生态：

> **文档转 Markdown 这一层，绝对不要从头做，应该集成。**
>
> | 工具 | 维护方 | 擅长 |
> |---|---|---|
> | MarkItDown | Microsoft | DOCX/PPTX/XLSX/图片/音频 |
> | Docling | IBM | 复杂 PDF 排版还原（AI 布局分析） |
> | Marker | datalab | PDF/EPUB 速度快 |
> | Pandoc | 开源标杆 | 万能格式互转 |

这个判断很关键——避免了我在已有成熟工具上重复造轮子。

### 第三步：架构决策——一个关键选择

Claude 提了三个方案，核心区别是"架构重心放在哪里"：

> **方案 A**：CLI 重型 + Skill 轻型
> **方案 B**：CLI 轻型 + Skill 重型（推荐）
> **方案 C**：Monorepo 对等架构

我选了 B。因为我的核心目标是展示 harness engineering——**用确定性脚本兜底非确定性的 LLM 输出**。CLI 只是入口，Skill 包才是核心资产。

Claude 的推荐理由说服了我：

> 你的核心差异化是 **harness 设计**，不是 CLI 工具本身——市面上不缺 CLI，缺的是设计良好的 LLM Wiki 工作流约束。

### 第四步：技术栈博弈

这里有一个有趣的张力。我没学过 TypeScript，但从简历角度 TS 更有价值。问题是核心转换库（MarkItDown、Docling）全是 Python 的。

我问了一个关键问题：**TS CLI + Python 转换层在开源界普遍吗？**

> 说实话，**不太普遍，接受度也一般**。双运行时（Node + Python）对用户来说是明显的安装摩擦。

最终决策：**纯 TS，PDF 转换后期再加**。先保证架构干净、用户体验好。这个取舍很重要——不是技术上做不到混合，而是从用户角度不应该这么做。

### 第五步：Harness 三层架构

这是整个设计的核心，也是我最满意的部分。每个 Skill 是一个三层 harness：

```
┌─────────────────────────────────┐
│  SKILL.md（提示词层）            │  ← 定义工作流和约束
├─────────────────────────────────┤
│  scripts/（校验层）              │  ← 确定性检查，LLM 的"安全网"
├─────────────────────────────────┤
│  examples/（示范层）             │  ← few-shot 引导
└─────────────────────────────────┘
```

校验脚本输出机器可读的 JSON，LLM 可以直接解析并自动修复：

```json
{
  "status": "fail",
  "errors": [
    {
      "file": "wiki/summaries/DNS基础学习.summary.md",
      "rule": "frontmatter-required-fields",
      "message": "缺少 'sources' 字段"
    }
  ]
}
```

这个设计的关键洞察：**即使本地小模型输出质量较低，校验脚本仍能发现问题并要求修复**。Harness 兜底让工具不依赖特定模型的能力水平。

### 第六步：我提出的两个修正

设计不是单向输出的。我在过程中提了两个重要修正：

**修正 1**：Schema 不应该由 CLI 生成。

> 我说的 harness 很大程度上就是想确保 LLM 生成 wiki 的准确性和 LLM 对 schema 的遵守。

Schema（CLAUDE.md）是高度领域相关的，需要 LLM 和用户对话式协作来生成，不能靠模板。

**修正 2**：Skill 不能绑死 Claude Code 的文件约定。

> 必须是 claude.md 和在 claude 下安装技能吗？其他应用想用怎么办？

这推动了通用适配设计：Skills 放项目内 `.llm-wiki-kit/skills/`，同时生成 CLAUDE.md / AGENTS.md / COPILOT.md 多客户端适配文件。

### 第七步：自包含原则

最后一个架构决策也来自我的追问：

> 这个 skills 包这样的架构，如果用户想要直接导入 skill 放在自己的 claude 用呢，是不是不好导入？

确实——如果 skills 之间有共享依赖（`scripts/common/`），用户没法拷贝单个 skill 文件夹就用。最终选择：**每个 Skill 完全自包含**，允许少量代码重复以换取独立可安装性。

这和核心原则一致：**CLI 是加速器，不是门槛。**

## 产出

一份 9 章节的设计文档，覆盖：项目定位、技术栈、项目结构、CLI 设计、Skill Harness 架构、LLM 客户端适配、v1 范围、成功标准、简历价值。

## 反思

1. **Brainstorming Skill 的价值**：它强制了"一次问一个问题"的节奏，避免了信息过载。每个问题都是多选题，降低决策负担。
2. **人类的判断仍然关键**：几个最重要的设计决策（不绑定 Claude Code、Skill 自包含、Schema 不用 CLI 生成）都是我提出的修正，不是 AI 主动想到的。
3. **先搜后建**：文档转换工具的生态调研避免了重复造轮子，这个习惯很重要。
4. **取舍比功能更重要**：选纯 TS 放弃 Python 混合、选 Skill 重型放弃 CLI 重型、v1 不做 PDF——每个"不做"的决定和"做"一样重要。
