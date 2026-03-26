/**
 * 单元测试: migrate (数据目录迁移)
 *
 * 覆盖迁移路径:
 * 1. .nuwaclaw → .santiclaw (优先级最高)
 * 2. .nuwax-agent → .santiclaw
 * 3. .nuwaxbot → .santiclaw
 * 4. 无旧目录 → 跳过
 * 5. 新目录已存在但 DB 为空 → 从旧目录导入 DB
 * 6. 新目录已存在且 DB 有数据 → 跳过
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/home') },
}));

vi.mock('electron-log', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const mockExistsSync = vi.fn(() => false);
const mockRenameSync = vi.fn();
const mockCopyFileSync = vi.fn();

vi.mock('fs', () => ({
  existsSync: (p: string) => mockExistsSync(p),
  renameSync: (o: string, n: string) => mockRenameSync(o, n),
  copyFileSync: (o: string, n: string) => mockCopyFileSync(o, n),
}));

const mockReadSetting = vi.fn(() => null);
const mockWriteSetting = vi.fn();

vi.mock('../db', () => ({
  readSetting: (...args: unknown[]) => mockReadSetting(...args),
  writeSetting: (...args: unknown[]) => mockWriteSetting(...args),
}));

// Mock better-sqlite3 for isDbEmpty checks
const mockDbPrepare = vi.fn();
const mockDbClose = vi.fn();

vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => ({
    prepare: mockDbPrepare,
    close: mockDbClose,
  })),
}));

describe('migrateDataDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: isDbEmpty returns true (count=0)
    mockDbPrepare.mockReturnValue({ get: () => ({ count: 0 }) });
  });

  it('should skip when no legacy directory exists', async () => {
    mockExistsSync.mockReturnValue(false);

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    expect(mockRenameSync).not.toHaveBeenCalled();
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });

  it('should skip when new directory exists and DB has data', async () => {
    // new dir exists, new DB exists and has data
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('.santiclaw')) return true;
      return false;
    });
    // DB has data (count > 0)
    mockDbPrepare.mockReturnValue({ get: () => ({ count: 5 }) });

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    expect(mockRenameSync).not.toHaveBeenCalled();
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });

  it('should import legacy DB when new dir exists but DB is empty', async () => {
    const newDb = path.join('/mock/home', '.santiclaw', 'santiclaw.db');
    const oldDb = path.join('/mock/home', '.nuwaclaw', 'nuwaclaw.db');

    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.join('/mock/home', '.santiclaw')) return true;
      if (p === newDb) return true;
      if (p === oldDb) return true;
      if (p.endsWith('-wal') || p.endsWith('-shm')) return false;
      return false;
    });

    // First call: new DB is empty (count=0), second call: old DB has data (count=5)
    mockDbPrepare
      .mockReturnValueOnce({ get: () => ({ count: 0 }) })
      .mockReturnValueOnce({ get: () => ({ count: 5 }) });

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    expect(mockCopyFileSync).toHaveBeenCalledWith(oldDb, newDb);
    expect(mockRenameSync).not.toHaveBeenCalled();
  });

  it('should migrate .nuwaclaw → .santiclaw (priority 1)', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.join('/mock/home', '.santiclaw')) return false;
      if (p === path.join('/mock/home', '.nuwaclaw')) return true;
      if (p.endsWith('nuwaclaw.db')) return true;
      if (p.endsWith('santiclaw.db')) return false;
      if (p.endsWith('-wal') || p.endsWith('-shm')) return false;
      return false;
    });

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    // Directory rename
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.nuwaclaw'),
      path.join('/mock/home', '.santiclaw'),
    );

    // DB rename
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.santiclaw', 'nuwaclaw.db'),
      path.join('/mock/home', '.santiclaw', 'santiclaw.db'),
    );
  });

  it('should migrate .nuwax-agent → .santiclaw (priority 2)', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.join('/mock/home', '.santiclaw')) return false;
      if (p === path.join('/mock/home', '.nuwaclaw')) return false;
      if (p === path.join('/mock/home', '.nuwax-agent')) return true;
      if (p.endsWith('nuwax-agent.db')) return true;
      if (p.endsWith('santiclaw.db')) return false;
      if (p.endsWith('-wal') || p.endsWith('-shm')) return false;
      return false;
    });

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    // Directory rename
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.nuwax-agent'),
      path.join('/mock/home', '.santiclaw'),
    );

    // DB rename
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.santiclaw', 'nuwax-agent.db'),
      path.join('/mock/home', '.santiclaw', 'santiclaw.db'),
    );
  });

  it('should migrate .nuwaxbot → .santiclaw (priority 3)', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.join('/mock/home', '.santiclaw')) return false;
      if (p === path.join('/mock/home', '.nuwaclaw')) return false;
      if (p === path.join('/mock/home', '.nuwax-agent')) return false;
      if (p === path.join('/mock/home', '.nuwaxbot')) return true;
      if (p.endsWith('nuwaxbot.db')) return true;
      if (p.endsWith('santiclaw.db')) return false;
      if (p.endsWith('nuwaxbot.json')) return true;
      if (p.endsWith('santiclaw.json')) return false;
      if (p.endsWith('-wal') || p.endsWith('-shm')) return false;
      return false;
    });

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.nuwaxbot'),
      path.join('/mock/home', '.santiclaw'),
    );
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.santiclaw', 'nuwaxbot.db'),
      path.join('/mock/home', '.santiclaw', 'santiclaw.db'),
    );
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.santiclaw', 'nuwaxbot.json'),
      path.join('/mock/home', '.santiclaw', 'santiclaw.json'),
    );
  });

  it('should also rename WAL and SHM files if they exist', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.join('/mock/home', '.santiclaw')) return false;
      if (p === path.join('/mock/home', '.nuwaclaw')) return true;
      if (p.endsWith('nuwaclaw.db')) return true;
      if (p.endsWith('santiclaw.db')) return false;
      if (p.endsWith('nuwaclaw.db-wal')) return true;
      if (p.endsWith('nuwaclaw.db-shm')) return true;
      return false;
    });

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.santiclaw', 'nuwaclaw.db-wal'),
      path.join('/mock/home', '.santiclaw', 'santiclaw.db-wal'),
    );
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.santiclaw', 'nuwaclaw.db-shm'),
      path.join('/mock/home', '.santiclaw', 'santiclaw.db-shm'),
    );
  });

  it('should prefer .nuwaclaw over other legacy dirs when multiple exist', async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p === path.join('/mock/home', '.santiclaw')) return false;
      if (p === path.join('/mock/home', '.nuwaclaw')) return true;
      if (p === path.join('/mock/home', '.nuwax-agent')) return true;
      if (p === path.join('/mock/home', '.nuwaxbot')) return true;
      if (p.endsWith('nuwaclaw.db')) return true;
      if (p.endsWith('santiclaw.db')) return false;
      return false;
    });

    const { migrateDataDir } = await import('./migrate');
    migrateDataDir();

    // Should rename .nuwaclaw, not the older dirs
    expect(mockRenameSync).toHaveBeenCalledWith(
      path.join('/mock/home', '.nuwaclaw'),
      path.join('/mock/home', '.santiclaw'),
    );
    expect(mockRenameSync).not.toHaveBeenCalledWith(
      path.join('/mock/home', '.nuwaxbot'),
      expect.anything(),
    );
    expect(mockRenameSync).not.toHaveBeenCalledWith(
      path.join('/mock/home', '.nuwax-agent'),
      expect.anything(),
    );
  });
});

describe('migrateSettingsPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip when step1_config is null', async () => {
    mockReadSetting.mockReturnValue(null);

    const { migrateSettingsPaths } = await import('./migrate');
    migrateSettingsPaths();

    expect(mockWriteSetting).not.toHaveBeenCalled();
  });

  it('should skip when workspaceDir is not a string', async () => {
    mockReadSetting.mockReturnValue({ serverHost: 'example.com' });

    const { migrateSettingsPaths } = await import('./migrate');
    migrateSettingsPaths();

    expect(mockWriteSetting).not.toHaveBeenCalled();
  });

  it('should skip when workspaceDir does not match legacy prefix', async () => {
    mockReadSetting.mockReturnValue({ workspaceDir: '/Users/user/projects' });

    const { migrateSettingsPaths } = await import('./migrate');
    migrateSettingsPaths();

    expect(mockWriteSetting).not.toHaveBeenCalled();
  });

  it('should update workspaceDir from .nuwaxbot prefix', async () => {
    mockReadSetting.mockReturnValue({
      workspaceDir: path.join('/mock/home', '.nuwaxbot', 'workspace'),
      serverHost: 'example.com',
    });

    const { migrateSettingsPaths } = await import('./migrate');
    migrateSettingsPaths();

    expect(mockWriteSetting).toHaveBeenCalledWith('step1_config', {
      workspaceDir: path.join('/mock/home', '.santiclaw', 'workspace'),
      serverHost: 'example.com',
    });
  });

  it('should update workspaceDir from .nuwaclaw prefix', async () => {
    mockReadSetting.mockReturnValue({
      workspaceDir: path.join('/mock/home', '.nuwaclaw', 'workspace'),
    });

    const { migrateSettingsPaths } = await import('./migrate');
    migrateSettingsPaths();

    expect(mockWriteSetting).toHaveBeenCalledWith('step1_config', {
      workspaceDir: path.join('/mock/home', '.santiclaw', 'workspace'),
    });
  });

  it('should update workspaceDir from .nuwax-agent prefix', async () => {
    mockReadSetting.mockReturnValue({
      workspaceDir: path.join('/mock/home', '.nuwax-agent', 'workspace'),
    });

    const { migrateSettingsPaths } = await import('./migrate');
    migrateSettingsPaths();

    expect(mockWriteSetting).toHaveBeenCalledWith('step1_config', {
      workspaceDir: path.join('/mock/home', '.santiclaw', 'workspace'),
    });
  });
});
