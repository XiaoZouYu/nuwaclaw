import { describe, expect, it, vi } from "vitest";
import { focusExistingMainWindow } from "./mainWindowFocus";

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

describe("focusExistingMainWindow", () => {
  it("returns false when no main window exists", () => {
    expect(focusExistingMainWindow(null)).toBe(false);
  });

  it("returns false when the window has been destroyed", () => {
    const win = createWindowMock({
      isDestroyed: vi.fn(() => true),
    });

    expect(focusExistingMainWindow(win)).toBe(false);
    expect(win.focus).not.toHaveBeenCalled();
  });

  it("restores minimized window before focusing it", () => {
    const win = createWindowMock({
      isMinimized: vi.fn(() => true),
    });

    expect(focusExistingMainWindow(win)).toBe(true);
    expect(win.restore).toHaveBeenCalledOnce();
    expect(win.show).not.toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalledOnce();
  });

  it("shows hidden window before focusing it", () => {
    const win = createWindowMock({
      isVisible: vi.fn(() => false),
    });

    expect(focusExistingMainWindow(win)).toBe(true);
    expect(win.restore).not.toHaveBeenCalled();
    expect(win.show).toHaveBeenCalledOnce();
    expect(win.focus).toHaveBeenCalledOnce();
  });

  it("focuses an already visible window without changing visibility", () => {
    const win = createWindowMock();

    expect(focusExistingMainWindow(win)).toBe(true);
    expect(win.restore).not.toHaveBeenCalled();
    expect(win.show).not.toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalledOnce();
  });
});
