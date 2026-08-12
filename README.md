# UI 控件与界面术语图鉴

一个面向中文用户的可交互 UI 术语网站。它不仅展示按钮、输入框、菜单等控件，也把 Windows 应用窗口、Android 应用骨架和专业创作软件中的完整界面区域拆开说明。

## 当前内容

- 60 个跨平台、Windows 与 Android 核心术语条目，每项使用独立演示，避免不同术语重复展示同一控件。
- 操作与命令、文字输入、选择与数值、导航、布局与内容、浮层、状态与反馈七类内容。
- 每张卡片都有小型演示，操作结果只影响本卡片。
- Windows 应用窗口、Android 应用骨架、专业创作软件三套完整界面示例。
- 完整界面支持直接点击区域，也提供等价的文字区域索引。
- 6 组容易混淆的术语对比。
- 支持中文/英文搜索、平台与分类筛选、深浅主题和响应式布局。

## 本地运行

需要 Node.js 22.13 或更高版本，以及 pnpm 11.9。

```bash
pnpm install
pnpm dev
```

构建与测试：

```bash
pnpm lint
pnpm test
```

## 诊断日志

- 网页会在当前浏览器的本地存储中分别保留运行日志和错误日志，不会上传日志。
- 页脚的“导出诊断日志”会下载 `UI图鉴-运行日志.log` 与 `UI图鉴-错误日志.log` 两个 UTF-8 文件。
- 每类日志达到约 96 KB 时自动轮转，只保留当前日志与最近一份备份。
- 页脚的“清空诊断日志”只清除这两类浏览器本地日志，不影响网页或其他数据。
- 日志不记录搜索词、密码、令牌、Cookie 或页面完整路径。

## 资料边界

术语主要参考以下官方目录：

- Microsoft Windows UI Controls
- Microsoft Fluent 2
- Material Design 3
- Android Developers / Jetpack Compose

本项目没有复制这些网站的页面、插图或品牌资产。中文说明、可交互演示和页面视觉均为本项目原创整理。斜线并列的英文名称表示相近概念或平台对应词，不代表它们是同一个 API；卡片链接指向参考目录，具体实现仍应以目标平台的最新文档为准。

## 技术说明

- Next.js 16、React 19、TypeScript
- vinext 与 Cloudflare Workers 构建链
- UTF-8 编码和简体中文界面
- 支持键盘焦点、中文输入法组合输入、减少动画和 Windows 强制颜色模式

## 目录

- `app/page.tsx`：术语数据、控件演示和完整界面场景
- `app/globals.css`：页面设计、控件示例和响应式样式
- `tests/rendered-html.test.mjs`：服务端渲染与内容完整性测试
- `.github/workflows/ci.yml`：GitHub Actions 云端构建与测试

## 后续扩展

当前版本是可用的首版图鉴，不宣称已经覆盖各框架的每一个 API。后续适合继续加入更多 WinUI 控件、Material 3 Expressive 组件、系统界面、交互状态和逐条精确来源。

## 开源许可证

本项目采用 [MIT License](LICENSE) 开源。欢迎在保留许可证和版权声明的前提下使用、修改与分发。
