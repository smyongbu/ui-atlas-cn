import { build } from "vite";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const temporaryDirectory = resolve(projectRoot, ".offline-build");
const outputDirectory = projectRoot;
const outputPath = resolve(projectRoot, "打开UI设计术语图鉴.html");

await rm(temporaryDirectory, { recursive: true, force: true });
await mkdir(temporaryDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  root: projectRoot,
  configFile: false,
  base: "./",
  build: {
    outDir: temporaryDirectory,
    emptyOutDir: true,
    minify: true,
    target: ["chrome100", "edge100", "firefox100"],
    rollupOptions: {
      input: resolve(projectRoot, "offline/index.html"),
    },
  },
});

const assetDirectory = resolve(temporaryDirectory, "assets");
const assetNames = await readdir(assetDirectory);
const javascriptName = assetNames.find((name) => name.endsWith(".js"));
const stylesheetName = assetNames.find((name) => name.endsWith(".css"));

if (!javascriptName || !stylesheetName) {
  throw new Error("离线构建没有生成完整的脚本和样式");
}

const [javascript, stylesheet] = await Promise.all([
  readFile(resolve(assetDirectory, javascriptName), "utf8"),
  readFile(resolve(assetDirectory, stylesheetName), "utf8"),
]);

const safeJavascript = javascript.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>UI 控件与界面术语图鉴</title>
    <style>${stylesheet}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${safeJavascript}</script>
  </body>
</html>
`;

await writeFile(outputPath, html, "utf8");
await rm(temporaryDirectory, { recursive: true, force: true });

console.log(outputPath);
