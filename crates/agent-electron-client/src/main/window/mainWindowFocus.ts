import type { BrowserWindow } from "electron";

/**
 * Restore and focus the existing main window.
 *
 * Returns false when there is no usable window, allowing callers to create one.
 */
export function focusExistingMainWindow(
  mainWindow: BrowserWindow | null,
): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
  return true;
}
