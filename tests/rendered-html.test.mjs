import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("服务端能渲染 UI 术语图鉴首页", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>UI 控件与界面术语图鉴<\/title>/);
  assert.match(html, /控件图鉴/);
  assert.match(html, /完整界面/);
  assert.match(html, /易混对比/);
  assert.match(html, /资料来源/);
  assert.match(html, /按钮/);
  assert.match(html, /Button/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("源码保留足量术语、中文输入法处理和无障碍样式", async () => {
  const [page, css, layout, logger, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/browser-logger.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  const termsBlock = page.slice(page.indexOf("const TERMS"), page.indexOf("const CATEGORIES"));
  const termCount = [...termsBlock.matchAll(/\bid:\s*"[^"]+"/g)].length;
  assert.equal(termCount, 60, `术语数量异常：${termCount}`);

  const demos = [...termsBlock.matchAll(/\bdemo:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(demos).size, termCount, "存在复用同一演示的重复术语条目");
  assert.doesNotMatch(termsBlock, /id:\s*"(?:hyperlink|overflow-menu|action-menu)"/);
  assert.match(page, /className="header-tabs" role="tablist"/);
  assert.match(page, /role="tab"/);
  assert.match(page, /aria-selected=\{activePage === tab\.id\}/);
  assert.match(page, /event\.key === "ArrowRight"/);
  assert.match(page, /role="tabpanel"/);
  assert.match(css, /\.header-tabs/);
  assert.match(css, /\.header-tabs button\[aria-selected="true"\]\s*\{[^}]*color: white;[^}]*background: var\(--accent\)/s);
  assert.doesNotMatch(css, /\.header-tabs\s*\{[^}]*border-bottom/s);
  assert.doesNotMatch(css, /\.header-tabs button::after/);
  assert.doesNotMatch(page, /header-segments/);
  assert.match(page, /className="tree-viewport" role="tree"/);
  assert.match(page, /aria-expanded=\{treeProjectOpen\}/);
  assert.match(page, /aria-expanded=\{treeComponentsOpen\}/);
  assert.match(css, /\.tree-viewport\s*\{[^}]*min-height: 164px/s);
  assert.match(css, /\.tree-children\s*\{[^}]*padding-left: 24px/s);
  assert.doesNotMatch(page, /<div className="tree-demo"><details/);
  assert.match(page, /splitPage/);
  assert.match(page, /aria-current=\{splitPage === item \? "page" : undefined\}/);
  assert.match(css, /\.split-content/);
  assert.match(page, /media-controls-row/);
  assert.match(page, /<output aria-label="当前播放进度">/);
  assert.match(css, /summary::-webkit-details-marker/);
  assert.match(css, /\.media-demo input\[type="range"\]/);
  assert.match(page, /dropdown-demo dropdown-button-demo/);
  assert.doesNotMatch(page, /新建　⌄/);
  assert.match(css, /\.dropdown-button-demo\s*\{[^}]*margin-bottom: 96px/s);
  assert.doesNotMatch(css, /\.dropdown-button-demo\[open\]/);
  assert.match(page, /className="dropdown-chevron"/);
  assert.match(css, /\.dropdown-button-demo > summary::after\s*\{[^}]*content: none/s);
  assert.match(page, /canvasObjects/);
  assert.match(page, /点击空白处创建矩形/);
  assert.match(page, /选择后拖动矩形/);
  assert.match(css, /\.canvas-demo-object\.selected/);
  assert.match(css, /\.command-demo details\s*\{[^}]*position: relative/s);
  assert.doesNotMatch(css, /\.command-demo:has\(details\[open\]\)/);
  assert.match(css, /\.command-demo\s*\{[^}]*margin-bottom: 60px/s);
  assert.match(page, /dropdown-demo context-menu-demo/);
  assert.doesNotMatch(css, /\.context-menu-demo\[open\]/);
  assert.match(css, /\.context-menu-demo\s*\{[^}]*margin-bottom: 134px/s);
  assert.match(css, /\.drawer-stage\s*\{[^}]*height: 220px/s);
  assert.match(css, /\.drawer-scrim\s*\{[^}]*z-index: 1/s);
  assert.match(css, /\.drawer-panel\s*\{[^}]*z-index: 2/s);
  assert.match(page, /className="split-chevron"/);
  assert.doesNotMatch(page, /aria-hidden="true">⌄<\/span>/);
  assert.match(css, /\.split-chevron/);
  assert.match(css, /\.list-details button\s*\{[^}]*place-items: center/s);
  assert.match(page, /className="media-control-icon"/);
  assert.doesNotMatch(page, /active \? "Ⅱ" : "▶"/);
  assert.match(css, /\.media-control-icon/);
  assert.match(page, /draggingCanvasObject/);
  assert.match(page, /setPointerCapture/);
  assert.match(page, /canvasObjects\.filter/);
  assert.match(css, /\.canvas-demo\s*\{[^}]*min-height: 210px/s);
  assert.match(page, /className="teaching-tip-slot"/);
  assert.match(page, /aria-expanded=\{open\}/);
  assert.match(css, /\.teaching-tip-slot\s*\{[^}]*min-height: 126px/s);
  assert.match(page, /dateMode/);
  assert.match(page, /内嵌日历/);
  assert.match(page, /滚轮日期/);
  assert.match(page, /calendarCells/);
  assert.match(page, /aria-label="选择年份"/);
  assert.match(css, /\.inline-calendar/);
  assert.match(css, /\.date-wheel/);
  assert.match(page, /className="snackbar-slot"/);
  assert.match(page, /setMessage\("项目已删除"\)/);
  assert.match(css, /\.snackbar-slot\s*\{[^}]*height: 58px/s);
  assert.match(css, /\.snackbar-demo\s*\{[^}]*height: 149px[^}]*grid-template-rows: 44px 58px 23px[^}]*align-content: start/s);
  assert.match(page, /role="switch" aria-checked=\{active\}/);
  assert.match(css, /\.switch:checked\s*\{/);
  assert.match(css, /\.switch:checked::after\s*\{/);
  assert.doesNotMatch(css, /\.switch\[aria-checked="true"\]/);
  assert.match(css, /\.accordion\s*\{[^}]*height: 158px[^}]*overflow-y: auto[^}]*scrollbar-gutter: stable/s);
  assert.match(page, /onCompositionStart/);
  assert.match(page, /WINDOWS_REGIONS/);
  assert.match(page, /ANDROID_REGIONS/);
  assert.match(page, /CREATIVE_REGIONS/);
  assert.match(page, /所选区域包含的元素/);
  assert.match(page, /WINDOWS_REGION_ELEMENTS/);
  assert.match(page, /文本填写框/);
  assert.doesNotMatch(page, /本界面包含的区域/);
  assert.match(css, /\.region-elements/);
  assert.doesNotMatch(css, /\.region-choices/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /forced-colors/);
  assert.match(css, /:focus-visible/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(logger, /UI图鉴-运行日志\.log/);
  assert.match(logger, /UI图鉴-错误日志\.log/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
