"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  clearDiagnosticLogs,
  createOperationId,
  downloadDiagnosticLogs,
  initializeBrowserLogging,
  logRun,
} from "./browser-logger.mjs";

type Platform = "通用" | "Windows" | "Android";
type Category =
  | "操作与命令"
  | "文字输入"
  | "选择与数值"
  | "导航"
  | "布局与内容"
  | "对话框与浮层"
  | "状态与反馈";

type Term = {
  id: string;
  zh: string;
  en: string;
  aliases: string[];
  category: Category;
  platform: Platform;
  description: string;
  behavior: string;
  demo: string;
  source: "windows" | "fluent" | "material" | "android";
};

const SOURCES = {
  windows: {
    label: "Microsoft Windows UI",
    href: "https://learn.microsoft.com/windows/apps/develop/ui/controls/",
  },
  fluent: {
    label: "Microsoft Fluent 2",
    href: "https://fluent2.microsoft.design/components/web/react/",
  },
  material: {
    label: "Material Design 3",
    href: "https://m3.material.io/components",
  },
  android: {
    label: "Android Developers",
    href: "https://developer.android.com/develop/ui/compose/components?hl=zh-cn",
  },
} as const;

const TERMS: Term[] = [
  {
    id: "button",
    zh: "按钮",
    en: "Button",
    aliases: ["按键", "主按钮", "次要按钮"],
    category: "操作与命令",
    platform: "通用",
    description: "执行一次明确、即时的操作。",
    behavior: "点击、Enter 或 Space 后产生可观察结果。",
    demo: "button",
    source: "fluent",
  },
  {
    id: "icon-button",
    zh: "图标按钮",
    en: "Icon button",
    aliases: ["图标按键", "无文字按钮"],
    category: "操作与命令",
    platform: "通用",
    description: "仅用图标表达紧凑的次要操作。",
    behavior: "切换型图标按钮会保留并显示选中状态。",
    demo: "icon-button",
    source: "material",
  },
  {
    id: "toggle-button",
    zh: "切换按钮",
    en: "Toggle button",
    aliases: ["两态按钮", "选中按钮"],
    category: "操作与命令",
    platform: "Windows",
    description: "在按下与未按下两种状态之间切换。",
    behavior: "当前状态持续可见，并通过 aria-pressed 表达。",
    demo: "toggle-button",
    source: "windows",
  },
  {
    id: "split-button",
    zh: "拆分按钮",
    en: "Split button",
    aliases: ["分裂按钮", "组合按钮"],
    category: "操作与命令",
    platform: "通用",
    description: "主操作与相关命令菜单组成的组合按钮。",
    behavior: "主区域立即执行，箭头区域独立打开菜单。",
    demo: "split-button",
    source: "windows",
  },
  {
    id: "dropdown-button",
    zh: "下拉按钮",
    en: "Drop-down button",
    aliases: ["菜单按钮"],
    category: "操作与命令",
    platform: "Windows",
    description: "主要用途是打开一组命令或选项。",
    behavior: "打开后选择命令，选择完成后菜单关闭。",
    demo: "dropdown-button",
    source: "windows",
  },
  {
    id: "fab",
    zh: "悬浮操作按钮",
    en: "Floating action button (FAB)",
    aliases: ["浮动按钮", "悬浮按钮"],
    category: "操作与命令",
    platform: "Android",
    description: "突出当前界面最主要的操作。",
    behavior: "点击后执行主任务，并显示即时反馈。",
    demo: "fab",
    source: "android",
  },
  {
    id: "command-bar",
    zh: "命令栏",
    en: "Command bar",
    aliases: ["操作栏"],
    category: "操作与命令",
    platform: "Windows",
    description: "集中显示页面或应用中常用的命令。",
    behavior: "命令可执行，低优先级命令进入溢出菜单。",
    demo: "command-bar",
    source: "windows",
  },
  {
    id: "text-field",
    zh: "文本字段",
    en: "Text field / Text box",
    aliases: ["输入框", "文本框"],
    category: "文字输入",
    platform: "通用",
    description: "输入和编辑短文本的基础字段。",
    behavior: "支持输入、选择、清空、焦点和辅助说明。",
    demo: "text",
    source: "fluent",
  },
  {
    id: "password-field",
    zh: "密码字段",
    en: "Password field / Password box",
    aliases: ["密码框"],
    category: "文字输入",
    platform: "通用",
    description: "默认遮蔽敏感文字的输入字段。",
    behavior: "显示按钮只改变可见性，不清除已输入内容。",
    demo: "password",
    source: "windows",
  },
  {
    id: "search-box",
    zh: "搜索框",
    en: "Search box / Search bar",
    aliases: ["搜寻框", "检索框"],
    category: "文字输入",
    platform: "通用",
    description: "专门输入查询词并呈现建议或结果。",
    behavior: "输入时显示建议，支持清除与提交。",
    demo: "search",
    source: "android",
  },
  {
    id: "textarea",
    zh: "多行文本区",
    en: "Textarea / Multiline text field",
    aliases: ["多行输入框", "长文本框"],
    category: "文字输入",
    platform: "通用",
    description: "输入评论、说明等较长的自由文本。",
    behavior: "支持换行、滚动、缩放和字数反馈。",
    demo: "textarea",
    source: "fluent",
  },
  {
    id: "autosuggest",
    zh: "自动建议框",
    en: "Auto-suggest box",
    aliases: ["自动完成", "输入建议"],
    category: "文字输入",
    platform: "Windows",
    description: "输入过程中列出匹配建议。",
    behavior: "键入文字后选择建议，选择结果回填字段。",
    demo: "autosuggest",
    source: "windows",
  },
  {
    id: "number-box",
    zh: "数字框",
    en: "Number box / Spin button",
    aliases: ["数字输入框", "步进器"],
    category: "文字输入",
    platform: "通用",
    description: "输入、递增或递减一个数字。",
    behavior: "按钮和键盘都能在限定范围内改变数值。",
    demo: "number",
    source: "fluent",
  },
  {
    id: "date-picker",
    zh: "日期选择器",
    en: "Date picker",
    aliases: ["日期选取器", "日历选择"],
    category: "文字输入",
    platform: "通用",
    description: "通过日历或日期字段选择日期。",
    behavior: "打开系统日历并保留选择结果。",
    demo: "date",
    source: "android",
  },
  {
    id: "time-picker",
    zh: "时间选择器",
    en: "Time picker",
    aliases: ["时间选取器"],
    category: "文字输入",
    platform: "通用",
    description: "选择小时与分钟等时间值。",
    behavior: "通过系统时间面板或键盘修改数值。",
    demo: "time",
    source: "android",
  },
  {
    id: "color-picker",
    zh: "颜色选择器",
    en: "Color picker",
    aliases: ["取色器", "颜色选取器"],
    category: "文字输入",
    platform: "Windows",
    description: "从色域或预设颜色中选取颜色。",
    behavior: "选色后实时显示色值与预览色块。",
    demo: "color",
    source: "windows",
  },
  {
    id: "checkbox",
    zh: "复选框",
    en: "Checkbox",
    aliases: ["勾选框", "多选框"],
    category: "选择与数值",
    platform: "通用",
    description: "独立选择一个或多个项目。",
    behavior: "点击方框或文字标签都会切换状态。",
    demo: "checkbox",
    source: "material",
  },
  {
    id: "radio",
    zh: "单选按钮",
    en: "Radio button",
    aliases: ["单选框"],
    category: "选择与数值",
    platform: "通用",
    description: "从同一组选项中选择一个。",
    behavior: "同组始终最多只有一个项目被选中。",
    demo: "radio",
    source: "material",
  },
  {
    id: "switch",
    zh: "开关",
    en: "Switch / Toggle switch",
    aliases: ["切换开关", "滑动开关"],
    category: "选择与数值",
    platform: "通用",
    description: "立即开启或关闭一项设置。",
    behavior: "改变后即时生效，不需要额外保存。",
    demo: "switch",
    source: "material",
  },
  {
    id: "slider",
    zh: "滑块",
    en: "Slider",
    aliases: ["拖动条", "滑杆"],
    category: "选择与数值",
    platform: "通用",
    description: "在连续或离散范围内选择数值。",
    behavior: "拖动、点击轨道或键盘都能实时调整。",
    demo: "slider",
    source: "fluent",
  },
  {
    id: "range-slider",
    zh: "范围滑块",
    en: "Range slider",
    aliases: ["双滑块", "区间滑块"],
    category: "选择与数值",
    platform: "通用",
    description: "用两个边界值选择一个数值区间。",
    behavior: "起始值不会超过结束值。",
    demo: "range-slider",
    source: "material",
  },
  {
    id: "segmented",
    zh: "分段按钮",
    en: "Segmented button",
    aliases: ["分段控件", "分段选择器"],
    category: "选择与数值",
    platform: "Android",
    description: "在相关选项、视图或排序方式之间选择。",
    behavior: "选择后高亮当前分段，并更新结果。",
    demo: "segmented",
    source: "material",
  },
  {
    id: "chip",
    zh: "条状标签",
    en: "Chip",
    aliases: ["芯片", "筛选标签", "胶囊标签"],
    category: "选择与数值",
    platform: "Android",
    description: "用于辅助操作、过滤、输入或建议的紧凑元素。",
    behavior: "筛选 Chip 会保留选中状态，输入 Chip 可以移除。",
    demo: "chip",
    source: "material",
  },
  {
    id: "combobox",
    zh: "组合框",
    en: "Combo box",
    aliases: ["可输入下拉框", "下拉输入框"],
    category: "选择与数值",
    platform: "Windows",
    description: "从列表选择，也可按配置接受文字。",
    behavior: "输入文字会缩小候选范围，选择后回填。",
    demo: "combobox",
    source: "windows",
  },
  {
    id: "rating",
    zh: "评分控件",
    en: "Rating control",
    aliases: ["星级评分", "评分条"],
    category: "选择与数值",
    platform: "Windows",
    description: "使用星级等方式输入或显示评分。",
    behavior: "鼠标、触摸和键盘可选择评分值。",
    demo: "rating",
    source: "windows",
  },
  {
    id: "tabs",
    zh: "标签页",
    en: "Tabs / Tab view",
    aliases: ["选项卡", "页签"],
    category: "导航",
    platform: "通用",
    description: "在同层级的相关内容面板之间切换。",
    behavior: "选中标签与显示面板始终一一对应。",
    demo: "tabs",
    source: "material",
  },
  {
    id: "breadcrumb",
    zh: "面包屑导航",
    en: "Breadcrumb / Breadcrumb bar",
    aliases: ["路径导航", "层级路径"],
    category: "导航",
    platform: "通用",
    description: "显示当前位置路径并允许跳转到上级。",
    behavior: "点击任一级都会更新当前路径。",
    demo: "breadcrumb",
    source: "windows",
  },
  {
    id: "pagination",
    zh: "分页器",
    en: "Pagination",
    aliases: ["翻页器", "页码"],
    category: "导航",
    platform: "通用",
    description: "在多页内容之间移动并显示当前位置。",
    behavior: "上一页、下一页和页码都会更新当前页。",
    demo: "pagination",
    source: "fluent",
  },
  {
    id: "navigation-view",
    zh: "导航视图",
    en: "Navigation view",
    aliases: ["应用导航壳", "侧边导航"],
    category: "导航",
    platform: "Windows",
    description: "实现顶部或左侧顶级导航的自适应应用壳。",
    behavior: "窗格可展开收起，选择项目会切换内容。",
    demo: "navview",
    source: "windows",
  },
  {
    id: "navigation-bar",
    zh: "应用导航栏",
    en: "Navigation bar",
    aliases: ["底部导航", "底栏导航"],
    category: "导航",
    platform: "Android",
    description: "紧凑屏幕上的顶级目的地导航。",
    behavior: "通常包含 3–5 项，选择后切换实际内容。",
    demo: "navbar",
    source: "android",
  },
  {
    id: "navigation-rail",
    zh: "侧边导航轨",
    en: "Navigation rail",
    aliases: ["导航轨", "侧边导航栏"],
    category: "导航",
    platform: "Android",
    description: "中等宽度屏幕上的纵向顶级导航。",
    behavior: "选择后高亮目的地并更新相邻内容。",
    demo: "navrail",
    source: "android",
  },
  {
    id: "drawer",
    zh: "抽屉式导航栏",
    en: "Navigation drawer",
    aliases: ["侧滑菜单", "汉堡菜单"],
    category: "导航",
    platform: "Android",
    description: "从屏幕侧边出现的多目的地导航面板。",
    behavior: "菜单按钮打开，选择项目或点遮罩后关闭。",
    demo: "drawer",
    source: "android",
  },
  {
    id: "tree-view",
    zh: "树视图",
    en: "Tree view",
    aliases: ["目录树", "树形列表"],
    category: "导航",
    platform: "Windows",
    description: "显示可展开、折叠的层级节点。",
    behavior: "展开节点后显示子项，选择项会高亮。",
    demo: "tree",
    source: "windows",
  },
  {
    id: "back-button",
    zh: "后退按钮",
    en: "Back button",
    aliases: ["返回按钮"],
    category: "导航",
    platform: "通用",
    description: "返回导航历史中的上一位置。",
    behavior: "有历史时可用，返回后更新当前位置。",
    demo: "back",
    source: "windows",
  },
  {
    id: "card",
    zh: "卡片",
    en: "Card",
    aliases: ["内容卡", "信息卡"],
    category: "布局与内容",
    platform: "通用",
    description: "组合单一主题相关的信息和操作。",
    behavior: "可操作卡片显示选择状态，内部按钮独立响应。",
    demo: "card",
    source: "material",
  },
  {
    id: "list-view",
    zh: "列表视图",
    en: "List view / List",
    aliases: ["列表", "项目列表"],
    category: "布局与内容",
    platform: "通用",
    description: "以连续纵向项目显示同类内容。",
    behavior: "项目可选择，当前选择保持高亮。",
    demo: "list",
    source: "windows",
  },
  {
    id: "grid-view",
    zh: "网格视图",
    en: "Grid view",
    aliases: ["卡片网格", "宫格"],
    category: "布局与内容",
    platform: "Windows",
    description: "以可换行的行列形式显示项目集合。",
    behavior: "点击项目会选择它并显示名称。",
    demo: "grid",
    source: "windows",
  },
  {
    id: "data-grid",
    zh: "数据网格",
    en: "Data grid / Table",
    aliases: ["数据表格", "表格"],
    category: "布局与内容",
    platform: "通用",
    description: "用列标题、行和单元格呈现结构化数据。",
    behavior: "行可选择，列标题可以改变排序。",
    demo: "table",
    source: "fluent",
  },
  {
    id: "accordion",
    zh: "展开器",
    en: "Expander / Accordion",
    aliases: ["折叠面板", "手风琴"],
    category: "布局与内容",
    platform: "通用",
    description: "按需展开补充内容，减少初始占用空间。",
    behavior: "标题可以用鼠标或键盘展开、收起。",
    demo: "accordion",
    source: "fluent",
  },
  {
    id: "carousel",
    zh: "轮播",
    en: "Carousel",
    aliases: ["轮播图", "横向画廊"],
    category: "布局与内容",
    platform: "Android",
    description: "一次突出显示集合中的一个或少量项目。",
    behavior: "前后按钮切换项目，并显示当前位置。",
    demo: "carousel",
    source: "material",
  },
  {
    id: "split-view",
    zh: "拆分视图",
    en: "Split view",
    aliases: ["分栏视图", "可开合窗格"],
    category: "布局与内容",
    platform: "Windows",
    description: "包含一个可开合窗格和固定内容区。",
    behavior: "切换按钮控制窗格显示方式。",
    demo: "splitview",
    source: "windows",
  },
  {
    id: "list-details",
    zh: "列表/详细信息模式",
    en: "List/details pattern",
    aliases: ["主从视图", "Master/detail"],
    category: "布局与内容",
    platform: "通用",
    description: "一侧选择项目，另一侧显示当前项目详情。",
    behavior: "选择列表项后详情区立即更新。",
    demo: "listdetails",
    source: "windows",
  },
  {
    id: "avatar",
    zh: "头像与人物信息",
    en: "Avatar / Persona",
    aliases: ["人物图片", "联系人头像"],
    category: "布局与内容",
    platform: "通用",
    description: "用图像、文字和状态表示个人或群组。",
    behavior: "点击后切换在线状态并更新说明。",
    demo: "avatar",
    source: "fluent",
  },
  {
    id: "media-controls",
    zh: "媒体播放控件",
    en: "Media controls",
    aliases: ["播放器控件", "播放控制条"],
    category: "布局与内容",
    platform: "通用",
    description: "控制音频或视频的播放、进度和音量。",
    behavior: "播放按钮和进度滑块都会更新当前状态。",
    demo: "media",
    source: "windows",
  },
  {
    id: "canvas",
    zh: "编辑画布",
    en: "Editing canvas / Work area",
    aliases: ["工作区", "绘图区", "创作画布"],
    category: "布局与内容",
    platform: "通用",
    description: "创作软件中自由放置、编辑或绘制对象的主要工作区域；不要与 WinUI 布局面板 Canvas 混淆。",
    behavior: "选择工具并点击画布会添加对应对象。",
    demo: "canvas",
    source: "windows",
  },
  {
    id: "dialog",
    zh: "对话框",
    en: "Dialog / Content dialog",
    aliases: ["弹窗", "模态框"],
    category: "对话框与浮层",
    platform: "通用",
    description: "在继续前请求确认、选择或补充输入。",
    behavior: "打开后转移焦点，关闭后回到触发按钮。",
    demo: "dialog",
    source: "windows",
  },
  {
    id: "popover",
    zh: "浮出面板",
    en: "Popover / Flyout",
    aliases: ["浮层", "气泡面板"],
    category: "对话框与浮层",
    platform: "通用",
    description: "在触发元素附近显示非关键上下文内容。",
    behavior: "触发按钮打开，选择或再次点击后关闭。",
    demo: "popover",
    source: "fluent",
  },
  {
    id: "tooltip",
    zh: "工具提示",
    en: "Tooltip",
    aliases: ["悬浮提示", "提示气泡"],
    category: "对话框与浮层",
    platform: "通用",
    description: "在目标附近显示简短标签或解释。",
    behavior: "鼠标悬停或键盘聚焦时出现。",
    demo: "tooltip",
    source: "material",
  },
  {
    id: "context-menu",
    zh: "菜单与上下文菜单",
    en: "Menu / Context menu",
    aliases: ["右键菜单", "快捷菜单"],
    category: "对话框与浮层",
    platform: "Windows",
    description: "隐藏相关命令，按需在上下文位置显示。",
    behavior: "打开后可选择命令，Esc 或外部点击关闭。",
    demo: "menu",
    source: "windows",
  },
  {
    id: "bottom-sheet",
    zh: "底部工作表",
    en: "Bottom sheet",
    aliases: ["底部面板", "底部弹层"],
    category: "对话框与浮层",
    platform: "Android",
    description: "锚定屏幕底部显示次级内容。",
    behavior: "可以打开、收起，并通过遮罩或返回关闭。",
    demo: "bottomsheet",
    source: "android",
  },
  {
    id: "teaching-tip",
    zh: "教学提示",
    en: "Teaching tip",
    aliases: ["功能引导", "新手提示"],
    category: "对话框与浮层",
    platform: "Windows",
    description: "用富内容介绍新功能或引导操作。",
    behavior: "打开后可执行示例操作或明确关闭。",
    demo: "teaching",
    source: "windows",
  },
  {
    id: "notification",
    zh: "Android 通知",
    en: "Android notification",
    aliases: ["系统通知", "通知卡片", "通知帘消息"],
    category: "对话框与浮层",
    platform: "Android",
    description: "由 Android 系统在应用界面之外显示的及时信息；卡片内只是视觉模拟。",
    behavior: "系统通知可展开、执行动作或被关闭。",
    demo: "notification",
    source: "android",
  },
  {
    id: "snackbar",
    zh: "底部消息条",
    en: "Snackbar",
    aliases: ["快捷信息栏", "底部提示"],
    category: "状态与反馈",
    platform: "Android",
    description: "短暂显示非阻断操作反馈。",
    behavior: "由操作触发，可附加撤销等动作。",
    demo: "snackbar",
    source: "android",
  },
  {
    id: "toast",
    zh: "临时通知",
    en: "Toast",
    aliases: ["吐司提示", "短提示"],
    category: "状态与反馈",
    platform: "通用",
    description: "短暂告知操作状态，不要求用户回应。",
    behavior: "触发后出现，再由用户关闭或自然消失。",
    demo: "toast",
    source: "fluent",
  },
  {
    id: "info-bar",
    zh: "信息栏",
    en: "Info bar",
    aliases: ["信息提示栏", "横幅提示"],
    category: "状态与反馈",
    platform: "Windows",
    description: "在内容区持续显示成功、警告或错误。",
    behavior: "可包含操作按钮，也可以由用户关闭。",
    demo: "infobar",
    source: "windows",
  },
  {
    id: "badge",
    zh: "徽章",
    en: "Badge",
    aliases: ["角标", "数量标记"],
    category: "状态与反馈",
    platform: "通用",
    description: "在图标或导航项上显示数量或状态。",
    behavior: "宿主操作改变后，计数同步更新。",
    demo: "badge",
    source: "fluent",
  },
  {
    id: "progress-bar",
    zh: "进度条",
    en: "Progress bar",
    aliases: ["加载进度", "完成进度"],
    category: "状态与反馈",
    platform: "通用",
    description: "以横向轨道显示确定进度。",
    behavior: "进度条本身只读；拖动下方示例控制器可改变完成比例。",
    demo: "progress",
    source: "fluent",
  },
  {
    id: "progress-ring",
    zh: "进度环",
    en: "Progress ring / Circular progress",
    aliases: ["环形进度", "圆形进度"],
    category: "状态与反馈",
    platform: "Windows",
    description: "用环形图形表示处理状态或完成比例。",
    behavior: "进度环本身只读；使用旁边的示例按钮改变完成比例。",
    demo: "progress-ring",
    source: "windows",
  },
  {
    id: "spinner",
    zh: "加载旋转器",
    en: "Spinner / Loading indicator",
    aliases: ["加载圈", "等待动画"],
    category: "状态与反馈",
    platform: "通用",
    description: "表示系统正在处理，但不说明完成比例。",
    behavior: "开始后播放动画，停止后显示完成状态。",
    demo: "spinner",
    source: "fluent",
  },
  {
    id: "skeleton",
    zh: "骨架屏",
    en: "Skeleton",
    aliases: ["内容占位", "加载占位"],
    category: "状态与反馈",
    platform: "通用",
    description: "在内容载入前显示近似布局占位。",
    behavior: "点击加载后，占位被真实内容替换。",
    demo: "skeleton",
    source: "fluent",
  },
];

