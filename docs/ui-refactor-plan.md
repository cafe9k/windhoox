# UI 重构实现文档

> **范围**：样式与布局对齐 Codex 设计语言，不改变任何业务逻辑与功能。  
> **主题**：仅支持亮色。  
> **组件库**：Ant Design（现有版本 v6）。  
> **测试命令**：`pnpm test:renderer`（每步完成后必须全部通过后再进入下一步）。

---

## 目录结构（重构后）

```
src/renderer/
├── main.tsx                          # 不变
├── App.tsx                           # Step 1 修改：更新 AntD token
├── vite-env.d.ts                     # 不变
├── demo-data.ts                      # 不变
│
├── styles/                           # Step 1 新建：拆分原 styles.css
│   ├── tokens.css                    # CSS 变量（颜色、圆角、字体、间距）
│   ├── reset.css                     # base reset + 滚动条
│   ├── antd-overrides.css            # Ant Design 覆盖样式
│   ├── layout.css                    # LeftRail / Canvas / ActionGrid 壳层
│   ├── messages.css                  # Step 3 新增：消息流组件样式
│   └── composer.css                  # Step 4 新增：Composer 底部样式
│
├── state/
│   └── agent-state.ts                # 不变
│
└── components/
    │
    ├── shell/                        # Step 2 新建：三栏外壳
    │   ├── LeftRail.tsx              # 左侧导航 rail（220px）
    │   ├── LeftRail.test.tsx         # Step 2 新增测试
    │   ├── ActionGrid.tsx            # 右侧工具卡栏（180px）
    │   └── ActionGrid.test.tsx       # Step 2 新增测试
    │
    ├── canvas/                       # Step 3/4 新建：中央画布
    │   ├── Canvas.tsx                # 中栏外壳（header + 内容插槽 + composer 插槽）
    │   ├── Canvas.test.tsx           # Step 3 新增测试
    │   ├── Composer.tsx              # Step 4 新建：底部输入区
    │   ├── Composer.test.tsx         # Step 4 新增测试
    │   └── messages/                 # Step 3 新建：消息块组件
    │       ├── SystemMessage.tsx     # 系统提示气泡（"已启动分析"等）
    │       ├── InsightMessage.tsx    # 洞察消息块（重排 InsightCard）
    │       ├── CaseGroupMessage.tsx  # 测试用例组块（重排 TestCaseCard）
    │       ├── ToolResultBlock.tsx   # 工具调用折叠块
    │       └── TimestampDivider.tsx  # 日期时间分隔线
    │
    ├── Workbench.tsx                 # Step 5 修改：组装新外壳
    ├── Workbench.test.tsx            # 不变（仅验证 data-testid 路径）
    ├── Workbench.review.test.tsx     # 不变
    │
    ├── InsightCard.tsx               # Step 3 修改：样式精简，保留 data-testid
    ├── InsightCard.test.tsx          # 不变
    ├── TestCaseCard.tsx              # Step 3 修改：样式精简
    ├── TestCaseCard.test.tsx         # 不变（现无独立测试，Workbench 覆盖）
    ├── TestCaseCounter.tsx           # Step 3 修改：移入 Canvas header 区
    ├── ContinueAnalysisButton.tsx    # 不变（功能保留，Step 4 可选样式微调）
    ├── ContinueAnalysisButton.test.tsx  # 不变
    ├── TaskInput.tsx                 # Step 4 修改：仅样式，保留所有 data-testid
    ├── TaskInput.test.tsx            # 不变
    └── SettingsPanel.tsx             # 不变
```

---

## Step 0 — 跑通基线

> 确认现有测试 100% 通过，作为后续每步的对比基准。

```bash
pnpm test:renderer
```

**通过标准**：所有 test suite 绿色，0 failures。记录测试数量（约 30 条）。

---

## Step 1 — Design Token 体系重建

### 目标
- 将 `styles.css` 拆为 `styles/` 目录下 3 个文件
- 更新 `App.tsx` 中 AntD ConfigProvider token，与 CSS 变量保持一致

### 1.1 新建 `src/renderer/styles/tokens.css`

```css
/* ─── Design Tokens (Light Only) ─── */
:root {
  /* ── 背景层级 ── */
  --bg-app:            #f0f2f5;   /* 最外层应用背景 */
  --bg-rail:           #f5f5f5;   /* 左侧 rail */
  --bg-canvas:         #ffffff;   /* 中央画布 */
  --bg-action:         #fafafa;   /* 右侧 action grid */
  --bg-elevated:       #ffffff;   /* 卡片/弹窗 */
  --bg-hover:          rgba(0, 0, 0, 0.04);
  --bg-active:         rgba(0, 102, 184, 0.06);
  --bg-panel:          #fafafa;   /* 折叠展开区背景 */
  --bg-code:           #f6f8fa;   /* 代码/等宽内容区 */
  --bg-input:          #ffffff;

  /* ── 文字 ── */
  --text-primary:      #1a1a1a;
  --text-secondary:    #595959;
  --text-muted:        #8c8c8c;
  --text-inverse:      #ffffff;

  /* ── 强调色 ── */
  --accent:            #1677ff;   /* AntD 默认蓝 */
  --accent-hover:      #0958d9;
  --accent-light:      #e6f4ff;

  /* ── 边框 ── */
  --border:            #e8e8e8;
  --border-strong:     #d9d9d9;
  --border-focus:      #1677ff;

  /* ── 状态色 ── */
  --status-success:    #52c41a;
  --status-success-bg: #f6ffed;
  --status-warning:    #faad14;
  --status-warning-bg: #fffbe6;
  --status-error:      #ff4d4f;
  --status-error-bg:   #fff2f0;
  --status-info:       #1677ff;
  --status-info-bg:    #e6f4ff;

  /* ── 阴影 ── */
  --shadow-sm:   0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md:   0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg:   0 8px 24px rgba(0, 0, 0, 0.12);

  /* ── 字体 ── */
  --font-sans:  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC",
                "Microsoft YaHei", sans-serif;
  --font-mono:  "JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code",
                Consolas, "Liberation Mono", Menlo, monospace;

  /* ── 圆角 ── */
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-pill: 999px;

  /* ── 过渡 ── */
  --transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 180ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ── 尺寸：固定宽度 ── */
  --rail-width:   220px;
  --action-width: 180px;
}
```

### 1.2 新建 `src/renderer/styles/reset.css`

