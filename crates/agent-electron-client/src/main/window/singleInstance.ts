import type { BrowserWindow } from "electron";
import { focusExistingMainWindow } from "./mainWindowFocus";

interface SingleInstanceApp {
  requestSingleInstanceLock(): boolean;
  exit(code?: number): void;
  isReady(): boolean;
  on(event: "second-instance", listener: () => void): void;
}

interface SingleInstanceLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

export interface SingleInstanceOptions {
  app: SingleInstanceApp;
  getMainWindow: () => BrowserWindow | null;
  createWindow: () => void;
  markSecondInstancePending: () => void;
  logger: SingleInstanceLogger;
}

export function setupSingleInstanceLock({
  app,
  getMainWindow,
  createWindow,
  markSecondInstancePending,
  logger,
}: SingleInstanceOptions): boolean {
  const hasLock = app.requestSingleInstanceLock();

  if (!hasLock) {
    logger.warn("[App] Another instance is already running, exiting duplicate");
    app.exit(0);
    return false;
  }

  app.on("second-instance", () => {
    logger.info("[App] second-instance event received");

    if (focusExistingMainWindow(getMainWindow())) {
      return;
    }

    markSecondInstancePending();
    if (app.isReady()) {
      createWindow();
    }
  });

  return true;
}