const CATEGORIES: Category[] = [
  "操作与命令",
  "文字输入",
  "选择与数值",
  "导航",
  "布局与内容",
  "对话框与浮层",
  "状态与反馈",
];

function DemoRenderer({ type }: { type: string }) {
  const dialogTitleId = useId();
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [splitPage, setSplitPage] = useState<"首页" | "设置">("首页");
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("标准");
  const [value, setValue] = useState(48);
  const [secondValue, setSecondValue] = useState(78);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(3);
  const [selected, setSelected] = useState("项目 A");
  const [canvasTool, setCanvasTool] = useState<"选择" | "矩形">("选择");
  const [canvasObjects, setCanvasObjects] = useState([{ id: 1, x: 68, y: 56 }]);
  const [selectedCanvasObject, setSelectedCanvasObject] = useState<number | null>(1);
  const [draggingCanvasObject, setDraggingCanvasObject] = useState<number | null>(null);
  const [dateMode, setDateMode] = useState<"内嵌日历" | "滚轮日期">("内嵌日历");
  const [dateYear, setDateYear] = useState(2026);
  const [dateMonth, setDateMonth] = useState(8);
  const [dateDay, setDateDay] = useState(20);
  const [message, setMessage] = useState("等待操作");
  const [showPassword, setShowPassword] = useState(false);
  const [treeProjectOpen, setTreeProjectOpen] = useState(true);
  const [treeComponentsOpen, setTreeComponentsOpen] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const result = (content: string) => (
    <output className="demo-result" aria-live="polite">
      {content}
    </output>
  );

  switch (type) {
    case "button":
      return (
        <div className="demo-stack">
          <button className="ui-button primary" onClick={() => setMessage("文件已保存")}>保存</button>
          {result(message)}
        </div>
      );
    case "icon-button":
      return (
        <div className="demo-stack">
          <button className={`icon-action ${active ? "selected" : ""}`} aria-label={active ? "取消收藏" : "收藏"} aria-pressed={active} onClick={() => setActive(!active)}>{active ? "★" : "☆"}</button>
          {result(active ? "已加入收藏" : "尚未收藏")}
        </div>
      );
    case "toggle-button":
      return (
        <div className="demo-stack">
          <button className={`ui-button ${active ? "pressed" : ""}`} aria-pressed={active} onClick={() => setActive(!active)}>B　粗体</button>
          {result(active ? "粗体已开启" : "粗体已关闭")}
        </div>
      );
    case "split-button":
      return (
        <div className="demo-stack">
          <div className="split-button"><button onClick={() => setMessage("已导出 PDF")}>导出 PDF</button><details><summary aria-label="其他导出格式"><svg className="split-chevron" aria-hidden="true" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" /></svg></summary><div className="mini-menu"><button onClick={() => setMessage("已导出 PNG")}>导出 PNG</button><button onClick={() => setMessage("已复制链接")}>复制链接</button></div></details></div>
          {result(message)}
        </div>
      );
    case "dropdown-button":
      return (
        <div className="demo-stack"><details className="dropdown-demo dropdown-button-demo"><summary className="ui-button"><span>新建</span><svg className="dropdown-chevron" aria-hidden="true" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" /></svg></summary><div className="mini-menu"><button onClick={() => setMessage("已新建文件")}>文件</button><button onClick={() => setMessage("已新建文件夹")}>文件夹</button></div></details>{result(message)}</div>
      );
    case "fab":
      return <div className="demo-stack"><button className="fab" aria-label="新建项目" onClick={() => setMessage("已新建项目")}>＋</button>{result(message)}</div>;
    case "command-bar":
      return <div className="demo-stack"><div className="command-demo"><button onClick={() => setMessage("已新建")}>＋ 新建</button><button onClick={() => setMessage("已编辑")}>✎ 编辑</button><details><summary aria-label="更多命令">⋯</summary><div className="mini-menu right"><button onClick={() => setMessage("已归档")}>归档</button></div></details></div>{result(message)}</div>;
    case "text":
      return <label className="field">显示名称<input value={text} onChange={(event) => setText(event.target.value)} placeholder="请输入名称" />{result(text ? `当前输入：${text}` : "尚未输入")}</label>;
    case "password":
      return <div className="demo-stack"><label className="field">密码<div className="field-with-action"><input type={showPassword ? "text" : "password"} value={text} onChange={(event) => setText(event.target.value)} placeholder="请输入密码" /><button aria-label={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "隐藏" : "显示"}</button></div></label>{result(text ? `已输入 ${text.length} 个字符` : "尚未输入")}</div>;
    case "search": {
      const suggestions = ["按钮 Button", "底部工作表 Bottom sheet", "徽章 Badge"].filter((item) => item.toLowerCase().includes(text.toLowerCase()));
      return <div className="search-demo"><label className="field">搜索控件<input type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder="例如：按钮" /></label>{text && <div className="suggestions">{suggestions.length ? suggestions.map((item) => <button key={item} onClick={() => setText(item)}>{item}</button>) : <span>没有匹配建议</span>}</div>}</div>;
    }
    case "textarea":
      return <label className="field">补充说明<textarea value={text} maxLength={120} onChange={(event) => setText(event.target.value)} placeholder="输入多行文字……" /><span className="field-note">{text.length}/120</span></label>;
    case "autosuggest":
      return <label className="field">收件人<input list="people-list" value={text} onChange={(event) => setText(event.target.value)} placeholder="输入姓名" /><datalist id="people-list"><option value="林晓明" /><option value="王雨青" /><option value="陈安" /></datalist>{result(text || "选择或输入姓名")}</label>;
    case "number":
      return <div className="demo-stack"><div className="number-box"><button aria-label="减少" onClick={() => setValue(Math.max(0, value - 1))}>−</button><input aria-label="数量" type="number" min="0" max="99" value={value} onChange={(event) => setValue(Number(event.target.value))} /><button aria-label="增加" onClick={() => setValue(Math.min(99, value + 1))}>＋</button></div>{result(`当前数值：${value}`)}</div>;
    case "date": {
      const daysInMonth = new Date(dateYear, dateMonth, 0).getDate();
      const firstWeekday = new Date(dateYear, dateMonth - 1, 1).getDay();
      const calendarCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
      const updateMonth = (offset: number) => {
        const next = new Date(dateYear, dateMonth - 1 + offset, 1);
        const nextYear = next.getFullYear();
        const nextMonth = next.getMonth() + 1;
        setDateYear(nextYear);
        setDateMonth(nextMonth);
        setDateDay(Math.min(dateDay, new Date(nextYear, nextMonth, 0).getDate()));
      };
      const formattedDate = `${dateYear}-${String(dateMonth).padStart(2, "0")}-${String(dateDay).padStart(2, "0")}`;
      return <div className="date-picker-demo"><div className="date-mode-switch" role="tablist" aria-label="日期选择方式">{(["内嵌日历", "滚轮日期"] as const).map((mode) => <button key={mode} role="tab" aria-selected={dateMode === mode} className={dateMode === mode ? "selected" : ""} onClick={() => setDateMode(mode)}>{mode}</button>)}</div>{dateMode === "内嵌日历" ? <section className="inline-calendar" aria-label={`${dateYear} 年 ${dateMonth} 月`}><header><button aria-label="上一个月" onClick={() => updateMonth(-1)}>‹</button><strong>{dateYear} 年 {dateMonth} 月</strong><button aria-label="下一个月" onClick={() => updateMonth(1)}>›</button></header><div className="calendar-weekdays" aria-hidden="true">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{calendarCells.map((day, index) => day === null ? <span key={`blank-${index}`} /> : <button key={day} className={dateDay === day ? "selected" : ""} aria-pressed={dateDay === day} aria-label={`${dateMonth} 月 ${day} 日`} onClick={() => setDateDay(day)}>{day}</button>)}</div></section> : <section className="date-wheel" aria-label="滚轮日期选择器"><label><span>年</span><select aria-label="选择年份" size={5} value={dateYear} onChange={(event) => { const year = Number(event.target.value); setDateYear(year); setDateDay(Math.min(dateDay, new Date(year, dateMonth, 0).getDate())); }}>{Array.from({ length: 9 }, (_, index) => 2022 + index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label><span>月</span><select aria-label="选择月份" size={5} value={dateMonth} onChange={(event) => { const month = Number(event.target.value); setDateMonth(month); setDateDay(Math.min(dateDay, new Date(dateYear, month, 0).getDate())); }}>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{String(month).padStart(2, "0")}</option>)}</select></label><label><span>日</span><select aria-label="选择日期" size={5} value={dateDay} onChange={(event) => setDateDay(Number(event.target.value))}>{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{String(day).padStart(2, "0")}</option>)}</select></label></section>}{result(`已选择：${formattedDate}`)}</div>;
    }
    case "time":
      return <label className="field">提醒时间<input type="time" onChange={(event) => setText(event.target.value)} />{result(text || "尚未选择时间")}</label>;
    case "color":
      return <div className="demo-stack"><label className="color-field">主题色<input type="color" value={text || "#5b5bd6"} onChange={(event) => setText(event.target.value)} /></label>{result(text || "#5b5bd6")}</div>;
    case "checkbox":
      return <fieldset className="choice-group"><legend>导出内容</legend>{["正文", "批注", "附件"].map((item) => <label key={item}><input type="checkbox" defaultChecked={item === "正文"} />{item}</label>)}</fieldset>;
    case "radio":
      return <fieldset className="choice-group"><legend>画质</legend>{["标准", "高清", "原始"].map((item) => <label key={item}><input type="radio" name="quality-demo" checked={choice === item} onChange={() => setChoice(item)} />{item}</label>)}{result(`当前选择：${choice}`)}</fieldset>;
    case "switch":
      return <div className="demo-stack"><label className="switch-row"><span>自动保存</span><input className="switch" type="checkbox" role="switch" aria-checked={active} checked={active} onChange={(event) => setActive(event.target.checked)} /></label>{result(active ? "自动保存已开启" : "自动保存已关闭")}</div>;
    case "slider":
      return <label className="field">缩放比例<input type="range" min="50" max="150" value={value} onChange={(event) => setValue(Number(event.target.value))} />{result(`${value}%`)}</label>;
    case "range-slider":
      return <div className="demo-stack"><label className="field">最低价格<input type="range" min="0" max="100" value={Math.min(value, secondValue)} onChange={(event) => setValue(Math.min(Number(event.target.value), secondValue))} /></label><label className="field">最高价格<input type="range" min="0" max="100" value={secondValue} onChange={(event) => setSecondValue(Math.max(Number(event.target.value), value))} /></label>{result(`区间：${Math.min(value, secondValue)}–${Math.max(value, secondValue)}`)}</div>;
    case "segmented":
      return <div className="demo-stack"><div className="segmented">{["列表", "网格", "紧凑"].map((item) => <button key={item} className={choice === item ? "selected" : ""} aria-pressed={choice === item} onClick={() => setChoice(item)}>{item}</button>)}</div>{result(`视图：${choice}`)}</div>;
    case "chip":
      return <div className="demo-stack"><div className="chip-row">{["Windows", "Android", "通用"].map((item) => <button key={item} className={`chip ${choice === item ? "selected" : ""}`} aria-pressed={choice === item} onClick={() => setChoice(item)}>{choice === item ? "✓ " : ""}{item}</button>)}</div>{result(`筛选：${choice}`)}</div>;
    case "combobox":
      return <label className="field">目标平台<input list="platform-list" value={text} onChange={(event) => setText(event.target.value)} placeholder="选择或输入" /><datalist id="platform-list"><option value="Windows" /><option value="Android" /><option value="Web" /></datalist>{result(text || "尚未选择")}</label>;
    case "rating":
      return <div className="demo-stack"><div className="rating" aria-label="评分">{[1, 2, 3, 4, 5].map((star) => <button key={star} aria-label={`${star} 星`} onClick={() => setValue(star)}>{star <= value ? "★" : "☆"}</button>)}</div>{result(`${Math.min(value, 5)} 星`)}</div>;
    case "tabs": {
      const tabItems = ["概览", "活动", "设置"];
      return <div className="demo-stack"><div className="tabs" role="tablist" aria-label="示例标签页">{tabItems.map((item, index) => <button id={`demo-tab-${index}`} key={item} role="tab" className={choice === item ? "selected" : ""} aria-selected={choice === item} aria-controls="demo-tab-panel" tabIndex={choice === item ? 0 : -1} onClick={() => setChoice(item)} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const current = Math.max(0, tabItems.indexOf(choice)); const next = event.key === "ArrowRight" ? (current + 1) % tabItems.length : (current + tabItems.length - 1) % tabItems.length; setChoice(tabItems[next]); } }}>{item}</button>)}</div><div id="demo-tab-panel" className="tab-panel" role="tabpanel" aria-labelledby={`demo-tab-${Math.max(0, tabItems.indexOf(choice))}`}>这里显示“{choice}”面板。</div></div>;
    }
    case "breadcrumb":
      return <div className="demo-stack"><nav className="breadcrumb" aria-label="当前位置"><button onClick={() => setChoice("首页")}>首页</button><span>/</span><button onClick={() => setChoice("设计")}>设计</button><span>/</span><button onClick={() => setChoice("组件")}>组件</button></nav>{result(`当前位置：${choice}`)}</div>;
    case "pagination":
      return <div className="demo-stack"><nav className="pagination" aria-label="分页"><button disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>{[1, 2, 3].map((item) => <button key={item} aria-current={page === item ? "page" : undefined} onClick={() => setPage(item)}>{item}</button>)}<button disabled={page === 3} onClick={() => setPage(page + 1)}>›</button></nav>{result(`第 ${page} 页`)}</div>;
    case "navview":
      return <div className="demo-stack"><div className={`navview ${open ? "open" : ""}`}><button className="nav-toggle" aria-label="切换导航窗格" onClick={() => setOpen(!open)}>☰</button>{["首页", "文件", "设置"].map((item) => <button key={item} className={choice === item ? "selected" : ""} onClick={() => setChoice(item)}><span>{item === "首页" ? "⌂" : item === "文件" ? "▤" : "⚙"}</span>{open && item}</button>)}</div>{result(`当前页面：${choice}`)}</div>;
    case "navbar":
      return <div className="demo-stack"><nav className="bottom-nav">{["首页", "收藏", "账户"].map((item) => <button key={item} className={choice === item ? "selected" : ""} onClick={() => setChoice(item)}><span>{item === "首页" ? "⌂" : item === "收藏" ? "☆" : "○"}</span>{item}</button>)}</nav>{result(`当前目的地：${choice}`)}</div>;
    case "navrail":
      return <div className="demo-stack"><nav className="nav-rail">{["首页", "图库", "设置"].map((item) => <button key={item} aria-label={item} className={choice === item ? "selected" : ""} onClick={() => setChoice(item)}>{item === "首页" ? "⌂" : item === "图库" ? "▦" : "⚙"}</button>)}</nav>{result(`当前目的地：${choice}`)}</div>;
    case "drawer":
      return <div className="drawer-stage"><button className="ui-button" onClick={() => setOpen(true)}>☰ 打开导航</button>{open && <><button className="drawer-scrim" aria-label="关闭导航" onClick={() => setOpen(false)} /><aside className="drawer-panel"><strong>应用导航</strong>{["首页", "下载", "设置"].map((item) => <button key={item} onClick={() => { setChoice(item); setOpen(false); }}>{item}</button>)}</aside></>}{result(`当前页面：${choice}`)}</div>;
    case "tree":
      return <div className="tree-demo"><div className="tree-viewport" role="tree" aria-label="项目文件"><button type="button" className="tree-node tree-branch" role="treeitem" aria-selected={false} aria-expanded={treeProjectOpen} onClick={() => setTreeProjectOpen(!treeProjectOpen)}><span className="tree-chevron" aria-hidden="true">{treeProjectOpen ? "▾" : "▸"}</span><span>项目文件</span></button>{treeProjectOpen && <div className="tree-children" role="group"><button type="button" className={`tree-node tree-leaf ${selected === "首页.tsx" ? "selected" : ""}`} role="treeitem" aria-selected={selected === "首页.tsx"} onClick={() => setSelected("首页.tsx")}><span className="tree-chevron" aria-hidden="true" /><span>首页.tsx</span></button><button type="button" className="tree-node tree-branch" role="treeitem" aria-selected={false} aria-expanded={treeComponentsOpen} onClick={() => setTreeComponentsOpen(!treeComponentsOpen)}><span className="tree-chevron" aria-hidden="true">{treeComponentsOpen ? "▾" : "▸"}</span><span>组件</span></button>{treeComponentsOpen && <div className="tree-children" role="group"><button type="button" className={`tree-node tree-leaf ${selected === "按钮.tsx" ? "selected" : ""}`} role="treeitem" aria-selected={selected === "按钮.tsx"} onClick={() => setSelected("按钮.tsx")}><span className="tree-chevron" aria-hidden="true" /><span>按钮.tsx</span></button></div>}</div>}</div>{result(`已选择：${selected}`)}</div>;
    case "back":
      return <div className="demo-stack"><div className="page-trail"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← 后退</button><span>页面 {page}</span><button disabled={page === 3} onClick={() => setPage(page + 1)}>前进 →</button></div>{result(`当前位置：页面 ${page}`)}</div>;
    case "card":
      return <button className={`select-card ${active ? "selected" : ""}`} aria-pressed={active} onClick={() => setActive(!active)}><span className="card-art">UI</span><span><strong>组件图鉴</strong><small>点击选择这张卡片</small></span><span>{active ? "✓" : ""}</span></button>;
    case "list":
      return <div className="demo-stack"><div className="select-list">{["项目 A", "项目 B", "项目 C"].map((item) => <button key={item} className={selected === item ? "selected" : ""} onClick={() => setSelected(item)}><span className="list-icon">{item.slice(-1)}</span>{item}</button>)}</div>{result(`已选择：${selected}`)}</div>;
    case "grid":
      return <div className="demo-stack"><div className="select-grid">{["蓝图", "线框", "原型", "交付"].map((item) => <button key={item} className={selected === item ? "selected" : ""} onClick={() => setSelected(item)}><span>▦</span>{item}</button>)}</div>{result(`已选择：${selected}`)}</div>;
    case "table":
      return <div className="demo-stack"><div className="table-demo" role="table"><div className="table-row header" role="row"><button onClick={() => setActive(!active)}>名称 {active ? "↓" : "↑"}</button><span>状态</span></div>{(active ? ["组件 C", "组件 B", "组件 A"] : ["组件 A", "组件 B", "组件 C"]).map((item) => <button className={`table-row ${selected === item ? "selected" : ""}`} key={item} onClick={() => setSelected(item)}><span>{item}</span><span>已核对</span></button>)}</div>{result(`当前行：${selected}`)}</div>;
    case "accordion":
      return <div className="accordion"><details><summary>什么是控件？</summary><p>能够显示内容或接受操作的界面元素。</p></details><details><summary>什么是布局区域？</summary><p>用于组织其他内容的界面组成部分。</p></details></div>;
    case "carousel": {
      const slides = ["按钮家族", "导航家族", "反馈家族"];
      return <div className="demo-stack"><div className="carousel"><button aria-label="上一个" onClick={() => setPage((page + 2) % 3)}>‹</button><div><strong>{slides[page % 3]}</strong><span>{page % 3 + 1} / 3</span></div><button aria-label="下一个" onClick={() => setPage((page + 1) % 3)}>›</button></div></div>;
    }
    case "splitview":
      return <div className="demo-stack"><div className={`split-view ${open ? "open" : ""}`}><aside><button type="button" aria-label={open ? "收起窗格" : "展开窗格"} aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>{open && <>{(["首页", "设置"] as const).map((item) => <button type="button" key={item} className={splitPage === item ? "selected" : ""} aria-current={splitPage === item ? "page" : undefined} onClick={() => setSplitPage(item)}>{item}</button>)}</>}</aside><section className="split-content" aria-live="polite"><strong>{splitPage}</strong><span>{splitPage === "首页" ? "概览与最近项目" : "外观与通知设置"}</span></section></div>{result(`${open ? "窗格已展开" : "窗格已收起"} · 当前页面：${splitPage}`)}</div>;
    case "listdetails":
      return <div className="list-details"><div>{["按钮", "开关", "滑块"].map((item) => <button key={item} className={selected === item ? "selected" : ""} onClick={() => setSelected(item)}>{item}</button>)}</div><article><strong>{selected}</strong><p>这里显示当前选择项目的详细信息。</p></article></div>;
    case "avatar":
      return <div className="demo-stack"><button className="persona" onClick={() => setActive(!active)}><span className="avatar">林</span><span><strong>林晓明</strong><small>{active ? "在线" : "离线"}</small></span><i className={active ? "online" : ""} /></button>{result(active ? "状态：在线" : "状态：离线")}</div>;
    case "media":
      return <div className="demo-stack"><div className="media-demo"><div className="media-controls-row"><button aria-label={active ? "暂停" : "播放"} onClick={() => setActive(!active)}>{active ? <svg className="media-control-icon" aria-hidden="true" viewBox="0 0 20 20"><rect x="5" y="4" width="3.5" height="12" rx="1" /><rect x="11.5" y="4" width="3.5" height="12" rx="1" /></svg> : <svg className="media-control-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M6.5 4.7a1 1 0 0 1 1.52-.85l8.1 5.3a1 1 0 0 1 0 1.7l-8.1 5.3a1 1 0 0 1-1.52-.85V4.7Z" /></svg>}</button><input aria-label="播放进度" type="range" min="0" max="100" value={value} onChange={(event) => setValue(Number(event.target.value))} /><output aria-label="当前播放进度">{value}%</output></div></div>{result(active ? "正在播放" : "已暂停")}</div>;
    case "canvas":
      return <div className="demo-stack canvas-editor-demo"><div className="canvas-tools" role="toolbar" aria-label="画布工具"><button className={canvasTool === "选择" ? "selected" : ""} aria-pressed={canvasTool === "选择"} onClick={() => setCanvasTool("选择")}>↖ 选择</button><button className={canvasTool === "矩形" ? "selected" : ""} aria-pressed={canvasTool === "矩形"} onClick={() => setCanvasTool("矩形")}>□ 矩形</button><button className="canvas-delete" disabled={selectedCanvasObject === null} onClick={() => { if (selectedCanvasObject !== null) { setCanvasObjects(canvasObjects.filter((item) => item.id !== selectedCanvasObject)); setSelectedCanvasObject(null); } }}>删除</button></div><div className={`canvas-demo tool-${canvasTool === "选择" ? "select" : "rectangle"}`} role="application" aria-label={canvasTool === "矩形" ? "画布：点击空白处创建矩形" : "画布：选择并拖动矩形"} onClick={(event) => { if (canvasTool === "矩形") { const bounds = event.currentTarget.getBoundingClientRect(); const nextId = canvasObjects.reduce((largest, item) => Math.max(largest, item.id), 0) + 1; const nextObject = { id: nextId, x: Math.max(14, Math.min(86, ((event.clientX - bounds.left) / bounds.width) * 100)), y: Math.max(14, Math.min(86, ((event.clientY - bounds.top) / bounds.height) * 100)) }; setCanvasObjects([...canvasObjects, nextObject]); setSelectedCanvasObject(nextId); } else { setSelectedCanvasObject(null); } }}><small className="canvas-hint">{canvasTool === "矩形" ? "点击空白处创建矩形" : "选择后拖动矩形"}</small>{canvasObjects.map((item) => <button type="button" key={item.id} className={`canvas-demo-object ${selectedCanvasObject === item.id ? "selected" : ""}`} aria-label={`矩形 ${item.id}${selectedCanvasObject === item.id ? "，已选择，可拖动" : ""}`} aria-pressed={selectedCanvasObject === item.id} style={{ left: `calc(${item.x}% - 32px)`, top: `calc(${item.y}% - 22px)` }} onPointerDown={(event) => { if (canvasTool === "选择") { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setSelectedCanvasObject(item.id); setDraggingCanvasObject(item.id); } }} onPointerMove={(event) => { if (canvasTool === "选择" && draggingCanvasObject === item.id) { const canvas = event.currentTarget.parentElement; if (!canvas) return; const bounds = canvas.getBoundingClientRect(); const x = Math.max(14, Math.min(86, ((event.clientX - bounds.left) / bounds.width) * 100)); const y = Math.max(14, Math.min(86, ((event.clientY - bounds.top) / bounds.height) * 100)); setCanvasObjects((current) => current.map((object) => object.id === item.id ? { ...object, x, y } : object)); } }} onPointerUp={(event) => { if (draggingCanvasObject === item.id) { event.currentTarget.releasePointerCapture(event.pointerId); setDraggingCanvasObject(null); } }} onClick={(event) => event.stopPropagation()}><span aria-hidden="true">{selectedCanvasObject === item.id ? "□" : ""}</span></button>)}</div>{result(canvasTool === "矩形" ? `矩形工具 · 对象 ${canvasObjects.length} 个 · 点击画布创建` : draggingCanvasObject !== null ? `正在移动矩形 ${draggingCanvasObject}` : `选择工具 · ${selectedCanvasObject === null ? "未选择对象" : `已选中矩形 ${selectedCanvasObject}`} · 对象 ${canvasObjects.length} 个`)}</div>;
    case "dialog":
      return <div className="demo-stack"><button className="ui-button primary" onClick={() => dialogRef.current?.showModal()}>打开对话框</button><dialog ref={dialogRef} className="dialog-demo" aria-labelledby={dialogTitleId} onClose={(event) => setMessage(event.currentTarget.returnValue === "confirm" ? "已确认删除" : "已取消")} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close("cancel"); }}><form method="dialog"><strong id={dialogTitleId}>确认删除？</strong><p>这个示例不会真正删除任何内容。</p><div><button value="cancel">取消</button><button className="danger" value="confirm">确认删除</button></div></form></dialog>{result(message)}</div>;
    case "popover":
      return <div className="demo-stack"><details className="popover-demo"><summary className="ui-button">显示格式</summary><div><strong>文字格式</strong><button onClick={() => setChoice("粗体")}>B</button><button onClick={() => setChoice("斜体")}>I</button><button onClick={() => setChoice("下划线")}>U</button></div></details>{result(`当前格式：${choice}`)}</div>;
    case "tooltip":
      return <div className="tooltip-wrap"><button className="icon-action" aria-describedby="tooltip-text">⌕</button><span id="tooltip-text" role="tooltip">搜索当前页面</span></div>;
    case "menu":
      return <div className="demo-stack"><details className="dropdown-demo context-menu-demo"><summary className="ui-button">更多操作 ⋯</summary><div className="mini-menu"><button onClick={() => setMessage("已重命名")}>重命名</button><button onClick={() => setMessage("已创建副本")}>创建副本</button><button onClick={() => setMessage("已归档")}>归档</button></div></details>{result(message)}</div>;
    case "bottomsheet":
      return <div className="sheet-stage"><div className="sheet-launch"><button className="ui-button primary" onClick={() => setOpen(true)}>选择排序方式</button>{result(`当前排序：${choice}`)}</div>{open && <><button className="sheet-scrim" aria-label="关闭底部工作表" onClick={() => setOpen(false)} /><section className="bottom-sheet" aria-label="排序方式"><strong>排序方式</strong>{["最近修改", "名称", "大小"].map((item) => <button key={item} className={choice === item ? "selected" : ""} onClick={() => { setChoice(item); setOpen(false); }}>{item}<span aria-hidden="true">{choice === item ? "✓" : ""}</span></button>)}</section></>}</div>;
    case "teaching":
      return <div className="demo-stack teaching-demo"><button className="ui-button" aria-expanded={open} onClick={() => setOpen(!open)}>查看新功能</button><div className="teaching-tip-slot">{open && <div className="teaching-tip"><strong>试试全局搜索</strong><p>按 Ctrl + K 可以从任何页面查找术语。</p><button onClick={() => setOpen(false)}>知道了</button></div>}</div></div>;
    case "notification":
      return <div className="demo-stack"><button className="ui-button" onClick={() => setOpen(true)}>模拟通知</button>{open && <aside className="notification-demo"><div><strong>UI 图鉴</strong><span>术语数据已更新</span></div><button aria-label="关闭通知" onClick={() => setOpen(false)}>×</button></aside>}</div>;
    case "snackbar":
      return <div className="demo-stack snackbar-demo"><button className="ui-button primary" onClick={() => { setOpen(true); setMessage("项目已删除"); }}>删除项目</button><div className="snackbar-slot">{open && <div className="snackbar"><span>项目已删除</span><button onClick={() => { setOpen(false); setMessage("删除已撤销"); }}>撤销</button></div>}</div>{result(message)}</div>;
    case "toast":
      return <div className="demo-stack"><button className="ui-button" onClick={() => setOpen(true)}>显示 Toast</button>{open && <div className="toast"><span>链接已复制</span><button aria-label="关闭" onClick={() => setOpen(false)}>×</button></div>}</div>;
    case "infobar":
      return <div className="demo-stack">{!open ? <button className="ui-button" onClick={() => setOpen(true)}>显示信息栏</button> : <div className="info-bar"><span>ⓘ</span><div><strong>同步已暂停</strong><p>连接网络后将自动继续。</p></div><button aria-label="关闭信息栏" onClick={() => setOpen(false)}>×</button></div>}</div>;
    case "badge":
      return <div className="demo-stack"><button className="badge-host" onClick={() => setCount(count + 1)}>🔔<span>{count}</span></button><button className="text-button" onClick={() => setCount(0)}>清空计数</button>{result(`未读：${count}`)}</div>;
    case "progress":
      return <label className="field">下载进度<progress max="100" value={value}>{value}%</progress><input type="range" min="0" max="100" value={value} onChange={(event) => setValue(Number(event.target.value))} />{result(`${value}%`)}</label>;
    case "progress-ring":
      return <div className="demo-stack"><div className="progress-ring" role="progressbar" aria-label="处理进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} style={{ "--progress": `${value * 3.6}deg` } as CSSProperties}><span>{value}%</span></div><button className="text-button" onClick={() => setValue((value + 25) % 100)}>增加演示进度</button>{result(`当前进度：${value}%`)}</div>;
    case "spinner":
      return <div className="demo-stack"><button className="ui-button" onClick={() => setActive(!active)}>{active ? "停止加载" : "开始加载"}</button><div className={`spinner ${active ? "running" : ""}`} aria-label={active ? "正在加载" : "加载已停止"} />{result(active ? "正在加载…" : "加载已停止")}</div>;
    case "skeleton":
      return <div className="demo-stack">{active ? <div className="loaded-card"><span className="avatar">UI</span><div><strong>内容已经载入</strong><p>骨架屏被真实内容替换。</p></div></div> : <div className="skeleton-demo" aria-label="内容正在加载"><span /><div><i /><i /></div></div>}<button className="text-button" onClick={() => setActive(!active)}>{active ? "重新模拟加载" : "载入内容"}</button></div>;
    default:
      return result("交互示例准备中");
  }
}

