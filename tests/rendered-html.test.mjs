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
  assert.match(html, /完整界面由什么组成/);
  assert.match(html, /容易混淆的术语/);
  assert.match(html, /按钮/);
  assert.match(html, /Button/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("源码保留足量术语、中文输入法处理和无障碍样式", async () => {
  const [page, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  const termsBlock = page.slice(page.indexOf("const TERMS"), page.indexOf("const CATEGORIES"));
  const termCount = [...termsBlock.matchAll(/\bid:\s*"[^"]+"/g)].length;
  assert.ok(termCount >= 60, `当前术语数量不足：${termCount}`);
  assert.match(page, /onCompositionStart/);
  assert.match(page, /WINDOWS_REGIONS/);
  assert.match(page, /ANDROID_REGIONS/);
  assert.match(page, /CREATIVE_REGIONS/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /forced-colors/);
  assert.match(css, /:focus-visible/);
  assert.match(layout, /lang="zh-CN"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