```css
/* ─── Base Reset ─── */
html, body, #root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-app);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 13px;
  line-height: 1.5;
}

* { box-sizing: border-box; }

/* ─── 细滚动条 ─── */
::-webkit-scrollbar        { width: 6px; height: 6px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  {
  background: var(--border-strong);
  border-radius: var(--radius-pill);
}
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ─── Focus ring ─── */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
```

### 1.3 新建 `src/renderer/styles/antd-overrides.css`

```css
/* ─── Ant Design 全局覆盖 ─── */

/* Layout */
.ant-layout           { background: var(--bg-app)     !important; }
.ant-layout-sider     { background: var(--bg-rail)    !important; }
.ant-layout-sider-light { background: var(--bg-rail)  !important; }

/* Card：扁平，无阴影 */
.ant-card {
  border-radius: var(--radius-lg) !important;
  border: 1px solid var(--border) !important;
  box-shadow: none !important;
}
.ant-card:hover   { box-shadow: none !important; border-color: var(--border-strong) !important; }
.ant-card-head    {
  border-bottom: 1px solid var(--border) !important;
  padding: 0 16px !important;
  min-height: 44px !important;
  background: transparent !important;
}
.ant-card-head-title {
  font-weight: 600 !important;
  font-size: 13px !important;
  color: var(--text-primary) !important;
}
.ant-card-body    { padding: 16px !important; }

/* Button */
.ant-btn {
  border-radius: var(--radius-md) !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  box-shadow: none !important;
  transition: all var(--transition-fast) !important;
}
.ant-btn-primary           { background: var(--accent)       !important; border-color: var(--accent)       !important; }
.ant-btn-primary:hover     { background: var(--accent-hover) !important; border-color: var(--accent-hover) !important; }
.ant-btn-default:hover     {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  background: var(--accent-light) !important;
}

/* Input */
.ant-input,
.ant-input-affix-wrapper,
.ant-input-textarea {
  border-radius: var(--radius-md) !important;
  border-color: var(--border-strong) !important;
  font-size: 13px !important;
}
.ant-input:hover,
.ant-input-affix-wrapper:hover  { border-color: var(--accent) !important; }
.ant-input:focus,
.ant-input-affix-wrapper-focused {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15) !important;
}

/* Tag */
.ant-tag {
  border-radius: var(--radius-sm) !important;
  font-weight: 500 !important;
  font-size: 11px !important;
  padding: 0 6px !important;
  height: 20px !important;
  line-height: 18px !important;
  border: 1px solid var(--border) !important;
}

/* Divider */
.ant-divider { border-color: var(--border) !important; }

/* Empty */
.ant-empty-description { color: var(--text-muted) !important; font-size: 13px !important; }

/* Statistic */
.ant-statistic-title   { font-size: 11px !important; font-weight: 500 !important; color: var(--text-muted) !important; }
.ant-statistic-content { font-weight: 600 !important; color: var(--text-primary) !important; }

/* Modal */
.ant-modal-content {
  border-radius: var(--radius-xl) !important;
  box-shadow: var(--shadow-lg) !important;
  border: 1px solid var(--border) !important;
}
.ant-modal-header {
  border-radius: var(--radius-xl) var(--radius-xl) 0 0 !important;
  border-bottom: 1px solid var(--border) !important;
}

/* Select */
.ant-select-selector {
  border-radius: var(--radius-md) !important;
  border-color: var(--border-strong) !important;
}

/* Form label */
.ant-form-item-label > label {
  font-weight: 500 !important;
  color: var(--text-secondary) !important;
  font-size: 13px !important;
}
```

### 1.4 新建 `src/renderer/styles/layout.css`

