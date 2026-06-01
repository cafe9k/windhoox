# Windhoox 桌面应用技术设计文档

生成日期：2026-06-01

## 1. 项目定位

Windhoox 是一个基于 Electron 的跨平台桌面应用项目。当前阶段的目标不是实现完整业务功能，而是验证一条可运行、可构建、可发布、可更新的桌面应用工程链路。

首版应完成以下闭环：

- 在本地启动 Electron 桌面应用。
- 渲染一个最小可用的 Hello World 页面。
- 支持 macOS 和 Windows 构建。
- 使用 GitHub Actions 自动生成安装包。
- 使用 GitHub Releases 分发安装包。
- 预留并接入 `electron-updater` 自动更新能力。
- 暂不接入代码签名、macOS notarization 和 Windows 证书签名。

## 2. 已确认需求

| 项目 | 结论 |
| --- | --- |
| 应用名称 | Windhoox |
| 当前目标 | 验证 Electron 打包、发布和更新流程 |
| 技术栈 | Electron + Vite + React + TypeScript |
| 包管理器 | pnpm |
| 打包工具 | electron-builder |
| 安装包格式 | macOS `.dmg`，Windows `.exe` |
| 自动更新 | 使用 `electron-updater` |
| 仓库状态 | 当前仓库为空仓库，可从零初始化 |
| 代码签名 | 暂不需要 |
| 文档位置 | `docs/technical-design.md` |

## 3. 非目标

当前阶段不处理以下内容：

- 不实现正式业务功能。
- 不接入登录、账户、云同步、数据库等后端能力。
- 不做复杂 UI 设计，只提供最小 Hello World 页面。
- 不做代码签名和 notarization。
- 不保证无签名安装包在所有用户机器上都能无提示安装。
- 不实现私有更新服务器，首版只基于 GitHub Releases。

## 4. 总体架构

Windhoox 首版采用典型 Electron 三层结构：

```text
Electron Main Process
  负责窗口创建、应用生命周期、自动更新检查、系统能力接入

Preload Script
  作为主进程和渲染进程之间的安全桥接层

Renderer Process
  使用 Vite + React + TypeScript 实现前端页面
```

渲染层只负责 UI。主进程负责桌面应用能力。渲染层如需调用主进程能力，应通过 preload 暴露的安全 API 完成，避免直接启用 Node.js 能力。

## 5. 推荐目录结构

```text
windhoox/
  .github/
    workflows/
      release.yml
  docs/
    technical-design.md
  src/
    main/
      main.ts
      updater.ts
    preload/
      preload.ts
    renderer/
      App.tsx
      main.tsx
      styles.css
  index.html
  package.json
  pnpm-lock.yaml
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  electron-builder.yml
  README.md
```

目录职责：

| 路径 | 职责 |
| --- | --- |
| `src/main` | Electron 主进程代码 |
| `src/preload` | preload 安全桥接代码 |
| `src/renderer` | React 页面代码 |
| `.github/workflows` | GitHub Actions CI/CD 配置 |
| `electron-builder.yml` | 安装包构建与发布配置 |
| `docs` | 项目设计、发布、维护文档 |

## 6. 技术选型

### 6.1 Electron

Electron 负责提供桌面应用容器，支持 macOS 和 Windows。首版只使用基础能力：

- 创建主窗口。
- 加载 Vite 开发服务或生产构建产物。
- 管理应用生命周期。
- 接入自动更新检查。

### 6.2 Vite

Vite 用于 React 渲染层开发和构建。它提供较快的本地开发体验，并能输出静态前端产物供 Electron 加载。

### 6.3 React + TypeScript

React 用于构建页面。TypeScript 用于提升工程可维护性。首版页面只需要显示：

```text
Hello, Windhoox
```

### 6.4 pnpm

pnpm 作为包管理器，优点是安装速度快、依赖结构清晰、适合 CI 缓存。

### 6.5 electron-builder

electron-builder 用于生成跨平台安装包：

- macOS: `.dmg`
- Windows: `.exe`

同时它可以将产物发布到 GitHub Releases，配合 `electron-updater` 完成自动更新。

### 6.6 electron-updater

`electron-updater` 用于检测和下载新版本。首版建议只在生产环境启用更新检查，开发环境不触发真实更新。

## 7. Hello World 首版范围

首版页面不需要复杂导航和状态管理，只保留最小验证内容。

页面内容：

- 应用名称：Windhoox
- 主文案：Hello, Windhoox
- 辅助信息：Electron + Vite + React + TypeScript

验收标准：

- `pnpm dev` 可以启动桌面窗口。
- 窗口内显示 Hello World 页面。
- 页面无明显报错。
- macOS 和 Windows CI 可以生成安装包。
- GitHub Release 中可以看到构建产物。

## 8. 本地开发流程

建议提供以下 npm scripts：

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "dev:electron": "electron .",
    "build": "tsc && vite build",
    "build:electron": "tsc -p tsconfig.node.json",
    "dist": "pnpm build && pnpm build:electron && electron-builder",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

实际实现时可以使用并发工具让 Vite dev server 和 Electron 同时启动。例如使用 `concurrently` 和 `wait-on`：

```json
{
  "scripts": {
    "dev": "concurrently \"vite --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && electron .\""
  }
}
```

## 9. Electron 主进程设计

主进程核心职责：

- 创建 `BrowserWindow`。
- 开发环境加载 `http://127.0.0.1:5173`。
- 生产环境加载打包后的 `dist/index.html`。
- 配置安全选项。
- 初始化自动更新。

推荐安全配置：

```ts
webPreferences: {
  preload: path.join(__dirname, "../preload/preload.js"),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: false
}
```

说明：

