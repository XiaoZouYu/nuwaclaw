# SantiClaw Tauri 客户端

基于 Tauri 2.0 + React 18 + Ant Design 5 的跨平台桌面客户端应用。

## 快速开始

以下涉及 `make` 的命令均在当前仓库根目录执行（即包含 `crates/agent-tauri-client` 的上级目录）。

### 1. 安装必需工具

```bash
# 安装 Tauri CLI（Rust 版本）
cargo install tauri-cli

# 安装 pnpm（如果尚未安装）
npm install -g pnpm
```

### 2. 安装项目依赖

```bash
# 在仓库根目录下，进入本 crate 安装前端依赖
cd crates/agent-tauri-client
pnpm install
```

### 3. 运行开发模式

```bash
# 在项目根目录运行（自动进入 src-tauri 目录）
unset CI && make tauri-dev

# 或手动进入目录运行
cd crates/agent-tauri-client/src-tauri
unset CI && cargo tauri dev
```

### 4. 打包发布

```bash
# 在仓库根目录运行
unset CI && make tauri-bundle

# 打包产物位于 target/release/bundle/，例如：
# - macos/agent-tauri-client.app
# - dmg/agent-tauri-client_<version>_aarch64.dmg（Apple Silicon）或 _x64.dmg（Intel）
```

发布到 GitHub Releases 后，需在 **docs 项目** 执行 `make update-release` 并部署，用户端才能检测到新版本（见下方「自动更新与版本检查」）。

## 推荐 IDE 配置

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Makefile 命令

在当前仓库根目录执行：

| 命令 | 说明 |
|------|------|
| `make tauri-dev` | 开发模式运行（热重载） |
| `make tauri-bundle` | 打包当前平台应用（默认生产环境） |
| `make tauri-bundle-test` | 打包当前平台（测试环境） |
| `make tauri-bundle-prod` | 打包当前平台（生产环境） |
| `make tauri-bundle-all` | 打包所有平台（macOS/Windows/Linux） |

**注意**：运行前建议先执行 `unset CI` 避免环境变量冲突。

## 自动更新与版本检查

客户端通过 Tauri 插件检查更新，配置在 `src-tauri/tauri.conf.json` 的 `plugins.updater.endpoints`，当前指向：

- **当前使用**：`https://santisaas.oss-cn-chengdu.aliyuncs.com/santiclaw-tauri-client/latest/latest.json`

该文件由 GitHub Release 发布后同步到阿里云 OSS。

### 原始数据源

- **来源地址**：<https://github.com/XiaoZouYu/nuwaclaw/releases/latest/download/latest.json>
- 每次在 GitHub 发布新版本后，workflow 会把 `latest.json` 同步到对外 OSS 地址，客户端才能检测到新版本。

### 如何同步

同步由 GitHub Actions 的 Tauri release workflow 自动完成，产物会上传到 OSS 并更新：

`https://santisaas.oss-cn-chengdu.aliyuncs.com/santiclaw-tauri-client/latest/latest.json`
