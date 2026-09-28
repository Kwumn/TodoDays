# TodoDays 项目长期笔记

## 项目概况
- 本地桌面日程与 Todo 管理：Electron 37 + Vue3.5 + TypeScript 5.8 + node:sqlite（无原生编译）
- 入口：`npm run dev`（开发）/ `npm run build && npm start`（运行构建产物）
- 数据：`%APPDATA%/todo-days/todo-days.db`（WAL）；设置/提醒防重/安全副本均在同目录
- 用户偏好风格：简洁工具型、浅色商务、蓝灰主色、小圆角轻阴影；蓝色=选中、浅绿=完成、浅红=紧急

## 关键约定
- shared 层（types/ipc/date/repeat）为三端契约，改类型必须跑 `npm run typecheck`（tsc + vue-tsc 双检查）
- 重复日程模型：基准记录 + exception_dates + completed_dates + repeat_group_id；系列实例完成状态按日期记录
- 时间字符串统一 `YYYY-MM-DD HH:mm`，字典序即可比较
- 主进程对渲染层输入做防御性归一化（normalize*Input + 类型守卫）

## 环境坑（WorkBuddy 沙箱）
- 启动 Electron 前 `unset ELECTRON_RUN_AS_NODE`
- 沙箱内 GUI 需要 `--in-process-gpu --no-sandbox`；正常桌面环境不需要
- npm 可选依赖易缺失：缺 `@rollup/rollup-win32-x64-msvc` / `@esbuild/win32-x64` 时显式补装
- 打包：`npm run dist`（electron-builder + npmmirror 双镜像变量）；dependencies 已全部移至 devDependencies（运行时零 node_modules 依赖）
- 详细记录见 memory/2026-09-26.md、memory/2026-09-27.md
