# llm-wiki-kit 设计文档

> 一个帮助任何人快速搭建和维护 LLM Wiki 的工具包。
> CLI 处理确定性操作，Skill 包处理需要 LLM 判断的工作流。

## 1. 项目定位

**名称**：llm-wiki-kit

**核心理念**：LLM Wiki（基于 [llm-wiki 模式](https://github.com/tobi/llm-wiki)）是一种让 LLM 增量构建和维护个人知识库的方法。但从零搭建一个 LLM Wiki 有诸多痛点：

- 文档格式杂乱（Word、PDF、HTML、EPUB），需要统一转为 Markdown
- 目录结构、schema（CLAUDE.md）、索引等骨架文件需要手动创建
- LLM 在 ingest/query/lint 工作流中的输出质量不稳定，缺乏校验机制

llm-wiki-kit 解决这些问题，提供：
- **CLI 工具**：一键初始化 wiki 骨架 + 批量文档格式转换
- **Skill 包**：带校验脚本的 LLM 工作流 harness，确保输出质量可控

**目标用户**：想用 LLM 管理个人知识库的开发者/研究者/知识工作者。

**差异化**：不是又一个文档转换工具或 Obsidian 插件，而是一套**LLM 行为约束系统（harness）**——用确定性脚本兜底非确定性的 LLM 输出。

## 2. 技术栈

| 层 | 技术 | 理由 |
|---|---|---|
| CLI | TypeScript + Node.js | 现代 CLI 工具主流，`npx` 开箱即用 |
| 文档转换 | Pandoc（外部依赖） | 开源标杆，支持 docx/html/epub/pptx，CLI 调用 |
| 校验脚本 | Bash | 跨平台（macOS/Linux），不依赖 Node 运行时 |
| Skill 提示词 | Markdown | 通用格式，不绑定特定 LLM 客户端 |

**不使用 Python**：v1 保持纯 TS + Bash，避免双运行时依赖。PDF 转换（需要 Python 库）推迟到 v2。

## 3. 项目结构

```
llm-wiki-kit/
├── packages/
│   └── cli/                        # npm 包：llm-wiki-kit
│       ├── src/
│       │   ├── commands/
│       │   │   ├── init.ts         # 创建骨架 + 安装 skills
│       │   │   └── convert.ts      # 文档 → Obsidian MD（调用 Pandoc）
│       │   └── index.ts
│       ├── templates/              # init 用的文件模板
│       └── package.json
│
├── skills/                         # Skill 包（每个完全自包含，可独立安装）
│   ├── schema-wizard/              # 引导生成定制化 schema
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   └── validate-schema.sh
│   │   └── examples/
│   │       ├── personal-wiki.md
│   │       └── research-wiki.md
│   │
│   ├── ingest/                     # ingest 工作流
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   ├── validate-frontmatter.sh
│   │   │   ├── validate-links.sh
│   │   │   └── validate-index-sync.sh
│   │   └── examples/
│   │       └── ingest-session.md
│   │
│   ├── query/                      # query + 回填工作流
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   └── validate-backfill.sh
│   │   └── examples/
│   │
│   └── lint/                       # 健康检查 + health.base 生成
│       ├── SKILL.md
│       ├── scripts/
│       │   ├── check-orphans.sh
│       │   ├── check-frontmatter.sh
│       │   ├── check-index-drift.sh
│       │   └── generate-health-base.sh
│       └── examples/
│
├── docs/
│   ├── getting-started.md
│   └── harness-design.md
│
├── README.md
├── package.json
└── LICENSE
```

## 4. CLI 设计

### 4.1 `npx llm-wiki-kit init`

交互式创建 wiki 骨架。

**输入**：
- 知识库名称
- 存放路径
- Skills 安装方式（项目内 `.llm-wiki-kit/skills/` 或自定义路径）

**输出**：
```
<wiki-root>/
├── raw/
├── wiki/
│   ├── domains/
│   ├── entities/
│   ├── concepts/
│   ├── playbooks/
│   └── summaries/
├── .llm-wiki-kit/
│   └── skills/         # 4 个 Skill 包
├── index.md            # 空骨架，带分节格式
├── log.md              # 空，带格式说明
├── MOC.md              # 空骨架
├── CLAUDE.md           # Claude Code / Cursor 适配
├── AGENTS.md           # Codex 适配
├── COPILOT.md          # Copilot CLI 适配
└── README.md           # 通用说明
```

**设计要点**：
- 支持 `--yes` 跳过交互，使用默认值
- 多客户端适配文件同时生成（CLAUDE.md / AGENTS.md / COPILOT.md），内容一致只是文件名不同
- 这些适配文件是**最小可用 schema**——包含目录结构约定、基础 frontmatter 规范、三大工作流的简要说明，用户可直接开始使用
- **schema-wizard Skill 是可选的增强步骤**——引导用户定义领域、定制页面类型、添加特殊规则，生成完整的定制化 schema 覆盖初始文件
- Skills 放在项目内 `.llm-wiki-kit/skills/`，不依赖特定客户端路径

### 4.2 `npx llm-wiki-kit convert`

批量文档转 Obsidian Markdown。

**输入**：源目录路径 + 输出目录路径

**支持格式（v1）**：`.docx`、`.html`、`.epub`、`.pptx`（依赖 Pandoc）

**设计要点**：
- 保留原文件名（支持中文）
- 基础清洗：修复图片路径、去除多余空行、统一换行符
- Pandoc 未安装时给出安装指引，不自动安装
- `.pdf` 文件跳过并提示"后续版本支持"

## 5. Skill Harness 架构（核心）

每个 Skill 是一个**三层 harness**：

### 5.1 提示词层（SKILL.md）

定义 LLM 的工作流步骤、输出约束、校验触发点。

**通用结构**：
```markdown
## 前置准备
### 方式 A：使用 llm-wiki-kit CLI（推荐）
> `npx llm-wiki-kit init` 完成骨架初始化后再使用本 Skill
### 方式 B：手动初始化
> LLM 按指引手动创建目录和文件

## 工作流步骤
Step 1: ...
  → 完成后运行 `bash scripts/validate-xxx.sh`
Step 2: ...

## 输出约束
- frontmatter 格式要求
- 文件命名规则
- 链接规范
```

**关键**：Skill 自包含，不强制依赖 CLI。CLI 是加速器，不是门槛。

### 5.2 校验层（scripts/）

确定性检查脚本，LLM 输出的"安全网"。

**设计原则**：
1. **单一职责**：每个脚本只检查一件事
2. **机器可读输出**：JSON 格式，LLM 可直接解析并修复
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
3. **修复循环有上限**：SKILL.md 中指定最多重试 2 次，避免死循环
4. **可独立运行**：用户也可手动运行做批量检查

**校验脚本清单**：

| Skill | 脚本 | 检查内容 |
|---|---|---|
| schema-wizard | validate-schema.sh | schema 文件格式、必要字段完整性 |
| ingest | validate-frontmatter.sh | frontmatter 必填字段、类型值合法性 |
| ingest | validate-links.sh | wiki link 目标存在、双向链接完整 |
| ingest | validate-index-sync.sh | index.md 与实际文件一致 |
| query | validate-backfill.sh | 回填页的 frontmatter 和链接 |
| lint | check-orphans.sh | 无入站链接的页面 |
| lint | check-frontmatter.sh | 全量 frontmatter 合规检查 |
| lint | check-index-drift.sh | index.md 与实际文件偏移 |
| lint | generate-health-base.sh | 生成/更新 wiki/health.base 仪表盘 |

### 5.3 示范层（examples/）

Few-shot 引导，提升 LLM 输出质量。

每个 Skill 至少包含：
- 一个**完整的输入→输出示例**（如一次完整 ingest 会话的记录）
- 一个**好/坏对比示例**（如合规 vs 不合规的 frontmatter）
- 真实场景的**参考模板**

### 5.4 Skill 之间的协作

- `schema-wizard` 生成的 schema 被 ingest/query/lint 读取作为规则来源
- `lint` 的检查脚本是 ingest/query 校验脚本的**超集**——lint 跑全量，ingest 只跑增量
- 每个 Skill **完全自包含**——通用工具函数（读 frontmatter、解析 wiki link）内联到各自的脚本中，允许少量重复以换取独立可安装性
- 用户可以只拷贝单个 skill 文件夹到 `.claude/skills/`（或其他客户端的 skills 目录）即可使用
- `lint` 首次运行自动生成 `wiki/health.base`，后续运行更新它

### 5.5 ingest Skill 执行流程（示例）

```
用户: "ingest raw/feishu_exports/DNS基础学习.md"
         │
         ▼
  SKILL.md 指令 LLM 执行：
  ┌─────────────────────────────────┐
  │ Step 1: 读 raw 文档全文          │
  │ Step 2: 与用户讨论关键要点        │
  │ Step 3: 写 summary 页           │
  │    → 运行 validate-frontmatter  │
  │    → pass? 继续 / fail? 修复重试 │
  │ Step 4: 更新 entities/concepts  │
  │    → 运行 validate-links        │
  │ Step 5: 更新 domain 页          │
  │ Step 6: 更新 index.md           │
  │    → 运行 validate-index-sync   │
  │ Step 7: 追加 log.md             │
  │ Step 8: 生成报告                 │
  └─────────────────────────────────┘
```

## 6. LLM 客户端适配策略

### 6.1 通用设计

- Skills 放在项目内 `.llm-wiki-kit/skills/`，不依赖特定客户端路径
- SKILL.md 使用通用 Markdown 格式，脚本引用相对路径
- `init` 同时生成 CLAUDE.md / AGENTS.md / COPILOT.md

### 6.2 降级方案

不识别上述约定文件的客户端（aider、本地模型 + 终端等）：
- README.md 有通用说明："把 SKILL.md 内容粘贴到 system prompt"
- 每个 SKILL.md 自包含，复制粘贴即可使用
- 校验脚本独立于 LLM 客户端，任何终端都能运行

### 6.3 本地模型兼容

- Skill 提示词避免依赖特定模型能力（如 tool use），使用纯文本指令
- 校验脚本作为质量兜底——即使小模型输出质量较低，脚本仍能发现问题并要求修复

## 7. v1 范围

### 做

| 模块 | 内容 |
|---|---|
| CLI: init | 交互式创建骨架 + 安装 skills + 生成多客户端适配文件 |
| CLI: convert | 基于 Pandoc 的批量文档转 MD（docx/html/epub/pptx） |
| Skill: schema-wizard | 引导 LLM 和用户对话生成定制化 schema + 初始 health.base |
| Skill: ingest | 完整 ingest 工作流 + frontmatter/links/index 校验脚本 |
| Skill: query | query + 回填工作流 + 回填校验脚本 |
| Skill: lint | 全量健康检查 + 主动建议 + 生成/更新 health.base 仪表盘 |
| 校验脚本 | bash，JSON 输出，LLM 可解析并自动修复 |
| 文档 | README、getting-started、harness-design 设计理念 |
| 示例 | 每个 Skill 带完整示例（基于脱敏的真实 wiki） |

### 不做

- PDF 转换（v2，集成 Marker/Docling）
- Obsidian 输出格式集成（canvas/marp/bases 生成）（v2）
- 特定 LLM 客户端深度适配
- MCP Server
- Web UI
- LLM-as-judge 自动质量评估

### 后期路线图（v2+）

1. PDF 转换：集成 Marker 或 Docling，作为可选依赖
2. 输出格式：集成 Obsidian 技能（canvas/marp/bases）
3. search Skill：wiki 规模变大后的搜索能力（集成 qmd）
4. 客户端适配：为主流客户端写适配层
5. 质量评估：LLM-as-judge 自动评估输出质量
6. 插件系统：允许社区贡献新的 Skill

## 8. 成功标准

- 新用户能在 **10 分钟内**从零到完成第一次 ingest
- Skills 在 **Claude Code + 至少一个本地模型客户端**上都能跑通
- GitHub README 清晰展示 vibe coding 全流程和 harness 设计理念
- 校验脚本能捕获 LLM 的常见输出错误（frontmatter 缺字段、链接断裂、索引不同步）

## 9. 简历价值

本项目展示以下能力：

1. **Vibe Coding 全流程**：从 spec → plan → 实现 → 测试，全程 AI 辅助
2. **Harness Engineering**：设计 LLM 行为约束系统，用确定性脚本保证非确定性输出质量
3. **TypeScript 工程**：CLI 工具开发、npm 包发布
4. **开源项目运营**：文档、示例、路线图、社区友好设计
5. **领域创新**：LLM Wiki 是新兴模式，目前缺乏成熟工具链，本项目填补空白