- `contextIsolation: true` 隔离页面上下文和 Electron 内部上下文。
- `nodeIntegration: false` 禁止渲染层直接访问 Node.js。
- preload 只暴露明确需要的 API。

## 10. 自动更新设计

### 10.1 更新来源

首版使用 GitHub Releases 作为更新源。发布新版本时，GitHub Actions 构建安装包并上传 Release 资产，`electron-updater` 从 Release 元数据中检测新版本。

### 10.2 版本规则

建议使用语义化版本：

```text
v0.1.0
v0.1.1
v0.2.0
```

触发发布的 Git tag 应与 `package.json` 中的 `version` 保持一致。

### 10.3 更新触发时机

首版策略：

- 应用启动后检查更新。
- 发现更新后后台下载。
- 下载完成后提示用户重启安装。

后续可以增加：

- 手动检查更新菜单。
- 更新进度展示。
- Release notes 展示。

### 10.4 无签名限制

当前阶段不做代码签名，因此自动更新验证链路只能用于工程验证，不建议直接面向大规模真实用户分发。

可能出现的问题：

- macOS 可能出现 Gatekeeper 安全提示。
- Windows 可能出现 SmartScreen 提示。
- 某些自动更新场景在未签名环境下体验不稳定。

正式分发前建议补充：

- Apple Developer ID。
- macOS notarization。
- Windows Code Signing 证书。

## 11. electron-builder 配置建议

推荐使用 `electron-builder.yml`：

```yaml
appId: com.windhoox.desktop
productName: Windhoox
directories:
  output: release
files:
  - dist/**
  - dist-electron/**
  - package.json
mac:
  target:
    - dmg
  category: public.app-category.productivity
win:
  target:
    - nsis
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
publish:
  provider: github
```

构建产物建议统一输出到：

```text
release/
```

## 12. GitHub Actions CI/CD 设计

### 12.1 工作流目标

GitHub Actions 需要完成两类任务：

- 普通分支和 PR：安装依赖、类型检查、构建验证。
- 版本 tag：在 macOS 和 Windows runner 上生成安装包，并发布到 GitHub Releases。

### 12.2 发布触发方式

建议使用 tag 触发：

```text
git tag v0.1.0
git push origin v0.1.0
```

触发后执行 release workflow。

### 12.3 release workflow 示例

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  build:
    name: Build ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, windows-latest]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build and publish
        run: pnpm dist --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

说明：

- `permissions.contents: write` 允许 workflow 创建或更新 Release。
- `GH_TOKEN` 使用 GitHub 自动注入的 `GITHUB_TOKEN`。
- macOS 构建 `.dmg`，Windows 构建 `.exe`。

## 13. 发布流程

首版建议发布流程：

1. 修改 `package.json` 中的 `version`。
2. 提交代码。
3. 创建版本 tag，例如 `v0.1.0`。
4. 推送 tag 到 GitHub。
5. GitHub Actions 自动构建 macOS 和 Windows 安装包。
6. GitHub Releases 自动生成或更新对应版本。
7. 用户从 Release 页面下载安装包。
8. 后续新版本发布后，已安装客户端通过 `electron-updater` 检测更新。

## 14. 环境变量与密钥

首版不需要额外配置密钥，使用 GitHub Actions 自带的 `GITHUB_TOKEN` 即可。

未来接入签名后，需要补充：

| 平台 | 需要的密钥 |
| --- | --- |
| macOS | Apple ID、App-specific password、Team ID、Developer ID certificate |
| Windows | Code signing certificate、证书密码 |

## 15. 风险与限制

| 风险 | 影响 | 当前处理 |
| --- | --- | --- |
| 无代码签名 | 安装时可能出现安全提示 | 首版接受，正式分发前补齐 |
| 自动更新未充分验证 | 不同平台体验可能不一致 | 先用测试 Release 验证 |
| 空仓库从零搭建 | 初始工程结构需要一次性确定 | 使用简单标准结构 |
| GitHub Release 分发 | 依赖公开或可访问的 GitHub 仓库 | 当前阶段接受 |

## 16. 后续实施计划

### 阶段一：工程初始化

- 初始化 `package.json`。
- 安装 Electron、Vite、React、TypeScript。
- 配置 `pnpm`。
- 创建主进程、preload、renderer 基础结构。
- 实现 Hello World 页面。

### 阶段二：本地构建

- 配置 TypeScript。
- 配置 Vite。
- 配置 electron-builder。
- 确认 `pnpm dev` 可启动。
- 确认 `pnpm dist` 可生成本机安装包。

### 阶段三：CI/CD

- 新增 GitHub Actions release workflow。
- 使用 tag 触发 macOS 和 Windows 构建。
- 自动上传安装包到 GitHub Releases。

### 阶段四：自动更新

- 引入 `electron-updater`。
- 主进程启动后检查更新。
- 验证新旧版本之间的升级流程。
- 记录无签名环境下的问题和限制。

### 阶段五：正式分发准备

- 接入 macOS 代码签名和 notarization。
- 接入 Windows 代码签名。
- 优化自动更新 UI。
- 补充错误上报和基础日志。

## 17. 首版完成标准

当以下条件满足时，Windhoox 验证版可以认为完成：

- 本地运行 `pnpm dev` 可以打开桌面应用。
- 页面显示 `Hello, Windhoox`。
- `pnpm dist` 可以在本机生成安装包。
- 推送 `v*` tag 后，GitHub Actions 能在 macOS 和 Windows 上成功构建。
- GitHub Releases 中包含 `.dmg` 和 `.exe`。
- 安装后的应用可以启动并显示 Hello World 页面。
- 发布新版本后，应用具备检查更新的基础能力。