function TermCard({ term, showDetails }: { term: Term; showDetails: boolean }) {
  const source = SOURCES[term.source];
  return (
    <article className="term-card" id={`term-${term.id}`}>
      <header>
        <div className="term-title-line"><h3>{term.zh}</h3><p className="english" lang="en">{term.en}</p></div>
        <p>{term.description}</p>
        <div className="term-meta-line"><div className="term-kickers"><span className={`platform ${term.platform.toLowerCase()}`}>{term.platform}</span><span>{term.category}</span></div>{showDetails && <a className="term-source-link" href={source.href} target="_blank" rel="noreferrer">参考官方目录 ↗</a>}</div>
      </header>
      <div className="demo-well"><DemoRenderer type={term.demo} /></div>
    </article>
  );
}

type Region = { id: string; zh: string; en: string; description: string };

const WINDOWS_REGIONS: Region[] = [
  { id: "frame", zh: "应用窗口", en: "Application window", description: "承载应用界面的顶层窗口。" },
  { id: "window-frame", zh: "窗口框架", en: "Window frame / Window chrome", description: "窗口外围用于标识、移动、缩放和关闭窗口的系统区域。" },
  { id: "nonclient", zh: "非客户区", en: "Non-client area", description: "标题栏、窗口按钮和边框等通常由系统管理的区域。" },
  { id: "client", zh: "客户区", en: "Client area", description: "由应用绘制和管理内容的窗口内部区域。" },
  { id: "titlebar", zh: "标题栏", en: "Title bar", description: "显示应用身份，并提供拖动和窗口管理功能。" },
  { id: "app-icon", zh: "应用图标", en: "App icon", description: "标识窗口所属应用的图形。" },
  { id: "window-title", zh: "窗口标题", en: "Window title", description: "说明应用、文档或当前窗口用途的文字。" },
  { id: "drag-region", zh: "拖动区域", en: "Drag region", description: "按住后可以移动窗口的标题栏区域。" },
  { id: "caption", zh: "标题栏按钮", en: "Caption buttons", description: "最小化、最大化/还原和关闭按钮的统称。" },
  { id: "resize-border", zh: "调整大小边框", en: "Resize border", description: "拖动后改变窗口尺寸的外围区域。" },
  { id: "app-shell", zh: "应用壳", en: "Application shell", description: "跨页面持续存在的标题、导航、命令和内容承载框架。" },
  { id: "menubar", zh: "菜单栏", en: "Menu bar", description: "横向排列文件、编辑等顶级菜单。" },
  { id: "commandbar", zh: "命令栏", en: "Command bar", description: "显示当前页面最常用的命令。" },
  { id: "navpane", zh: "导航窗格", en: "Navigation pane", description: "承载应用主要页面入口的侧边区域。" },
  { id: "breadcrumb", zh: "面包屑栏", en: "Breadcrumb bar", description: "显示当前位置的层级路径。" },
  { id: "page-header", zh: "页面标题区", en: "Page header", description: "显示当前页面标题和相关操作的顶部区域。" },
  { id: "page-host", zh: "页面宿主", en: "Page host / Content frame", description: "装载、切换页面并维护导航历史的内容容器。" },
  { id: "content", zh: "主内容区", en: "Main content", description: "承担当前页面核心任务的区域。" },
  { id: "inspector", zh: "属性检查器", en: "Property inspector", description: "查看并即时修改当前对象属性的界面模式，不是 WinUI 内置控件。" },
  { id: "details-pane", zh: "详细信息窗格", en: "Details pane", description: "显示当前所选项目详细内容或属性的辅助窗格。" },
  { id: "footer", zh: "状态栏/页脚", en: "Status area / Footer", description: "显示窗口状态、选择数量和次级信息的底部区域。" },
];

