import assert from "node:assert/strict";
import test from "node:test";
import { createDiagnosticLogger } from "../app/browser-logger.mjs";

class MemoryStorage {
  #data = new Map();

  getItem(key) {
    return this.#data.get(key) ?? null;
  }

  setItem(key, value) {
    this.#data.set(key, String(value));
  }

  removeItem(key) {
    this.#data.delete(key);
  }
}

test("运行、错误与长时间操作分别写入正确日志", () => {
  const storage = new MemoryStorage();
  const logger = createDiagnosticLogger({
    storage,
    now: () => new Date("2026-08-12T08:00:00.000Z"),
  });

  logger.run("测试", "正常操作完成", {
    operationId: "op-normal",
    details: { stage: "done" },
  });
  logger.error("测试", "可控失败", new Error("示例异常"), {
    operationId: "op-failure",
    details: { stage: "controlled" },
  });
  logger.longOperation("测试", "等待资源", 65_000, {
    operationId: "op-long",
    details: { progress: "50%" },
  });

  const runtimeLog = logger.read("runtime");
  const errorLog = logger.read("error");

  assert.match(runtimeLog, /\[INFO\].*operation=op-normal.*正常操作完成/);
  assert.match(errorLog, /\[ERROR\].*operation=op-failure.*可控失败/);
  assert.match(errorLog, /示例异常/);
  assert.match(errorLog, /\[WARN\].*operation=op-long.*疑似长时间无响应/);
  assert.match(errorLog, /"stage":"等待资源"/);
  assert.match(errorLog, /"waitedMs":65000/);
});

test("日志达到上限后只保留当前文件和一份轮转备份", () => {
  const storage = new MemoryStorage();
  const logger = createDiagnosticLogger({
    storage,
    maxBytes: 180,
    now: () => new Date("2026-08-12T08:00:00.000Z"),
  });

  logger.run("轮转", "第一条较长的测试日志", { operationId: "rotate-1" });
  logger.run("轮转", "第二条较长的测试日志", { operationId: "rotate-2" });
  logger.run("轮转", "第三条较长的测试日志", { operationId: "rotate-3" });

  assert.match(logger.read("runtime"), /rotate-[123]/);
  assert.notEqual(storage.getItem("ui-atlas.runtime.backup"), null);
  assert.notEqual(storage.getItem("ui-atlas.runtime.current"), null);
});