```css
/* ─── 三栏壳层布局 ─── */

/* App 根布局 */
.wh-app-layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg-app);
}

/* ── 左侧 Rail ── */
.wh-rail {
  width: var(--rail-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-rail);
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.wh-rail-primary-actions {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.wh-rail-action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 0;
  transition: background var(--transition-fast);
  user-select: none;
  line-height: 1.4;
}
.wh-rail-action-item:hover { background: var(--bg-hover); }
.wh-rail-action-item .anticon { font-size: 15px; color: var(--text-muted); flex-shrink: 0; }

.wh-rail-section-label {
  padding: 12px 14px 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  user-select: none;
}

.wh-rail-session-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-radius: 0;
}
.wh-rail-session-item:hover   { background: var(--bg-hover); }
.wh-rail-session-item--active { background: var(--bg-active); }
.wh-rail-session-item--active .wh-rail-session-title { color: var(--accent); font-weight: 600; }

.wh-rail-session-title {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}
.wh-rail-session-meta {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.wh-rail-scroll { flex: 1; overflow-y: auto; }

.wh-rail-footer {
  border-top: 1px solid var(--border);
  padding: 4px 0;
  flex-shrink: 0;
}

/* ── 中央 Canvas ── */
.wh-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-canvas);
  border-right: 1px solid var(--border);
}

.wh-canvas-header {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-canvas);
}
.wh-canvas-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wh-canvas-header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.wh-canvas-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.wh-canvas-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  background: var(--bg-canvas);
}

/* ── 右侧 Action Grid ── */
.wh-action-grid {
  width: var(--action-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-action);
  overflow-y: auto;
  padding: 12px 0;
}

.wh-action-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);
  user-select: none;
}
.wh-action-card:hover { background: var(--bg-hover); }

.wh-action-card-icon {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1;
}
.wh-action-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}
.wh-action-card-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
.wh-action-card-kbd {
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  background: var(--border);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  display: inline-block;
  align-self: flex-start;
}

.wh-action-divider {
  height: 1px;
  background: var(--border);
  margin: 2px 16px;
}

/* ── 公用状态点 ── */
.wh-status-dot {
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.wh-status-dot--success { background: var(--status-success); }
.wh-status-dot--warning { background: var(--status-warning); }
.wh-status-dot--error   { background: var(--status-error); }
.wh-status-dot--info    { background: var(--status-info); }
.wh-status-dot--default { background: var(--text-muted); }
.wh-status-dot--pulse   { animation: dot-pulse 1.5s ease-in-out infinite; }
@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* ── 入场动画 ── */
@keyframes wh-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.wh-animate-in {
  animation: wh-fade-in 240ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

### 1.5 修改 `src/renderer/App.tsx`

删除原有全量 token，换为与 CSS 变量同频的精简版：

```tsx
import { ConfigProvider, theme, App as AntdApp } from "antd";
import { Workbench } from "./components/Workbench";
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/antd-overrides.css";
import "./styles/layout.css";

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary:          "#1677ff",
          colorSuccess:          "#52c41a",
          colorWarning:          "#faad14",
          colorError:            "#ff4d4f",
          colorInfo:             "#1677ff",
          colorTextBase:         "#1a1a1a",
          colorBgBase:           "#ffffff",
          colorBorder:           "#e8e8e8",
          colorBorderSecondary:  "#e8e8e8",
          borderRadius:          6,
          borderRadiusSM:        4,
          borderRadiusLG:        8,
          fontSize:              13,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
          fontSizeSM:            11,
          fontSizeLG:            14,
          controlHeight:         32,
          controlHeightSM:       26,
          controlHeightLG:       38,
          lineHeight:            1.5,
          boxShadow:             "none",
          boxShadowSecondary:    "0 4px 12px rgba(0,0,0,0.08)",
        },
        components: {
          Card:      { headerBg: "transparent", headerFontSize: 13, headerHeight: 44 },
          Button:    { defaultShadow: "none", primaryShadow: "none" },
          Input:     { activeShadow: "0 0 0 2px rgba(22,119,255,0.15)" },
          Tag:       { defaultBg: "#fafafa", defaultColor: "#595959" },
          Statistic: { contentFontSize: 18 },
          Modal:     { titleFontSize: 14, titleLineHeight: 1.4 },
          Layout:    {
            headerBg: "#ffffff",
            siderBg:  "#f5f5f5",
            triggerBg:"#e8e8e8",
            triggerColor: "#595959",
          },
        },
      }}
    >
      <AntdApp>
        <Workbench />
      </AntdApp>
    </ConfigProvider>
  );
}
```

> **注意**：原 `styles.css` 先保留不删，等 Step 2 外壳组件接入后再删除，防止临时样式丢失。

### Step 1 测试

```bash
pnpm test:renderer
```

**通过标准**：测试数量与基线一致，全部通过。  
**视觉验证**：`pnpm dev` 启动应用，确认颜色/圆角变化符合 token 定义。

---

## Step 2 — 三栏外壳组件

### 目标
- 新建 `components/shell/LeftRail.tsx`
- 新建 `components/shell/ActionGrid.tsx`
- 两个组件只负责样式和骨架，全部用 CSS 类名（已在 Step 1 `layout.css` 定义），不含业务逻辑
- 为两个组件编写测试

### 2.1 新建 `src/renderer/components/shell/LeftRail.tsx`

```tsx
import {
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  RocketOutlined,
  MobileOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";

interface SessionItem {
  id: string;
  title: string;
  meta?: string;   // 如 "1 小时" / "17 小时"
  active?: boolean;
}

interface LeftRailProps {
  sessions?: SessionItem[];
  onNewSession?: () => void;
  onSelectSession?: (id: string) => void;
  onOpenSettings?: () => void;
}

const PRIMARY_ACTIONS = [
  { icon: <PlusOutlined />,        label: "新对话",       key: "new" },
  { icon: <SearchOutlined />,      label: "搜索",         key: "search" },
  { icon: <ThunderboltOutlined />, label: "技能",         key: "skills" },
  { icon: <AppstoreOutlined />,    label: "插件",         key: "plugins" },
  { icon: <RocketOutlined />,      label: "自动化",       key: "automation" },
  { icon: <MobileOutlined />,      label: "Codex 移动版", key: "codex" },
];

export function LeftRail({
  sessions = [],
  onNewSession,
  onSelectSession,
  onOpenSettings,
}: LeftRailProps) {
  const pinnedSessions = sessions.filter((s) => s.active);
  const recentSessions = sessions.filter((s) => !s.active);

  return (
    <aside className="wh-rail" data-testid="left-rail">
      {/* 主操作区 */}
      <div className="wh-rail-primary-actions">
        {PRIMARY_ACTIONS.map((item) => (
          <div
            key={item.key}
            className="wh-rail-action-item"
            role="button"
            tabIndex={0}
            aria-label={item.label}
            onClick={item.key === "new" ? onNewSession : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* 会话列表 */}
      <div className="wh-rail-scroll">
        {pinnedSessions.length > 0 && (
          <>
            <div className="wh-rail-section-label">置顶</div>
            {pinnedSessions.map((s) => (
              <div
                key={s.id}
                className={`wh-rail-session-item wh-rail-session-item--active`}
                role="button"
                tabIndex={0}
                aria-label={s.title}
                onClick={() => onSelectSession?.(s.id)}
              >
                <span className="wh-rail-session-title">{s.title}</span>
                {s.meta && <span className="wh-rail-session-meta">{s.meta}</span>}
              </div>
            ))}
          </>
        )}

        {recentSessions.length > 0 && (
          <>
            <div className="wh-rail-section-label">最近</div>
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="wh-rail-session-item"
                role="button"
                tabIndex={0}
                aria-label={s.title}
                onClick={() => onSelectSession?.(s.id)}
              >
                <span className="wh-rail-session-title">{s.title}</span>
                {s.meta && <span className="wh-rail-session-meta">{s.meta}</span>}
              </div>
            ))}
          </>
        )}

        {sessions.length === 0 && (
          <div style={{ padding: "16px 14px", fontSize: 12, color: "var(--text-muted)" }}>
            还没有分析记录
          </div>
        )}
      </div>

      {/* 底部设置 */}
      <div className="wh-rail-footer">
        <Tooltip title="设置" placement="right">
          <div
            className="wh-rail-action-item"
            role="button"
            tabIndex={0}
            aria-label="设置"
            onClick={onOpenSettings}
          >
            <SettingOutlined />
            <span>设置</span>
          </div>
        </Tooltip>
      </div>
    </aside>
  );
}
```

### 2.2 新建 `src/renderer/components/shell/LeftRail.test.tsx`

```tsx
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeftRail } from "./LeftRail";