const ANDROID_REGIONS: Region[] = [
  { id: "appwindow", zh: "应用窗口", en: "App window", description: "当前 Activity 或应用承载界面的窗口。" },
  { id: "statusbar", zh: "状态栏", en: "Status bar", description: "系统绘制的时间、网络、电量与通知区域。" },
  { id: "topbar", zh: "顶部应用栏", en: "Top app bar", description: "显示页面标题、导航和关键操作。" },
  { id: "scaffold", zh: "界面骨架", en: "Scaffold", description: "组织应用栏、导航、FAB、Snackbar 和内容区。" },
  { id: "content", zh: "内容区", en: "Content area", description: "显示当前目的地主要内容的区域。" },
  { id: "fab", zh: "悬浮操作按钮", en: "Floating action button", description: "突出当前界面最重要的操作。" },
  { id: "snackbar", zh: "Snackbar 宿主", en: "Snackbar host", description: "为短暂底部反馈预留的显示位置。" },
  { id: "navbar", zh: "应用导航栏", en: "Navigation bar", description: "切换 3–5 个顶级目的地的应用内导航。" },
  { id: "systemnav", zh: "系统导航栏/手势柄", en: "System navigation bar", description: "系统返回、主页、概览或手势导航区域。" },
];

const CREATIVE_REGIONS: Region[] = [
  { id: "app-shell", zh: "应用壳", en: "Application shell", description: "跨文档持续存在的导航、命令和内容框架。" },
  { id: "document-tabs", zh: "文档标签栏", en: "Document tab strip", description: "在多个已打开文档之间切换。" },
  { id: "toolbox", zh: "工具箱", en: "Toolbox", description: "集中放置选择、绘制和编辑工具。" },
  { id: "canvas", zh: "画布/工作区", en: "Canvas / Work area", description: "创建和编辑可视对象的主要区域。" },
  { id: "layers", zh: "图层面板", en: "Layers panel", description: "管理对象层级、可见性和顺序。" },
  { id: "inspector", zh: "属性检查器", en: "Property inspector", description: "编辑当前选择对象的具体属性。" },
  { id: "timeline", zh: "时间轴", en: "Timeline", description: "按时间排列媒体片段、关键帧或动画。" },
  { id: "status", zh: "状态区", en: "Status area", description: "显示缩放比例、坐标、选择数量等上下文信息。" },
];

