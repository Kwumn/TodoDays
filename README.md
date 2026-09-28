# TodoDays · 本地桌面日程与待办管理

基于 **Electron + Vue3 + TypeScript + SQLite** 的本地桌面效率工具。无云端、无账号、数据 100% 留在本机。

![技术栈](https://img.shields.io/badge/Electron-37-blue) ![Vue](https://img.shields.io/badge/Vue-3.5-green) ![TS](https://img.shields.io/badge/TypeScript-5.8-blue)

## 功能总览

| 模块 | 能力 |
| --- | --- |
| **日历日程** | 月 / 周 / 日视图切换；今天高亮、日程色点；按时间排序；字段含标题、描述、起止时间、优先级、颜色标签、自定义标签、重复规则（每日/每周/每月）、提醒开关与提前量 |
| **重复日程** | 编辑单条实例（自动生成独立日程）、编辑整个系列、删除单条、删除整个序列 |
| **筛选** | 按标签 / 优先级 / 完成状态筛选日程 |
| **桌面提醒** | 到点弹出系统 Notification，可配提前分钟数，提示音可开关（WebAudio 合成，无需音频文件） |
| **即时待办** | 不绑定日期；勾选完成（划线 + 折叠）；手动拖拽 / 优先级 / 创建时间排序；多选批量删除、批量完成；标签筛选；统计（总数 / 已完成 / 未完成 / 完成率） |
| **今日视图** | 集中展示今日日程（进行中 / 即将开始 / 已完成分组）与当前待办 |
| **全局搜索** | 搜日程与待办的标题和描述，结果分类展示 |
| **数据管理** | JSON 导入 / 导出（合并策略）、SQLite 一键备份（VACUUM INTO 快照）、恢复备份（自动重启生效） |
| **设置** | 浅色 / 深色主题、默认视图、周起始（周一 / 周日）、提醒与提示音开关、标签管理、清除已完成待办 |

## 快速开始

```bash
npm install          # 首次安装（如缺 win32 可选依赖，补装 @rollup/rollup-win32-x64-msvc 与 @esbuild/win32-x64）
npm run dev          # 开发模式（热更新）
npm run build        # 产物构建到 out/
npm start            # 运行已构建产物
npm run typecheck    # 双端类型检查（tsc + vue-tsc）
```

数据目录：`%APPDATA%\todo-days\`（`todo-days.db` 为 SQLite 数据库，WAL 模式）。

## 项目结构

```
todo-days/
├── electron.vite.config.ts        # 三段构建配置（main / preload / renderer）
├── src/
│   ├── shared/                    # 主进程与渲染进程共享层（零依赖）
│   │   ├── types.ts               # 全部领域类型 + 类型守卫 + 常量
│   │   ├── ipc.ts                 # IPC 通道契约（TodoDaysApi 接口 + IpcChannel 常量）
│   │   ├── date.ts                # 本地日期工具（月网格 / 周起点 / 月份步进）
│   │   └── repeat.ts              # 重复规则展开（两端共用，保证提醒与日历一致）
│   ├── main/                      # Electron 主进程
│   │   ├── index.ts               # 生命周期、窗口、GPU 兼容开关
│   │   ├── db/
│   │   │   ├── connection.ts      # node:sqlite 连接、建表迁移、事务助手
│   │   │   ├── scheduleRepo.ts    # 日程 CRUD / 实例编辑 / 系列删除
│   │   │   ├── todoRepo.ts        # 待办 CRUD / 批量 / 重排 / 清除
│   │   │   ├── tagRepo.ts         # 标签 CRUD（级联解绑引用）
│   │   │   ├── settingsRepo.ts    # 设置单键 JSON 存取
│   │   │   └── dataService.ts     # JSON 导入导出、备份（VACUUM INTO）/ 恢复
│   │   ├── ipc/register.ts        # 全部 ipcMain.handle 统一注册
│   │   └── services/reminder.ts   # 20s 轮询扫描 → Notification + 推送渲染层
│   ├── preload/index.ts           # contextBridge 暴露类型安全 window.api
│   └── renderer/                  # Vue3 渲染进程
│       ├── index.html
│       └── src/
│           ├── main.ts / App.vue / router.ts
│           ├── styles/main.css    # 设计令牌（浅色 + 深色 CSS 变量）
│           ├── stores/            # Pinia：settings / schedule / todo / tag / search / ui
│           ├── views/             # Today / Calendar / Todo / Search / Settings
│           ├── components/        # Sidebar / TopBar / ScheduleDialog / TodoItem /
│           │                      # ScheduleItem / MonthGrid / WeekList / DayAgenda / …
│           └── composables/useReminders.ts
```

## TypeScript 设计要点

- **领域类型**：`Schedule`、`ScheduleInstance`（重复展开后的实例）、`Todo`、`Tag`、`Priority / RepeatRule / ViewMode / ThemeMode`（联合类型）、`AppSettings`、`SearchResult`、`ReminderPayload`、`ExportPayload`。
- **IPC 端到端类型**：`TodoDaysApi` 接口同时约束 preload 桥与渲染层调用，`window.api` 通过 `env.d.ts` 全局声明，调用点全部有类型。
- **类型守卫**：`isPriority` / `isRepeatRule` / `isDateTimeString` 用于 IPC 入参的防御性归一化（`normalizeScheduleInput` 等），主进程永不信任渲染层输入。
- **判别联合**：`ScheduleInstance extends Schedule` 增加 `date / isRecurring / completed`，同一份日程数据在月视图（紧凑）、周视图（卡片）、日视图（时间轴）间类型安全复用。
- **双 tsconfig**：`tsconfig.node.json`（主进程 + preload）与 `tsconfig.web.json`（渲染层 + Vue SFC），`vue-tsc` 全量检查。

## 数据库表结构（SQLite / node:sqlite 内置模块，零原生编译）

- `schedules`：含 `repeat_rule`、`exception_dates`（系列中被删除的日期）、`completed_dates`（按日完成状态）、`repeat_group_id`
- `todos`：含 `sort_order`（手动排序）、`completed_at`
- `tags` / `settings`（单键 JSON）/ `reminder_log`（已提醒记录，防重启重复提醒，7 天滚动清理）

## 状态管理方案（Pinia Setup Store）

- `scheduleStore`：持有全量日程，`instancesInRange(range)` 返回按筛选条件展开后的实例数组；写操作全部走 IPC 后回读
- `todoStore`：列表 + `sortedPending`（三种排序的 computed）+ 统计 + 多选集合
- `settingsStore`：设置读写并同步 `data-theme` 到 `<html>`，CSS 变量双主题即时切换
- `uiStore`：全局日程弹窗（新建 / 编辑 / 默认日期）与提醒 toast 队列

## 建议的开发顺序（复现路径）

1. shared 类型与日期 / 重复工具（先行定契约）
2. 主进程数据库连接 + 仓储 + IPC 注册
3. preload 桥 + 渲染层 Pinia store 对接
4. 布局骨架（Sidebar / TopBar / 路由）→ 日历三视图 → 日程弹窗
5. 待办列表（拖拽 / 多选）→ 今日 / 搜索 / 设置
6. 提醒轮询与系统通知 → 导入导出备份 → 主题

## 已知说明

- 默认禁用 GPU 硬件加速（兼容受限环境 / 远程桌面），设置 `TODO_DAYS_ENABLE_GPU=1` 可恢复
- 在某些被注入 `ELECTRON_RUN_AS_NODE=1` 的终端环境启动会失败，`unset ELECTRON_RUN_AS_NODE` 后正常运行
- 打包发布可在 `package.json` 中接入 `electron-builder`（当前未包含以保持安装轻量）
