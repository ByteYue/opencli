# Testing Guide

> 面向开发者和 AI Agent 的测试参考手册。

## 目录

- [测试架构](#测试架构)
- [当前覆盖范围](#当前覆盖范围)
- [本地运行测试](#本地运行测试)
- [如何添加新测试](#如何添加新测试)
- [CI/CD 流水线](#cicd-流水线)
- [Headless 模式](#headless-模式)

---

## 测试架构

测试分为三层，全部使用 **vitest** 运行：

```
tests/
├── e2e/                           # E2E 集成测试（子进程运行真实 CLI）
│   ├── helpers.ts                 # runCli() 共享工具
│   ├── public-commands.test.ts    # 公开 API 命令（无需浏览器）
│   ├── browser-public.test.ts     # 浏览器命令（公开数据，headless）
│   ├── browser-auth.test.ts       # 需登录命令（graceful failure 测试）
│   ├── management.test.ts         # 管理命令（list, validate, verify, help）
│   └── output-formats.test.ts     # 输出格式（json/yaml/csv/md）
├── smoke/                         # 烟雾测试（仅定时 / 手动触发）
│   └── api-health.test.ts         # 外部 API 可用性检测
src/
├── *.test.ts                      # 单元测试（已有 8 个）
```

| 层 | 位置 | 运行方式 | 用途 |
|---|---|---|---|
| 单元测试 | `src/**/*.test.ts` | `npx vitest run src/` | 内部模块逻辑 |
| E2E 测试 | `tests/e2e/*.test.ts` | `npx vitest run tests/e2e/` | 真实 CLI 命令执行 |
| 烟雾测试 | `tests/smoke/*.test.ts` | `npx vitest run tests/smoke/` | 外部 API 健康 |

---

## 当前覆盖范围

### 单元测试（8 个文件）

| 文件 | 覆盖内容 |
|---|---|
| `browser.test.ts` | JSON-RPC、tab 管理、headless/extension 模式切换 |
| `engine.test.ts` | 命令发现与执行 |
| `registry.test.ts` | 命令注册与策略分配 |
| `output.test.ts` | 输出格式渲染 |
| `doctor.test.ts` | Token 诊断 |
| `coupang.test.ts` | 数据归一化 |
| `pipeline/template.test.ts` | 模板表达式求值 |
| `pipeline/transform.test.ts` | 数据变换步骤 |

### E2E 测试（~52 个用例）

| 文件 | 覆盖站点/功能 | 测试数 |
|---|---|---|
| `public-commands.test.ts` | hackernews/top, v2ex/hot, v2ex/latest, v2ex/topic | 5 |
| `browser-public.test.ts` | bbc, bilibili×3, weibo, zhihu×2, reddit×2, twitter, xueqiu×2, reuters, youtube, smzdm, boss, ctrip, coupang, xiaohongshu, yahoo-finance, v2ex/daily | 21 |
| `browser-auth.test.ts` | bilibili/me,dynamic,favorite,history,following + twitter/bookmarks,timeline,notifications + v2ex/me,notifications + xueqiu/feed,watchlist + xiaohongshu/feed,notifications | 14 |
| `management.test.ts` | list×5 格式, validate×3 级别, verify, --version, --help, unknown cmd | 12 |
| `output-formats.test.ts` | json, yaml, csv, md 格式验证 | 5 |

### 烟雾测试

公开 API 可用性（hackernews, v2ex×2, v2ex/topic）+ 全站点注册完整性检查。

---

## 本地运行测试

### 前置条件

```bash
npm ci                # 安装依赖
npm run build         # 编译（E2E 测试需要 dist/main.js）
```

### 运行命令

```bash
# 全部单元测试
npx vitest run src/

# 全部 E2E 测试（会真实调用外部 API）
OPENCLI_HEADLESS=1 npx vitest run tests/e2e/

# 单个测试文件
npx vitest run tests/e2e/management.test.ts

# 全部测试（单元 + E2E）
npx vitest run

# 烟雾测试
OPENCLI_HEADLESS=1 npx vitest run tests/smoke/

# watch 模式（开发时推荐）
npx vitest src/
```

> **注意**：E2E 测试中的浏览器命令需要设置 `OPENCLI_HEADLESS=1`，否则会尝试连接已有 Chrome。如果你本地有 Chrome 和 MCP 扩展，也可以不设此变量、改用真实浏览器测试。

### 浏览器命令本地测试须知

- `browser-public.test.ts` 中的命令使用 `tryBrowserCommand()`，站点反爬导致失败时不会报错
- `browser-auth.test.ts` 中的命令验证的是 **graceful failure**（没 crash 就算通过）
- 如需测试完整登录态功能，在本机保持 Chrome 登录态，不设 `OPENCLI_HEADLESS`，手动跑对应测试

---

## 如何添加新测试

### 新增 YAML Adapter（如 `src/clis/producthunt/trending.yaml`）

1. **无需额外操作**：`validate` 测试会自动覆盖 YAML 结构验证
2. 根据 adapter 类型，在对应文件加一个 `it()` block：

```typescript
// 如果 browser: false（公开 API）→ tests/e2e/public-commands.test.ts
it('producthunt trending returns data', async () => {
  const { stdout, code } = await runCli(['producthunt', 'trending', '--limit', '3', '-f', 'json']);
  expect(code).toBe(0);
  const data = parseJsonOutput(stdout);
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThanOrEqual(1);
  expect(data[0]).toHaveProperty('title');
}, 30_000);
```

```typescript
// 如果 browser: true 但可公开访问 → tests/e2e/browser-public.test.ts
it('producthunt trending returns data', async () => {
  const data = await tryBrowserCommand(['producthunt', 'trending', '--limit', '3', '-f', 'json']);
  expectDataOrSkip(data, 'producthunt trending');
}, 60_000);
```

```typescript
// 如果 browser: true 且需登录 → tests/e2e/browser-auth.test.ts
it('producthunt me fails gracefully without login', async () => {
  await expectGracefulAuthFailure(['producthunt', 'me', '-f', 'json'], 'producthunt me');
}, 60_000);
```

### 新增 TS Adapter（如 `src/clis/producthunt/trending.ts`）

同上，根据是否需要浏览器 / 是否需要登录选择测试文件。

### 新增管理命令（如 `opencli export`）

在 `tests/e2e/management.test.ts` 添加测试：

```typescript
it('export produces output', async () => {
  const { stdout, code } = await runCli(['export', '--site', 'hackernews']);
  expect(code).toBe(0);
  expect(stdout.length).toBeGreaterThan(0);
});
```

### 新增内部模块

在 `src/` 下对应位置创建 `*.test.ts`：

```typescript
// src/mymodule.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './mymodule.js';

describe('mymodule', () => {
  it('does the thing', () => {
    expect(myFunction()).toBe('expected');
  });
});
```

### 决策流程图

```
新增功能 → 是内部模块？ → 是 → src/ 下加 *.test.ts
                ↓ 否
         是 CLI 命令？ → browser: false? → tests/e2e/public-commands.test.ts
                              ↓ true
                        公开数据？ → tests/e2e/browser-public.test.ts
                              ↓ 需登录
                        tests/e2e/browser-auth.test.ts
```

---

## CI/CD 流水线

`.github/workflows/ci.yml` 包含 4 个 Job：

| Job | 触发条件 | 内容 |
|---|---|---|
| **build** | push/PR to main,dev | typecheck + build |
| **unit-test** | push/PR to main,dev | 单元测试，2 shard 并行 |
| **e2e-test** | push/PR to main,dev | 安装 Chromium + E2E 测试 |
| **smoke-test** | 每周一 08:00 UTC / 手动 | 外部 API 健康检查 |

### Sharding

单元测试使用 vitest 内置 shard：

```yaml
strategy:
  matrix:
    shard: [1, 2]
steps:
  - run: npx vitest run src/ --shard=${{ matrix.shard }}/2
```

测试增多后可将分片扩展为 3 或 4。

---

## Headless 模式

设置环境变量 `OPENCLI_HEADLESS=1` 后，`@playwright/mcp` 使用 `--headless` 而非 `--extension` 启动，自行管理一个 headless Chromium 实例。

| 环境变量 | 行为 |
|---|---|
| 未设置（默认） | `--extension` 模式：连接已有 Chrome + MCP 扩展 |
| `OPENCLI_HEADLESS=1` | `--headless` 模式：自启 headless Chromium |

CI 中始终使用 headless 模式。本地开发时按需选择。