function RegionInfo({ region, regions, onSelect }: { region: Region; regions: Region[]; onSelect: (id: string) => void }) {
  return <aside className="region-info"><span>当前术语</span><div role="status" aria-live="polite" aria-atomic="true"><h3>{region.zh}</h3><p className="english" lang="en">{region.en}</p><p>{region.description}</p></div><small>点击界面区域，或使用下列文字索引继续认识术语。</small><nav className="region-choices" aria-label="本界面包含的区域">{regions.map((item) => <button key={item.id} aria-pressed={item.id === region.id} onClick={() => onSelect(item.id)}>{item.zh}</button>)}</nav></aside>;
}

function WindowsScene() {
  const [selectedId, setSelectedId] = useState("content");
  const [nav, setNav] = useState("概览");
  const [inspector, setInspector] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const select = (id: string) => setSelectedId(id);
  const region = WINDOWS_REGIONS.find((item) => item.id === selectedId) ?? WINDOWS_REGIONS[0];
  return <div className="scene-layout"><div className={`windows-scene ${maximized ? "maximized" : ""}`} onClick={() => select("frame")}><div className="win-titlebar" onClick={(event) => { event.stopPropagation(); select("titlebar"); }}><span className="app-mark">UI</span><strong>界面术语图鉴</strong><div className="caption-buttons" onClick={(event) => { event.stopPropagation(); select("caption"); }}><button aria-label="最小化">—</button><button aria-label={maximized ? "还原" : "最大化"} onClick={() => setMaximized(!maximized)}>{maximized ? "❐" : "□"}</button><button aria-label="关闭示例窗口">×</button></div></div><div className="win-menubar" onClick={(event) => { event.stopPropagation(); select("menubar"); }}><button>文件</button><button>编辑</button><button>视图</button></div><div className="win-commandbar" onClick={(event) => { event.stopPropagation(); select("commandbar"); }}><button>＋ 新建</button><button>☆ 收藏</button><button onClick={() => setInspector(!inspector)}>属性</button><button aria-label="更多命令">⋯</button></div><div className="win-body"><nav className="win-navpane" onClick={(event) => { event.stopPropagation(); select("navpane"); }}>{["概览", "控件", "完整界面", "来源"].map((item) => <button key={item} className={nav === item ? "selected" : ""} aria-current={nav === item ? "page" : undefined} onClick={() => setNav(item)}>{item}</button>)}</nav><section className="win-content" onClick={(event) => { event.stopPropagation(); select("content"); }}><button className="scene-breadcrumb" onClick={(event) => { event.stopPropagation(); select("breadcrumb"); }}>图鉴　/　{nav}</button><h4>{nav}</h4><div className="scene-content-grid"><button>按钮 Button</button><button>开关 Switch</button><button>对话框 Dialog</button><button>导航 Navigation</button></div></section>{inspector && <aside className="win-inspector" onClick={(event) => { event.stopPropagation(); select("inspector"); }}><strong>属性检查器</strong><label>名称<input defaultValue="按钮" /></label><label>状态<select defaultValue="默认"><option>默认</option><option>禁用</option></select></label></aside>}</div><footer className="win-status" onClick={(event) => { event.stopPropagation(); select("footer"); }}><span>已选择 1 项</span><span>缩放 100%</span></footer></div><RegionInfo region={region} regions={WINDOWS_REGIONS} onSelect={select} /></div>;
}

