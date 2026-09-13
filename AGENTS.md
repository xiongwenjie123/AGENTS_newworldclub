# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

---

# 新大陆俱乐部 · 业务与工程说明

## 业务域（21 席 · 灵魂协作操作系统）
- **21 席三舱**：探索舱 explore(7) / 建造舱 build(7) / 治理舱 govern(7)，每席绑定关键能力维度。
- **8 维能力**：curiosity 好奇心 / abstract 抽象 / imagination 想象力 / ambiguity 模糊容忍 / systematic 系统思维 / executing 执行力 / empathy 共情 / communication 协作表达。
- **主流程**：登舰测试(`/onboarding`) → AI 解析答卷生成 8 维雷达 + 21 席适配分 → 航行档案(`/dashboard`) → 进候选池(`/pool`) → 舰长发起 Mission(`/mission`) → AI 三策略组舰(`/fleet`，真人匹配 + Agent 补位 + 风险分级) → 舰桥多 Agent 协作产出(`/bridge`，SSE 流式，**必须人工确认留痕**) → 归档创新航迹(`/trace`)。
- **核心原则**：AI 永远只出草稿(agent_generated)，人类永远拍板(confirm/reject)，Agent 调用 Prompt/原始输出/人工修改全部入档审计。

## 关键模块
- `src/lib/auth.ts`：JWT(HMAC) cookie 会话 `nw_session`、scrypt 密码哈希、`requireUser(roles?)` 角色鉴权、文明编号 NW-XXXX。
- `src/lib/db.ts`：`getDb()` drizzle 单例（**运行时库**，与 CLI `db upgrade` 的托管库不是同一个）。
- `src/lib/llm.ts`：封装 `coze-coding-dev-sdk` 的 LLMClient；`forwardHeadersFrom(req)` **必须**透传请求头(鉴权/配额)；`normalizeErr` 归一化网关错误。LLM 不可用时上层走规则/模板降级。
- `src/lib/passport.ts`：`analyzeAnswers`(LLM JSON 画像) + `ruleBasedAnalyze`(关键词规则兜底) + 席位分映射。
- `src/lib/fleet.ts`：`composeFleet` 三策略组舰(balanced 均衡 / creative 探索优先 / stable 建造加速)，Agent 补位标风险。
- `src/lib/mission-data.ts`：`getMissionDetail` 聚合 mission+fleets+seats(join sysUser 取昵称，含 type human/agent)。
- `src/lib/domain.ts` / `src/lib/constants.ts`：21 席、8 维、**MISSION_PHASES 阶段 ID**、角色与文案。阶段 ID 统一为：`intel_analysis / positioning / prototype_build / trial_voyage / maiden_voyage / archive_retrospect`（⚠️ 前后端与 seed 必须一致）。
- `src/storage/database/shared/schema.ts`：15 张表 drizzle 定义（⚠️ 勿跑 `generate-models`，会被覆盖）。
- `scripts/init-db.sql`：运行时建表 DDL（幂等 IF NOT EXISTS）+ 阶段 ID 归一化 + 列宽修复，经 `POST /api/debug/init` 用 `dbi.execute(sql)` 在运行时库执行。
- `scripts/seed-demo.ts`：演示数据（24 用户 + 1 Mission + 1 Fleet + 3 阶段产出），`POST /api/demo/seed` 幂等播种。

## API 清单（统一响应 `{code,message,data}`，code:0 成功）
- 认证：`POST /api/auth/register|login|logout`、`GET /api/auth/session`
- 登舰：`GET /api/expedition/questions`、`POST /api/expedition/submit`、`GET /api/expedition/passport`、`GET/POST /api/expedition/pool`
- Mission：`GET/POST /api/mission`、`GET /api/mission/[id]`、`POST /api/mission/[id]/archive`、`POST /api/mission/[id]/feedback`、`GET /api/mission/[id]/trace`(`[id]` 支持 `latest`，`?format=md` 导出)
- 组舰：`POST /api/fleet/compose`(三方案)、`POST /api/fleet/confirm`
- 舰桥：`GET /api/bridge/[id]`、`POST /api/bridge/agent`(SSE 流式/`stream:false` 非流式)、`POST /api/bridge/confirm`(outputId+operation:confirm/reject)、`POST /api/bridge/swap`
- 后台：`GET /api/admin/stats`、`GET /api/admin/users`（platform_admin/club_operator/club_governor 可访问）
- 其他：`GET /api/announcements`；调试：`POST /api/debug/init`、`GET /api/debug/llm`、`POST /api/demo/seed`

## 多角色
`platform_admin` 平台管理员 / `club_operator` 俱乐部运营 / `club_governor` 俱乐部治理者 / `fleet_commander`(舰长) / `member`(舰员)。后台接口在路由内 `requireUser([...])` 白名单控制，前端导航按 `adminRoles` 过滤。

## 响应式
PC 三栏舰桥工作台；移动端单栏卡片流 + 底部 5 Tab + 顶部汉堡菜单（`src/components/app-shell.tsx`）；小程序端以移动 H5(`/m` 风格)呈现。所有页面用 Tailwind `sm:/lg:/md:` 断点自适应。

## 演示账号
- 管理员：`admin@newworld.club` / `demo123456`（platform_admin）
- 其余 23 名演示舰员密码同为 `demo123456`（isDemo）。
- 播种：`curl -X POST <domain>/api/demo/seed`；建表：`curl -X POST <domain>/api/debug/init`。

## 常见排障
- **运行时表缺失**：CLI `db upgrade` 连的是托管库，App 运行时是另一库 → 调 `POST /api/debug/init` 在运行时库执行 init-db.sql。
- **drizzle 访问字段报错**：代码用 camelCase 属性（如 `userId`/`createdAt`），数据库列是 snake_case；勿在代码里写 `.snake_case`。
- **LLM「资源点不足/临时不可用」**：网关配额问题，非代码 bug；已有 `ruleBasedAnalyze`(画像) 与 `buildFallbackDraft`(舰桥草稿) 自动降级，产出仍标记待人工确认。
- **varchar 超长 / 阶段错位**：见 init-db.sql 末尾的幂等修复(ALTER + UPDATE)。
