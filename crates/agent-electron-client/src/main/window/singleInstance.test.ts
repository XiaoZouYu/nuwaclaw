import { describe, expect, it, vi } from "vitest";
import { setupSingleInstanceLock } from "./singleInstance";

function createAppMock(hasLock: boolean, ready = false) {
  const listeners: Record<string, () => void> = {};
  const app = {
    requestSingleInstanceLock: vi.fn(() => hasLock),
    exit: vi.fn(),
    isReady: vi.fn(() => ready),
    on: vi.fn((event: string, listener: () => void) => {
      listeners[event] = listener;
    }),
  };

  return { app, listeners };
}

function createWindowMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    isVisible: vi.fn(() => true),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    ...overrides,
  } as any;
}

function createOptions(app: ReturnType<typeof createAppMock>["app"]) {
  return {
    app,
    getMainWindow: vi.fn(() => null),
    createWindow: vi.fn(),
    markSecondInstancePending: vi.fn(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
}

describe("setupSingleInstanceLock", () => {
  it("exits immediately and skips listener registration when lock is denied", () => {
    const { app } = createAppMock(false);
    const options = createOptions(app);

    expect(setupSingleInstanceLock(options)).toBe(false);
    expect(app.exit).toHaveBeenCalledWith(0);
    expect(app.on).not.toHaveBeenCalled();
    expect(options.createWindow).not.toHaveBeenCalled();
  });

  it("registers second-instance handler when lock is acquired", () => {
    const { app } = createAppMock(true);
    const options = createOptions(app);

    expect(setupSingleInstanceLock(options)).toBe(true);
    expect(app.exit).not.toHaveBeenCalled();
    expect(app.on).toHaveBeenCalledWith(
      "second-instance",
      expect.any(Function),
    );
  });

  it("focuses the existing main window on second-instance", () => {
    const { app, listeners } = createAppMock(true);
    const options = createOptions(app);
    const win = createWindowMock({ isVisible: vi.fn(() => false) });
    options.getMainWindow.mockReturnValue(win);

    setupSingleInstanceLock(options);
    listeners["second-instance"]();

    expect(win.show).toHaveBeenCalledOnce();
    expect(win.focus).toHaveBeenCalledOnce();
    expect(options.markSecondInstancePending).not.toHaveBeenCalled();
    expect(options.createWindow).not.toHaveBeenCalled();
  });

  it("marks a pending focus when no window exists before app ready", () => {
    const { app, listeners } = createAppMock(true, false);
    const options = createOptions(app);

    setupSingleInstanceLock(options);
    listeners["second-instance"]();

    expect(options.markSecondInstancePending).toHaveBeenCalledOnce();
    expect(options.createWindow).not.toHaveBeenCalled();
  });

  it("creates a window when no window exists after app ready", () => {
    const { app, listeners } = createAppMock(true, true);
    const options = createOptions(app);

    setupSingleInstanceLock(options);
    listeners["second-instance"]();

    expect(options.markSecondInstancePending).toHaveBeenCalledOnce();
    expect(options.createWindow).toHaveBeenCalledOnce();
  });
});