function AndroidScene() {
  const [selectedId, setSelectedId] = useState("content");
  const [destination, setDestination] = useState("首页");
  const [snackbar, setSnackbar] = useState(false);
  const region = ANDROID_REGIONS.find((item) => item.id === selectedId) ?? ANDROID_REGIONS[0];
  return <div className="scene-layout"><div className="phone-scene" onClick={() => setSelectedId("appwindow")}><div className="phone-status" onClick={(event) => { event.stopPropagation(); setSelectedId("statusbar"); }}><span>9:41</span><span>◉　▰</span></div><header className="phone-topbar" onClick={(event) => { event.stopPropagation(); setSelectedId("topbar"); }}><button aria-label="返回">←</button><strong>{destination}</strong><button aria-label="更多">⋮</button></header><div className="phone-content" onClick={(event) => { event.stopPropagation(); setSelectedId("content"); }}><span className="scaffold-label" onClick={(event) => { event.stopPropagation(); setSelectedId("scaffold"); }}>Scaffold</span><article><span>UI</span><div><strong>{destination}内容</strong><p>应用主要内容显示在这里。</p></div></article><article><span>MD</span><div><strong>Material 组件</strong><p>支持触摸、键盘和自适应布局。</p></div></article></div><button className="phone-fab" aria-label="新建" onClick={(event) => { event.stopPropagation(); setSelectedId("fab"); setSnackbar(true); }}>＋</button>{snackbar && <div className="phone-snackbar" onClick={(event) => { event.stopPropagation(); setSelectedId("snackbar"); }}><span>已新建项目</span><button onClick={() => setSnackbar(false)}>关闭</button></div>}<nav className="phone-navbar" onClick={(event) => { event.stopPropagation(); setSelectedId("navbar"); }}>{["首页", "收藏", "账户"].map((item) => <button key={item} className={destination === item ? "selected" : ""} aria-current={destination === item ? "page" : undefined} onClick={() => setDestination(item)}><span>{item === "首页" ? "⌂" : item === "收藏" ? "☆" : "○"}</span>{item}</button>)}</nav><button className="gesture-handle" aria-label="系统手势导航区域" onClick={(event) => { event.stopPropagation(); setSelectedId("systemnav"); }} /></div><RegionInfo region={region} regions={ANDROID_REGIONS} onSelect={setSelectedId} /></div>;
}