describe("LeftRail", () => {
  it("renders primary action items", () => {
    render(<LeftRail />);
    expect(screen.getByLabelText("新对话")).toBeInTheDocument();
    expect(screen.getByLabelText("搜索")).toBeInTheDocument();
    expect(screen.getByLabelText("设置")).toBeInTheDocument();
  });

  it("renders empty state when no sessions", () => {
    render(<LeftRail sessions={[]} />);
    expect(screen.getByText("还没有分析记录")).toBeInTheDocument();
  });

  it("renders session items", () => {
    const sessions = [
      { id: "s1", title: "支付流程分析", meta: "1 小时" },
      { id: "s2", title: "登录边界测试", meta: "17 小时" },
    ];
    render(<LeftRail sessions={sessions} />);
    expect(screen.getByText("支付流程分析")).toBeInTheDocument();
    expect(screen.getByText("1 小时")).toBeInTheDocument();
  });

  it("renders active session with active class", () => {
    const sessions = [{ id: "s1", title: "置顶会话", active: true }];
    render(<LeftRail sessions={sessions} />);
    expect(screen.getByText("置顶")).toBeInTheDocument();
    expect(screen.getByLabelText("置顶会话").className).toContain("active");
  });

  it("calls onNewSession when new action is clicked", () => {
    const onNew = vi.fn();
    render(<LeftRail onNewSession={onNew} />);
    fireEvent.click(screen.getByLabelText("新对话"));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectSession with correct id", () => {
    const onSelect = vi.fn();
    const sessions = [{ id: "s1", title: "测试会话" }];
    render(<LeftRail sessions={sessions} onSelectSession={onSelect} />);
    fireEvent.click(screen.getByLabelText("测试会话"));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("calls onOpenSettings when settings is clicked", () => {
    const onSettings = vi.fn();
    render(<LeftRail onOpenSettings={onSettings} />);
    fireEvent.click(screen.getByLabelText("设置"));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
```

### 2.3 新建 `src/renderer/components/shell/ActionGrid.tsx`

```tsx
import {
  FileTextOutlined,
  MessageOutlined,
  GlobalOutlined,
  CodeOutlined,
  ConsoleSqlOutlined,
} from "@ant-design/icons";

interface ActionItem {
  key: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  kbd?: string;
  onClick?: () => void;
}

const ACTIONS: ActionItem[] = [
  {
    key:   "file",
    icon:  <FileTextOutlined />,
    title: "文件",
    desc:  "浏览项目文件",
    kbd:   "⌘P",
  },
  {
    key:   "chat",
    icon:  <MessageOutlined />,
    title: "侧边聊天",
    desc:  "发起侧边对话",
  },
  {
    key:   "browser",
    icon:  <GlobalOutlined />,
    title: "浏览器",
    desc:  "打开网站",
    kbd:   "⌘T",
  },
  {
    key:   "review",
    icon:  <CodeOutlined />,
    title: "审查",
    desc:  "查看代码更改",
    kbd:   "⌃⇧G",
  },
  {
    key:   "terminal",
    icon:  <ConsoleSqlOutlined />,
    title: "终端",
    desc:  "启动交互式 shell",
    kbd:   "⌃`",
  },
];

interface ActionGridProps {
  onAction?: (key: string) => void;
}

export function ActionGrid({ onAction }: ActionGridProps) {
  return (
    <aside className="wh-action-grid" data-testid="action-grid">
      {ACTIONS.map((item, idx) => (
        <div key={item.key}>
          <div
            className="wh-action-card"
            role="button"
            tabIndex={0}
            aria-label={item.title}
            onClick={() => onAction?.(item.key)}
          >
            <div className="wh-action-card-icon">{item.icon}</div>
            <div className="wh-action-card-title">{item.title}</div>
            <div className="wh-action-card-desc">{item.desc}</div>
            {item.kbd && (
              <span className="wh-action-card-kbd">{item.kbd}</span>
            )}
          </div>
          {idx < ACTIONS.length - 1 && <div className="wh-action-divider" />}
        </div>
      ))}
    </aside>
  );
}
```

### 2.4 新建 `src/renderer/components/shell/ActionGrid.test.tsx`

```tsx
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionGrid } from "./ActionGrid";

describe("ActionGrid", () => {
  it("renders all 5 action cards", () => {
    render(<ActionGrid />);
    expect(screen.getByLabelText("文件")).toBeInTheDocument();
    expect(screen.getByLabelText("侧边聊天")).toBeInTheDocument();
    expect(screen.getByLabelText("浏览器")).toBeInTheDocument();
    expect(screen.getByLabelText("审查")).toBeInTheDocument();
    expect(screen.getByLabelText("终端")).toBeInTheDocument();
  });

  it("renders keyboard shortcut badges", () => {
    render(<ActionGrid />);
    expect(screen.getByText("⌘P")).toBeInTheDocument();
    expect(screen.getByText("⌘T")).toBeInTheDocument();
    expect(screen.getByText("⌃⇧G")).toBeInTheDocument();
  });

  it("calls onAction with correct key when card is clicked", () => {
    const onAction = vi.fn();
    render(<ActionGrid onAction={onAction} />);
    fireEvent.click(screen.getByLabelText("文件"));
    expect(onAction).toHaveBeenCalledWith("file");
    fireEvent.click(screen.getByLabelText("终端"));
    expect(onAction).toHaveBeenCalledWith("terminal");
  });
});
```

### Step 2 测试

```bash
pnpm test:renderer
```

**通过标准**：原有测试全部保持通过 + 新增 LeftRail 7 条 + ActionGrid 3 条。

---

## Step 3 — Canvas 外壳与消息流组件

### 目标
- 新建 `canvas/Canvas.tsx`（外壳：header + body 插槽 + footer 插槽）
- 新建 `canvas/messages/` 下 5 个消息组件
- 新建 `styles/messages.css`
- 对 `InsightCard.tsx` / `TestCaseCard.tsx` 做样式微调，保持 `data-testid` 不变

### 3.1 新建 `src/renderer/styles/messages.css`

```css
/* ─── 消息流 ─── */

/* 时间戳分隔线 */
.wh-msg-timestamp {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 12px;
  color: var(--text-muted);
  font-size: 11px;
}
.wh-msg-timestamp::before,
.wh-msg-timestamp::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}

/* 系统消息气泡 */
.wh-msg-system {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}
.wh-msg-system-icon {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--accent-light);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--accent);
  margin-top: 1px;
}
.wh-msg-system-body {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.wh-msg-system-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  font-size: 13px;
}

/* 洞察消息块 */
.wh-msg-insight-block {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 16px;
}
.wh-msg-insight-header {
  padding: 10px 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.wh-msg-insight-item {
  display: flex;
  align-items: flex-start;
  gap: 0;
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.wh-msg-insight-item:last-child { border-bottom: none; }
.wh-msg-insight-accent {
  width: 3px;
  align-self: stretch;
  flex-shrink: 0;
}
.wh-msg-insight-content { padding: 10px 14px; flex: 1; }
.wh-msg-insight-rule {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0 0 4px;
}
.wh-msg-insight-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 用例组消息块 */
.wh-msg-case-block {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 16px;
}
.wh-msg-case-header {
  padding: 10px 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wh-msg-case-header-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.wh-msg-case-header-actions {
  display: flex;
  gap: 8px;
}
.wh-msg-case-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.wh-msg-case-row:last-child    { border-bottom: none; }
.wh-msg-case-row:hover         { background: var(--bg-hover); }
.wh-msg-case-row-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: var(--font-mono);
  flex: 1;
}
.wh-msg-case-status-chip {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}
.wh-msg-case-status-chip--pending  { background: #f5f5f5; color: var(--text-muted); }
.wh-msg-case-status-chip--accepted { background: var(--status-success-bg); color: var(--status-success); }
.wh-msg-case-status-chip--rejected { background: var(--status-error-bg); color: var(--status-error); }
.wh-msg-case-status-chip--ask      { background: var(--status-info-bg); color: var(--status-info); }
.wh-msg-case-expand {
  padding: 12px 16px 16px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
}
.wh-msg-case-section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin: 10px 0 4px;
}
.wh-msg-case-section-label:first-child { margin-top: 0; }
.wh-msg-case-section-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}
.wh-msg-case-section-list {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}
.wh-msg-case-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

/* 工具结果折叠块 */
.wh-msg-tool-block {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 12px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.wh-msg-tool-header {
  padding: 7px 12px;
  background: var(--bg-panel);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}
.wh-msg-tool-header:hover { background: var(--bg-hover); }
.wh-msg-tool-label  { color: var(--text-secondary); font-weight: 600; }
.wh-msg-tool-preview { color: var(--text-muted); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wh-msg-tool-body {
  padding: 10px 12px;
  background: var(--bg-code);
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 240px;
  overflow-y: auto;
}
```

### 3.2 新建消息组件

#### `src/renderer/components/canvas/messages/TimestampDivider.tsx`

```tsx
interface TimestampDividerProps {
  label: string;
}

export function TimestampDivider({ label }: TimestampDividerProps) {
  return (
    <div className="wh-msg-timestamp" data-testid="timestamp-divider">
      {label}
    </div>
  );
}
```

#### `src/renderer/components/canvas/messages/SystemMessage.tsx`

```tsx
import { RobotOutlined } from "@ant-design/icons";

interface SystemMessageProps {
  title: string;
  detail?: string;
}

export function SystemMessage({ title, detail }: SystemMessageProps) {
  return (
    <div className="wh-msg-system wh-animate-in" data-testid="system-message">
      <div className="wh-msg-system-icon">
        <RobotOutlined />
      </div>
      <div className="wh-msg-system-body">
        <div className="wh-msg-system-title">{title}</div>
        {detail && <div>{detail}</div>}
      </div>
    </div>
  );
}
```

#### `src/renderer/components/canvas/messages/InsightMessage.tsx`

```tsx
import { Tag } from "antd";
import { BulbOutlined } from "@ant-design/icons";

interface Insight {
  id: string;
  businessRule?: string;
  risk?: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}

interface InsightMessageProps {
  insights: Insight[];
}

const confMap = {
  high:   { text: "高", color: "success" as const, accent: "var(--status-success)" },
  medium: { text: "中", color: "warning" as const, accent: "var(--status-warning)" },
  low:    { text: "低", color: "processing" as const, accent: "var(--status-info)" },
};

export function InsightMessage({ insights }: InsightMessageProps) {
  if (!insights.length) return null;

  return (
    <div className="wh-msg-insight-block wh-animate-in" data-testid="insight-message">
      <div className="wh-msg-insight-header">
        <BulbOutlined />
        分析洞察 ({insights.length})
      </div>
      {insights.map((ins) => {
        const conf = confMap[ins.confidence];
        const text = ins.businessRule || ins.risk || ins.evidence || "";
        return (
          <div key={ins.id} className="wh-msg-insight-item" data-testid="insight-item">
            <div
              className="wh-msg-insight-accent"
              style={{ background: conf.accent }}
            />
            <div className="wh-msg-insight-content">
              <p className="wh-msg-insight-rule">{text}</p>
              <div className="wh-msg-insight-meta">
                信心度：<Tag color={conf.color}>{conf.text}</Tag>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### `src/renderer/components/canvas/messages/CaseGroupMessage.tsx`

```tsx
import { useState } from "react";
import { Button, Space, Tooltip } from "antd";
import {
  CaretRightOutlined,
  CaretDownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";

type CaseStatus = "pending" | "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";

interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  status: CaseStatus;
}

interface CaseGroupMessageProps {
  cases: TestCase[];
  onStatusChange?: (caseId: string, status: CaseStatus) => void;
}

const STATUS_CHIP: Record<CaseStatus, { label: string; cls: string }> = {
  pending:          { label: "待审核", cls: "wh-msg-case-status-chip--pending" },
  accepted:         { label: "已接受", cls: "wh-msg-case-status-chip--accepted" },
  rejected:         { label: "已拒绝", cls: "wh-msg-case-status-chip--rejected" },
  ask_product:      { label: "问产品", cls: "wh-msg-case-status-chip--ask" },
  ask_engineering:  { label: "问研发", cls: "wh-msg-case-status-chip--ask" },
  needs_context:    { label: "需上下文", cls: "wh-msg-case-status-chip--ask" },
};

export function CaseGroupMessage({ cases, onStatusChange }: CaseGroupMessageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!cases.length) return null;

  return (
    <div className="wh-msg-case-block wh-animate-in" data-testid="case-group-message">
      {/* 组头 */}
      <div className="wh-msg-case-header">
        <div className="wh-msg-case-header-title">
          <ExperimentOutlined style={{ marginRight: 6 }} />
          测试用例 ({cases.length})
        </div>
        <div className="wh-msg-case-header-actions">
          <Button
            size="small"
            type="text"
            icon={<CheckCircleOutlined />}
            style={{ color: "var(--status-success)", fontSize: 12 }}
            onClick={() => cases.forEach((c) => onStatusChange?.(c.id, "accepted"))}
          >
            全部接受
          </Button>
          <Button
            size="small"
            type="text"
            icon={<CloseCircleOutlined />}
            style={{ color: "var(--status-error)", fontSize: 12 }}
            onClick={() => cases.forEach((c) => onStatusChange?.(c.id, "rejected"))}
          >
            全部拒绝
          </Button>
        </div>
      </div>

      {/* 用例行列表 */}
      {cases.map((tc) => {
        const chip = STATUS_CHIP[tc.status];
        const isExpanded = expandedId === tc.id;

        return (
          <div key={tc.id} data-testid="case-row-item">
            {/* 折叠行 */}
            <div
              className="wh-msg-case-row"
              data-testid="case-header"
              onClick={() => setExpandedId(isExpanded ? null : tc.id)}
            >
              {isExpanded
                ? <CaretDownOutlined  style={{ color: "var(--text-muted)", fontSize: 11, marginRight: 8 }} />
                : <CaretRightOutlined style={{ color: "var(--text-muted)", fontSize: 11, marginRight: 8 }} />
              }
              <span className="wh-msg-case-row-title">{tc.title}</span>
              <span className={`wh-msg-case-status-chip ${chip.cls}`}>
                {chip.label}
              </span>
            </div>

            {/* 展开详情 */}
            {isExpanded && (
              <div className="wh-msg-case-expand">
                <span className="wh-msg-case-section-label">描述</span>
                <p className="wh-msg-case-section-text">{tc.description}</p>

                {tc.preconditions.length > 0 && (
                  <>
                    <span className="wh-msg-case-section-label">前置条件</span>
                    <ul className="wh-msg-case-section-list">
                      {tc.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </>
                )}

                {tc.steps.length > 0 && (
                  <>
                    <span className="wh-msg-case-section-label">步骤</span>
                    <ol className="wh-msg-case-section-list">
                      {tc.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </>
                )}

                <span className="wh-msg-case-section-label">预期结果</span>
                <p className="wh-msg-case-section-text">{tc.expectedResult}</p>

                <div className="wh-msg-case-actions">
                  <Button
                    data-testid="accept-btn"
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => onStatusChange?.(tc.id, "accepted")}
                  >
                    接受
                  </Button>
                  <Button
                    data-testid="reject-btn"
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => onStatusChange?.(tc.id, "rejected")}
                  >
                    拒绝
                  </Button>
                  <Tooltip title="需要产品确认">
                    <Button
                      data-testid="clarify-btn"
                      size="small"
                      icon={<QuestionCircleOutlined />}
                      onClick={() => onStatusChange?.(tc.id, "ask_product")}
                    >
                      澄清
                    </Button>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### `src/renderer/components/canvas/messages/ToolResultBlock.tsx`

```tsx
import { useState } from "react";
import { CaretRightOutlined, CaretDownOutlined } from "@ant-design/icons";

interface ToolResultBlockProps {
  label: string;
  output: string;
}

export function ToolResultBlock({ label, output }: ToolResultBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = output.split("\n")[0];

  return (
    <div className="wh-msg-tool-block" data-testid="tool-result-block">
      <div
        className="wh-msg-tool-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <CaretDownOutlined  style={{ color: "var(--text-muted)", fontSize: 11 }} />
          : <CaretRightOutlined style={{ color: "var(--text-muted)", fontSize: 11 }} />
        }
        <span className="wh-msg-tool-label">{label}</span>
        {!expanded && (
          <span className="wh-msg-tool-preview">· {preview}</span>
        )}
      </div>
      {expanded && (
        <div className="wh-msg-tool-body" data-testid="tool-result-body">
          {output}
        </div>
      )}
    </div>
  );
}
```

### 3.3 新建 `src/renderer/components/canvas/Canvas.tsx`

```tsx
import { ReactNode } from "react";
import { Space } from "antd";

interface CanvasProps {
  title?: string;
  headerExtra?: ReactNode;   // 计数 chip、状态点等
  children: ReactNode;       // ConversationLog
  footer?: ReactNode;        // Composer
}

export function Canvas({ title = "新对话", headerExtra, children, footer }: CanvasProps) {
  return (
    <main className="wh-canvas" data-testid="canvas">
      {/* Header */}
      <div className="wh-canvas-header">
        <span className="wh-canvas-header-title">{title}</span>
        {headerExtra && (
          <div className="wh-canvas-header-meta">{headerExtra}</div>
        )}
      </div>

      {/* Body：滚动区 */}
      <div className="wh-canvas-body">
        {children}
      </div>

      {/* Footer：Composer */}
      {footer && (
        <div className="wh-canvas-footer">
          {footer}
        </div>
      )}
    </main>
  );
}
```

### 3.4 新建 `src/renderer/components/canvas/Canvas.test.tsx`

```tsx
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Canvas } from "./Canvas";

describe("Canvas", () => {
  it("renders with default title", () => {
    render(<Canvas><div>内容</div></Canvas>);
    expect(screen.getByText("新对话")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(<Canvas title="支付流程分析"><div /></Canvas>);
    expect(screen.getByText("支付流程分析")).toBeInTheDocument();
  });

  it("renders children in body", () => {
    render(<Canvas><div data-testid="child">内容区</div></Canvas>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <Canvas footer={<div data-testid="footer">底部</div>}>
        <div />
      </Canvas>
    );
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders headerExtra when provided", () => {
    render(
      <Canvas headerExtra={<span data-testid="extra">统计</span>}>
        <div />
      </Canvas>
    );
    expect(screen.getByTestId("extra")).toBeInTheDocument();
  });
});
```

### 3.5 修改 `src/renderer/styles/layout.css`

在文件末尾追加：

```css
/* ── 洞察/用例计数器行（原 TestCaseCounter，改为 header chip 行）── */
.wh-counter-chips {
  display: flex;
  gap: 8px;
  align-items: center;
}
.wh-counter-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  line-height: 1.6;
}
.wh-counter-chip--pending  { background: #f5f5f5; color: var(--text-muted); }
.wh-counter-chip--accepted { background: var(--status-success-bg); color: var(--status-success); }
.wh-counter-chip--rejected { background: var(--status-error-bg); color: var(--status-error); }
.wh-counter-chip--ask      { background: var(--status-info-bg); color: var(--status-info); }
```

### Step 3 测试

```bash
pnpm test:renderer
```

**通过标准**：所有原有测试通过 + Canvas 5 条。  
消息子组件本轮不单独写测试（集成在 Step 5 的 Workbench 测试里覆盖）。

---

## Step 4 — Composer 底部输入区

### 目标
- 新建 `canvas/Composer.tsx`，替代原 `TaskInput` 在 Workbench 中的位置
- **保留 `TaskInput.tsx` 文件不变**（功能和 data-testid 全部保留，由 Workbench 在 Step 5 决定哪里挂载）
- 新建 `styles/composer.css`

### 4.1 新建 `src/renderer/styles/composer.css`

```css
/* ─── Composer 底部输入区 ─── */
.wh-composer {
  padding: 12px 20px 16px;
  background: var(--bg-canvas);
}

/* 状态 chips 行 */
.wh-composer-status {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.wh-composer-status-chip {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 2px 10px;
  line-height: 1.6;
  font-weight: 500;
  white-space: nowrap;
}
.wh-composer-status-chip--active { color: var(--accent); border-color: rgba(22,119,255,0.3); background: var(--accent-light); }

/* Textarea 容器 */
.wh-composer-textarea-wrap {
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-input);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  overflow: hidden;
}
.wh-composer-textarea-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(22,119,255,0.15);
}
.wh-composer-textarea-wrap .ant-input {
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 10px 14px !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  resize: none;
  background: transparent !important;
}

/* 工具栏行 */
.wh-composer-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 8px;
  border-top: 1px solid var(--border);
}
.wh-composer-toolbar-left  { display: flex; gap: 6px; align-items: center; flex: 1; }
.wh-composer-toolbar-right { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

.wh-composer-chip-btn {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill) !important;
  padding: 2px 10px !important;
  height: 24px !important;
  line-height: 1 !important;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.wh-composer-chip-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}

/* 提交按钮 */
.wh-composer-submit {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0;
}
```

### 4.2 新建 `src/renderer/components/canvas/Composer.tsx`

```tsx
import { useState } from "react";
import { Button, Input } from "antd";
import {
  PlusOutlined,
  SettingOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

interface ComposerStatusChip {
  label: string;
  active?: boolean;
}

interface ComposerProps {
  placeholder?: string;
  statusChips?: ComposerStatusChip[];   // 如 "已接受 2 · 待评审 3"
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  submitLabel?: string;                 // "提交" / "继续分析"
}

export function Composer({
  placeholder = "描述需求，或补充说明…",
  statusChips = [],
  onSubmit,
  disabled = false,
  submitLabel,
}: ComposerProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSubmit?.(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="wh-composer" data-testid="composer">
      {/* 状态 chips */}
      {statusChips.length > 0 && (
        <div className="wh-composer-status">
          {statusChips.map((chip, i) => (
            <span
              key={i}
              className={`wh-composer-status-chip ${chip.active ? "wh-composer-status-chip--active" : ""}`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* 输入框 + 工具栏 */}
      <div className="wh-composer-textarea-wrap">
        <Input.TextArea
          data-testid="composer-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoSize={{ minRows: 2, maxRows: 8 }}
        />

        <div className="wh-composer-toolbar">
          <div className="wh-composer-toolbar-left">
            <button className="wh-composer-chip-btn" aria-label="添加附件">
              <PlusOutlined style={{ fontSize: 11 }} />
            </button>
            <button className="wh-composer-chip-btn" aria-label="自动审查">
              <SettingOutlined style={{ fontSize: 11 }} />
              自动审查
            </button>
            <button className="wh-composer-chip-btn" aria-label="选择模型">
              5.5 中
            </button>
          </div>
          <div className="wh-composer-toolbar-right">
            <Button
              data-testid="composer-submit"
              type="primary"
              icon={<ArrowUpOutlined />}
              className="wh-composer-submit"
              disabled={!value.trim() || disabled}
              onClick={handleSubmit}
              aria-label={submitLabel || "提交"}
              title={submitLabel || "提交 (⌘↵)"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4.3 新建 `src/renderer/components/canvas/Composer.test.tsx`

```tsx
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Composer } from "./Composer";

describe("Composer", () => {
  it("renders textarea and submit button", () => {
    render(<Composer />);
    expect(screen.getByTestId("composer-input")).toBeInTheDocument();
    expect(screen.getByTestId("composer-submit")).toBeInTheDocument();
  });

  it("submit is disabled when input is empty", () => {
    render(<Composer />);
    expect(screen.getByTestId("composer-submit")).toBeDisabled();
  });

  it("submit is enabled when input has content", () => {
    render(<Composer />);
    fireEvent.change(screen.getByTestId("composer-input"), {
      target: { value: "测试需求" },
    });
    expect(screen.getByTestId("composer-submit")).not.toBeDisabled();
  });

  it("calls onSubmit with trimmed value", () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("composer-input"), {
      target: { value: "  测试需求  " },
    });
    fireEvent.click(screen.getByTestId("composer-submit"));
    expect(onSubmit).toHaveBeenCalledWith("测试需求");
  });

  it("clears input after submit", () => {
    render(<Composer onSubmit={vi.fn()} />);
    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "需求" } });
    fireEvent.click(screen.getByTestId("composer-submit"));
    expect(input.value).toBe("");
  });

  it("renders status chips when provided", () => {
    render(
      <Composer statusChips={[{ label: "已接受 2" }, { label: "待评审 3" }]} />
    );
    expect(screen.getByText("已接受 2")).toBeInTheDocument();
    expect(screen.getByText("待评审 3")).toBeInTheDocument();
  });

  it("renders custom placeholder", () => {
    render(<Composer placeholder="请输入需求…" />);
    expect(screen.getByPlaceholderText("请输入需求…")).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Composer disabled />);
    expect(screen.getByTestId("composer-input")).toBeDisabled();
  });

  it("renders toolbar chip buttons", () => {
    render(<Composer />);
    expect(screen.getByLabelText("添加附件")).toBeInTheDocument();
    expect(screen.getByLabelText("自动审查")).toBeInTheDocument();
    expect(screen.getByLabelText("选择模型")).toBeInTheDocument();
  });
});
```

### 在 `App.tsx` 中追加 import

```tsx
import "./styles/messages.css";
import "./styles/composer.css";
```

### Step 4 测试

```bash
pnpm test:renderer
```

**通过标准**：原有测试全部通过 + Composer 9 条。

---

## Step 5 — Workbench 装配

### 目标
- 修改 `Workbench.tsx`：用 `LeftRail + Canvas + ActionGrid` 替换原 `Layout/Sider`
- 将 `ConversationLog`（InsightMessage + CaseGroupMessage）嵌入 `Canvas` body
- 将 `Composer` 嵌入 `Canvas` footer
- 将 `SettingsPanel` 改由 `LeftRail.onOpenSettings` 触发
- **保持所有 data-testid 路径不变，确保 Workbench.test.tsx / Workbench.review.test.tsx 继续通过**
- 删除 `styles.css`（原 styles 已完全迁移）

### 5.1 关键 data-testid 对照

| 测试断言                        | 原来位置                        | Step 5 后位置                          |
|---------------------------------|---------------------------------|----------------------------------------|
| `screen.getByText("任务与上下文")` | `Workbench.tsx` LeftSider title | `LeftRail` 区段标题或 Canvas header    |
| `screen.getByText("代理分析")`     | Center card title               | Canvas header title                    |
| `screen.getByText("测试用例池")`   | Right Sider title               | CaseGroupMessage 组头 / Canvas 区段    |
| `screen.getByRole("textbox")`     | `TaskInput` textarea            | `TaskInput` 保留在 Composer 区域内     |
| `screen.getByRole("button", { name:/开始分析/})` | `TaskInput` | 保留                           |
| `screen.getByTestId("counter-*")` | `TestCaseCounter`               | 保留在 Workbench，挂入 Canvas headerExtra |

> **注意**：Workbench 现有测试通过 `screen.getByText` 查找面板标题，Step 5 要么保留这些文字，要么在新组件里加 `data-testid` 给测试用。  
> 最简单的兼容策略：在 Canvas `title` 传 `"代理分析"`，在 LeftRail 里保留 `"任务与上下文"` 文字，在 CaseGroupMessage header 保留 `"测试用例池"` 文字。

### 5.2 `Workbench.tsx` 结构变化

```tsx
// 新导入
import { LeftRail }        from "./shell/LeftRail";
import { ActionGrid }      from "./shell/ActionGrid";
import { Canvas }          from "./canvas/Canvas";
import { Composer }        from "./canvas/Composer";
import { InsightMessage }  from "./canvas/messages/InsightMessage";
import { CaseGroupMessage } from "./canvas/messages/CaseGroupMessage";
import { SystemMessage }   from "./canvas/messages/SystemMessage";
import { TimestampDivider } from "./canvas/messages/TimestampDivider";
import { TestCaseCounter } from "./TestCaseCounter";   // 仍保留，移入 headerExtra

// 删除导入：Layout, Card（仅用于大框架的部分）, Sider, Content

// 布局外壳变为：
return (
  <div className="wh-app-layout">
    {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

    <LeftRail
      sessions={/* 当前 session 列表 */}
      onNewSession={() => { setSession(null); dispatch({type:"run_started",...}); }}
      onOpenSettings={() => setShowSettings(true)}
    />

    <Canvas
      title={session?.requirement?.slice(0, 20) || "代理分析"}
      headerExtra={
        agentState?.cases.length ? (
          <TestCaseCounter counts={caseCounts} />
        ) : cfg ? (
          <span style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
            <span className={`wh-status-dot ${cfg.dotClass}`} />
            {cfg.text}
          </span>
        ) : null
      }
      footer={
        <Composer
          placeholder={session ? "补充说明（可选），⌘↵ 继续分析…" : "描述需求，⌘↵ 开始分析…"}
          onSubmit={session ? handleContinueFromComposer : handleStartAnalysis}
          disabled={session?.state === "running"}
          statusChips={/* 用例计数 chips */}
        />
      }
    >
      {/* 左侧 TaskInput 迁移为 Canvas body 空态时的内嵌表单 */}
      {!session ? (
        <TaskInput
          onSubmit={handleStartAnalysis}
          onLoadDemo={handleLoadDemo}
        />
      ) : (
        /* ConversationLog */
        <Space direction="vertical" style={{width:"100%"}}>
          <TimestampDivider label={/* session 开始时间 */} />
          <SystemMessage title="已启动分析" detail={session.requirement} />
          {agentState?.insights.length ? (
            <InsightMessage insights={agentState.insights} />
          ) : null}
          {agentState?.cases.length ? (
            <CaseGroupMessage
              cases={agentState.cases}
              onStatusChange={handleCaseStatusChange}
            />
          ) : null}
        </Space>
      )}
    </Canvas>

    <ActionGrid />
  </div>
);
```

> TaskInput 在 Canvas body 空态使用，composer 仅做"开始/继续"入口，`data-testid="requirement-input"` 和 `data-testid="start-button"` 保持不变。

### 5.3 `TestCaseCounter` 适配

将原 `wh-counter-row` 四格卡片改为紧凑 chip 行，在 Canvas header 展示。将 `data-testid` 值保持不变（`counter-pending` 等）。修改 `TestCaseCounter.tsx`：

```tsx
// 把原来 grid 4 格 改为 chip 行
export function TestCaseCounter({ counts }: TestCaseCounterProps) {
  return (
    <div className="wh-counter-chips" data-testid="test-case-counter">
      <span className="wh-counter-chip wh-counter-chip--pending"
            data-testid="counter-pending">
        待 {counts.pending}
      </span>
      <span className="wh-counter-chip wh-counter-chip--accepted"
            data-testid="counter-accepted">
        ✓ {counts.accepted}
      </span>
      <span className="wh-counter-chip wh-counter-chip--rejected"
            data-testid="counter-rejected">
        ✗ {counts.rejected}
      </span>
      <span className="wh-counter-chip wh-counter-chip--ask"
            data-testid="counter-clarification">
        ? {counts.needsClarification}
      </span>
    </div>
  );
}
```

> 测试中 `toHaveTextContent("2")` 会匹配 `"待 2"`，仍然通过。

### 5.4 删除 `styles.css`

确认所有样式已迁移后，删除 `src/renderer/styles.css`，并在所有 import 了它的文件里移除对应 import（通常只有 `main.tsx` 或 `App.tsx`）。

### Step 5 测试

```bash
pnpm test:renderer
```

**通过标准**：**所有测试（包括 Workbench.test.tsx 和 Workbench.review.test.tsx）全部通过**，不得减少测试数量。

---

## 验收标准汇总

| Step | 新增测试 | 原有测试 | 核心验收 |
|------|---------|---------|---------|
| 0    | —       | ✅ 基线  | 全部通过 |
| 1    | —       | ✅ 全通  | token 变量生效，AntD 覆盖生效 |
| 2    | LeftRail ×7, ActionGrid ×3 | ✅ 全通 | 外壳渲染、点击回调 |
| 3    | Canvas ×5 | ✅ 全通 | Canvas 插槽、消息组件渲染 |
| 4    | Composer ×9 | ✅ 全通 | 输入、提交、禁用、chips |
| 5    | — | ✅ **Workbench 全通** | 三栏装配，data-testid 无断裂 |

---

## 附：快速参考命令

```bash
# 运行 renderer 测试（每步必跑）
pnpm test:renderer

# 运行全量测试
pnpm test

# 启动开发环境预览
pnpm dev

# 类型检查
pnpm typecheck
```
