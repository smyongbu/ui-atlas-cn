const APP_VERSION = "0.1.0";
const DEFAULT_MAX_BYTES = 96 * 1024;

const KEYS = {
  runtime: {
    current: "ui-atlas.runtime.current",
    backup: "ui-atlas.runtime.backup",
  },
  error: {
    current: "ui-atlas.error.current",
    backup: "ui-atlas.error.backup",
  },
};

function compactDetails(details) {
  if (!details || typeof details !== "object") return "";

  try {
    return ` details=${JSON.stringify(details)}`;
  } catch {
    return ' details={"status":"无法序列化"}';
  }
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 6000),
    };
  }

  return { message: String(error).slice(0, 6000) };
}

export function createOperationId(prefix = "op") {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function createDiagnosticLogger({
  storage,
  maxBytes = DEFAULT_MAX_BYTES,
  now = () => new Date(),
} = {}) {
  const append = (kind, level, module, message, operationId, details) => {
    if (!storage) return false;

    const key = KEYS[kind];
    const line = `[${now().toISOString()}] [${level}] [${module}] [operation=${operationId}] ${message}${compactDetails(details)}\n`;

    try {
      let current = storage.getItem(key.current) ?? "";
      if (current.length + line.length > maxBytes) {
        storage.setItem(key.backup, current.slice(-maxBytes));
        current = "";
      }
      storage.setItem(key.current, current + line);
      return true;
    } catch (error) {
      console.error("无法写入 UI 图鉴诊断日志", error);
      return false;
    }
  };

  return {
    run(module, message, { operationId = createOperationId(), details } = {}) {
      return append("runtime", "INFO", module, message, operationId, details);
    },
    error(module, message, error, { operationId = createOperationId(), details } = {}) {
      return append("error", "ERROR", module, message, operationId, {
        ...details,
        error: normalizeError(error),
      });
    },
    longOperation(module, stage, waitedMs, { operationId = createOperationId(), details } = {}) {
      return append("error", "WARN", module, "疑似长时间无响应", operationId, {
        ...details,
        stage,
        waitedMs,
      });
    },
    read(kind) {
      if (!storage) return "";
      const key = KEYS[kind];
      const backup = storage.getItem(key.backup) ?? "";
      const current = storage.getItem(key.current) ?? "";
      return [backup, current].filter(Boolean).join("");
    },
    clear() {
      if (!storage) return false;
      try {
        Object.values(KEYS).forEach(({ current, backup }) => {
          storage.removeItem(current);
          storage.removeItem(backup);
        });
        return true;
      } catch (error) {
        console.error("无法清空 UI 图鉴诊断日志", error);
        return false;
      }
    },
  };
}

let browserLogger;

function getBrowserLogger() {
  if (typeof window === "undefined") return undefined;
  browserLogger ??= createDiagnosticLogger({ storage: window.localStorage });
  return browserLogger;
}

export function logRun(module, message, options) {
  return getBrowserLogger()?.run(module, message, options) ?? false;
}

export function logError(module, message, error, options) {
  return getBrowserLogger()?.error(module, message, error, options) ?? false;
}

export function initializeBrowserLogging() {
  if (typeof window === "undefined") return () => {};

  const operationId = createOperationId("startup");
  logRun("应用", "页面启动", {
    operationId,
    details: {
      version: APP_VERSION,
      language: document.documentElement.lang || navigator.language,
      protocol: window.location.protocol,
    },
  });

  const handleError = (event) => {
    logError("全局异常", "捕获未处理错误", event.error ?? event.message, {
      operationId: createOperationId("error"),
      details: { source: "window.error" },
    });
  };
  const handleRejection = (event) => {
    logError("异步异常", "捕获未处理异步错误", event.reason, {
      operationId: createOperationId("rejection"),
      details: { source: "unhandledrejection" },
    });
  };
  const handleExit = () => {
    logRun("应用", "页面退出", { operationId });
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);
  window.addEventListener("beforeunload", handleExit);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
    window.removeEventListener("beforeunload", handleExit);
  };
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadDiagnosticLogs() {
  const logger = getBrowserLogger();
  if (!logger || typeof document === "undefined") return false;

  const operationId = createOperationId("export");
  logger.run("诊断日志", "开始导出日志", { operationId });

  try {
    downloadTextFile(
      "UI图鉴-运行日志.log",
      logger.read("runtime") || "暂无运行日志。\n",
    );
    downloadTextFile(
      "UI图鉴-错误日志.log",
      logger.read("error") || "暂无错误日志。\n",
    );
    logger.run("诊断日志", "日志导出完成", {
      operationId,
      details: { files: 2 },
    });
    return true;
  } catch (error) {
    logger.error("诊断日志", "日志导出失败", error, {
      operationId,
      details: { stage: "download" },
    });
    return false;
  }
}

export function clearDiagnosticLogs() {
  const logger = getBrowserLogger();
  if (!logger) return false;
  const cleared = logger.clear();
  if (cleared) {
    logger.run("诊断日志", "已清空历史日志", {
      operationId: createOperationId("clear"),
    });
  }
  return cleared;
}