function CreativeScene() {
  const [selectedId, setSelectedId] = useState("canvas");
  const [tool, setTool] = useState("选择");
  const [layer, setLayer] = useState("标题");
  const region = CREATIVE_REGIONS.find((item) => item.id === selectedId) ?? CREATIVE_REGIONS[0];
  return <div className="scene-layout"><div className="creative-scene" onClick={() => setSelectedId("app-shell")}><div className="creative-top"><strong>Studio</strong><button>文件</button><button>编辑</button><button>视图</button></div><div className="document-tabs" onClick={(event) => { event.stopPropagation(); setSelectedId("document-tabs"); }}><button className="selected">封面设计 ×</button><button>组件库 ×</button><button aria-label="新建文档">＋</button></div><div className="creative-body"><aside className="toolbox" onClick={(event) => { event.stopPropagation(); setSelectedId("toolbox"); }}>{["选择", "文字", "矩形", "画笔"].map((item) => <button key={item} aria-label={`${item}工具`} aria-pressed={tool === item} className={tool === item ? "selected" : ""} onClick={() => setTool(item)}>{item === "选择" ? "↖" : item === "文字" ? "T" : item === "矩形" ? "□" : "✎"}</button>)}</aside><div className="creative-canvas" onClick={(event) => { event.stopPropagation(); setSelectedId("canvas"); }}><div className="canvas-object"><strong>UI 图鉴</strong><span>{tool}工具</span></div></div><aside className="creative-side"><section onClick={(event) => { event.stopPropagation(); setSelectedId("layers"); }}><strong>图层</strong>{["标题", "卡片", "背景"].map((item) => <button key={item} className={layer === item ? "selected" : ""} aria-pressed={layer === item} onClick={() => setLayer(item)}>◉ {item}</button>)}</section><section onClick={(event) => { event.stopPropagation(); setSelectedId("inspector"); }}><strong>属性</strong><label>X<input value="120" readOnly /></label><label>Y<input value="84" readOnly /></label></section></aside></div><div className="timeline" onClick={(event) => { event.stopPropagation(); setSelectedId("timeline"); }}><button aria-label="播放时间轴">▶</button><span /><span className="playhead" /></div><footer className="creative-status" onClick={(event) => { event.stopPropagation(); setSelectedId("status"); }}><span>{layer}</span><span>100%　1920 × 1080</span></footer></div><RegionInfo region={region} regions={CREATIVE_REGIONS} onSelect={setSelectedId} /></div>;
}

const COMPARISONS = [
  { title: "Dropdown、ComboBox 与 Menu", summary: "选择值、输入值、执行命令是三种不同任务。", items: [["Dropdown", "从隐藏列表选择预设值。"], ["ComboBox", "可以选择，也可按配置输入文字。"], ["Menu", "列出要执行的命令，不是表单值。"]] },
  { title: "Toolbar、CommandBar 与 App bar", summary: "名称取决于平台与承载位置，不能简单互换。", items: [["Toolbar", "Fluent/Web 中的常用操作集合。"], ["CommandBar", "WinUI 的命令栏控件，会处理溢出。"], ["Top app bar", "Android 顶部的标题、导航与操作区域。"]] },
  { title: "Sidebar、Pane 与 Drawer", summary: "固定侧栏、布局窗格和临时抽屉的占位方式不同。", items: [["Sidebar", "通用的固定侧边区域。"], ["Pane", "布局或控件中的一个正式窗格。"], ["Drawer", "从边缘滑出的次级内容表面。"]] },
  { title: "Snackbar、Toast 与 InfoBar", summary: "短暂底部反馈、临时通知和持续内容内消息。", items: [["Snackbar", "Android 底部短暂反馈，可带一个动作。"], ["Toast", "短暂告知状态，通常不要求回应。"], ["InfoBar", "Windows 内容区内持续的状态消息。"]] },
  { title: "两种“状态栏”", summary: "Windows 应用底部状态区与 Android 系统顶部栏完全不同。", items: [["Status area", "桌面应用底部显示缩放、选择数量等。"], ["Android Status bar", "系统顶部显示时间、网络和通知。"]] },
  { title: "两种“导航栏”", summary: "应用内目的地导航与系统级返回/主页导航不能混淆。", items: [["Navigation bar", "Android 应用内切换顶级目的地。"], ["System navigation bar", "系统返回、主页、概览或手势区域。"]] },
];

const PAGE_TABS = [
  { id: "atlas", label: "控件图鉴" },
  { id: "screens", label: "完整界面" },
  { id: "compare", label: "易混对比" },
  { id: "sources", label: "资料来源" },
] as const;

type PageId = (typeof PAGE_TABS)[number]["id"];

export default function Home() {
  const [activePage, setActivePage] = useState<PageId>("atlas");
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<"全部" | Platform>("全部");
  const [category, setCategory] = useState<"全部" | Category>("全部");
  const [scene, setScene] = useState<"windows" | "android" | "creative">("windows");
  const [dark, setDark] = useState(false);
  const [composing, setComposing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [logNotice, setLogNotice] = useState("");

  useEffect(() => initializeBrowserLogging(), []);

  const filteredTerms = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TERMS.filter((term) => {
      const matchesPlatform = platform === "全部" || term.platform === platform;
      const matchesCategory = category === "全部" || term.category === category;
      const haystack = [term.zh, term.en, term.description, term.category, term.platform, ...term.aliases].join(" ").toLowerCase();
      return matchesPlatform && matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [category, platform, query]);

  const handleSearchChange = (value: string) => {
    setDraftQuery(value);
    if (!composing) setQuery(value);
  };

  const matchesSearch = (term: Term) => {
    const needle = query.trim().toLowerCase();
    const haystack = [term.zh, term.en, term.description, term.category, term.platform, ...term.aliases].join(" ").toLowerCase();
    return !needle || haystack.includes(needle);
  };

  const platformCount = (item: "全部" | Platform) => TERMS.filter((term) => (item === "全部" || term.platform === item) && (category === "全部" || term.category === category) && matchesSearch(term)).length;
  const categoryCount = (item: "全部" | Category) => TERMS.filter((term) => (item === "全部" || term.category === item) && (platform === "全部" || term.platform === platform) && matchesSearch(term)).length;

  const openPage = (page: PageId) => {
    logRun("页面导航", "切换页面", {
      operationId: createOperationId("navigation"),
      details: { page },
    });
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportLogs = () => {
    setLogNotice(downloadDiagnosticLogs() ? "已导出两份日志" : "日志导出失败");
  };

  const clearLogs = () => {
    setLogNotice(clearDiagnosticLogs() ? "诊断日志已清空" : "日志清理失败");
  };

  return (
    <main className="site-shell" data-theme={dark ? "dark" : "light"}>
      <a className="skip-link" href="#page-content">跳到页面内容</a>
      <header className="site-header">
        <button type="button" className="brand" onClick={() => openPage("atlas")} aria-label="打开控件图鉴页面"><span>UI</span><strong>控件与界面术语图鉴</strong></button>
        <nav className="header-tabs" role="tablist" aria-label="主页面标签页">
          {PAGE_TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`page-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activePage === tab.id}
              aria-controls={tab.id}
              tabIndex={activePage === tab.id ? 0 : -1}
              onClick={() => openPage(tab.id)}
              onKeyDown={(event) => {
                const lastIndex = PAGE_TABS.length - 1;
                const nextIndex = event.key === "ArrowRight"
                  ? (index + 1) % PAGE_TABS.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + PAGE_TABS.length) % PAGE_TABS.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? lastIndex
                        : -1;
                if (nextIndex < 0) return;
                event.preventDefault();
                const nextTab = PAGE_TABS[nextIndex];
                openPage(nextTab.id);
                event.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(`#page-tab-${nextTab.id}`)
                  ?.focus();
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? "切换为浅色" : "切换为深色"}>{dark ? "☀" : "☾"}</button>
      </header>

      <div id="page-content" className="page-content" tabIndex={-1}>
      {activePage === "atlas" && (
      <section className="atlas-section" id="atlas" role="tabpanel" aria-labelledby="page-tab-atlas" tabIndex={-1}>
        <div className="atlas-layout">
          <aside className="filter-bar" aria-label="控件筛选">
            <div className="filter-group" role="group" aria-label="按平台筛选"><span>平台</span>{(["全部", "通用", "Windows", "Android"] as const).map((item) => <button key={item} className={platform === item ? "active" : ""} aria-pressed={platform === item} onClick={() => setPlatform(item)}>{item}{showDetails && <small className="filter-count">{platformCount(item)}</small>}</button>)}</div>
            <label className="filter-search"><span aria-hidden="true">⌕</span><input type="search" value={draftQuery} onCompositionStart={() => setComposing(true)} onCompositionEnd={(event) => { setComposing(false); setQuery(event.currentTarget.value); }} onChange={(event) => handleSearchChange(event.target.value)} placeholder="搜索中文名、英文名或别名" aria-label="搜索控件" />{draftQuery && <button type="button" onClick={() => { setDraftQuery(""); setQuery(""); }} aria-label="清除搜索">清除</button>}</label>
            <div className="filter-group categories" role="group" aria-label="按分类筛选"><span>分类</span><button className={category === "全部" ? "active" : ""} aria-pressed={category === "全部"} onClick={() => setCategory("全部")}>全部{showDetails && <small className="filter-count">{categoryCount("全部")}</small>}</button>{CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}{showDetails && <small className="filter-count">{categoryCount(item)}</small>}</button>)}</div>
            <label className="count-toggle"><span>详细显示</span><input type="checkbox" checked={showDetails} onChange={(event) => setShowDetails(event.target.checked)} /><i aria-hidden="true" /></label>
          </aside>
          <div className="term-results">
            {filteredTerms.length ? <div className="term-grid">{filteredTerms.map((term) => <TermCard key={term.id} term={term} showDetails={showDetails} />)}</div> : <div className="empty-state"><strong>没有找到匹配控件</strong><p>尝试清除搜索、平台或分类筛选。</p><button onClick={() => { setDraftQuery(""); setQuery(""); setPlatform("全部"); setCategory("全部"); }}>清除全部筛选</button></div>}
          </div>
        </div>
      </section>
      )}

      {activePage === "screens" && (
      <section className="screens-section" id="screens" role="tabpanel" aria-labelledby="page-tab-screens">
        <div className="section-heading"><div><span className="section-index">02</span><h2>完整界面由什么组成？</h2><p>点击界面中的区域，认识“控件之外”的结构术语。</p></div></div>
        <div className="scene-tabs" role="group" aria-label="完整界面类型"><button aria-pressed={scene === "windows"} onClick={() => setScene("windows")}>Windows 应用窗口</button><button aria-pressed={scene === "android"} onClick={() => setScene("android")}>Android 应用骨架</button><button aria-pressed={scene === "creative"} onClick={() => setScene("creative")}>专业创作软件</button></div>
        <div className="scene-panel">{scene === "windows" ? <WindowsScene /> : scene === "android" ? <AndroidScene /> : <CreativeScene />}</div>
      </section>
      )}

      {activePage === "compare" && (
      <section className="compare-section" id="compare" role="tabpanel" aria-labelledby="page-tab-compare">
        <div className="section-heading"><div><span className="section-index">03</span><h2>容易混淆的术语</h2><p>展开任意一组，查看最短、最实用的区别。</p></div></div>
        <div className="comparison-grid">{COMPARISONS.map((comparison, index) => <details key={comparison.title} open={index === 0}><summary><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{comparison.title}</strong><small>{comparison.summary}</small></div><i>＋</i></summary><div className="comparison-body">{comparison.items.map(([name, description]) => <article key={name}><strong lang="en">{name}</strong><p>{description}</p></article>)}</div></details>)}</div>
      </section>
      )}

      {activePage === "sources" && (
      <section className="sources-section" id="sources" role="tabpanel" aria-labelledby="page-tab-sources">
        <div><span className="section-index">04</span><h2>资料来源与使用边界</h2><p>术语优先参考官方目录；本网站的中文说明、交互示例和视觉实现均为原创整理，没有复制官方网站页面。</p></div>
        <div className="source-links">{Object.values(SOURCES).map((source) => <a key={source.label} href={source.href} target="_blank" rel="noreferrer"><strong>{source.label}</strong><span>查看官方资料 ↗</span></a>)}</div>
        <p className="source-note">特别说明：斜线并列的英文名称表示相近概念或平台对应词，不代表它们是同一个 API。Fluent Toolbar 不等同于 WinUI CommandBar，Fluent Message bar 不等同于 WinUI InfoBar，Fluent Toast 也不等同于 Windows App notification；WinUI 3 当前没有第一方内置的 Ribbon、StatusBar 与 DataGrid。页面最后核对日期：2026-08-06。</p>
      </section>
      )}
      </div>

      <footer className="site-footer">
        <div><strong>UI 控件与界面术语图鉴</strong><span>为中文设计、开发与提示词写作整理</span></div>
        <output aria-live="polite">{logNotice}</output>
        <div className="footer-actions">
          <button type="button" onClick={exportLogs}>导出诊断日志</button>
          <button type="button" onClick={clearLogs}>清空诊断日志</button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>回到顶部 ↑</button>
        </div>
      </footer>
    </main>
  );
}
