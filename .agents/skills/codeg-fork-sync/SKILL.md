---
name: codeg-fork-sync
description: 把上游 spacering-net/codeg 的更新同步进 keh4l/codeg 定制版（keh4l 分支），保留 fork 自己的定制并处理合并冲突。用户说"同步上游 / sync upstream / 合并上游更新 / 处理同步 PR 冲突"时使用。
---

# 同步上游到定制版

调用参数（可能为空，可能是同步 PR 的链接或编号）：$ARGUMENTS

## 仓库约定（先确认，不符就停下问用户）

- 本地仓库 `/Users/keh4l/Documents/Github/codeg`；`origin` = `keh4l/codeg`（fork），`upstream` = `spacering-net/codeg`（2026-10 从 `xintaofei/codeg` 迁来，旧地址会重定向；作者仍是 xintaofei）。
- `main`：只跟上游，**不在上面提交**；`keh4l`：定制版，fork 的默认分支，发版从这里打 tag；功能分支另开。
- 提交身份一律 `keh4l <2461454684@qq.com>`，用 `git -c user.name=keh4l -c user.email=2461454684@qq.com …` 传入，**不改 git config**。
- 只用 merge，**不 rebase、不 force push** `keh4l`（tag 都在它的历史上）。
- 自动化：`.github/workflows/sync-upstream.yml` 每天 UTC 01:17 把 `main` 快进到上游，`keh4l` 落后时开一个 `main → keh4l` 的 PR（标题 "Sync upstream into keh4l"）。

## 步骤

1. **看现状**
   ```bash
   git status --short            # 必须干净，不干净先问用户
   gh repo sync keh4l/codeg -b main   # 等于网页 Sync fork；main 有自己的提交会失败 → 停下报告
   git fetch origin && git fetch upstream
   git switch keh4l && git pull --ff-only
   git rev-list --count keh4l..origin/main   # 0 = 已是最新，结束
   gh pr list -R keh4l/codeg --base keh4l --head main --state open
   ```
2. **先记下定制清单**（合并时要护住的东西）：`git diff --stat origin/main...keh4l`。
3. **合并**
   ```bash
   git -c user.name=keh4l -c user.email=2461454684@qq.com merge origin/main
   ```
   没冲突也要做第 5 步验证。有冲突按第 4 步处理；想放弃：`git merge --abort`。
4. **解决冲突**：`git diff --name-only --diff-filter=U` 列出文件，逐个处理（规则见下表）。标记里 `HEAD` 是 keh4l（我们的），`origin/main` 是上游。整文件取一边用 `git checkout --ours|--theirs <file>`，但**文件里还有别的定制时不要整文件取上游**。改完 `git add`，再确认没有残留标记：
   ```bash
   grep -rnE '^(<<<<<<<|>>>>>>>)' src src-tauri/src src-tauri/tests .github docs README.md || echo clean
   ```
5. **验证**（合并后编译错误也是"冲突"：上游给 enum 加了 match、改了函数签名，fork 的代码要跟着补，见下方经验）。先跑完前端再跑 Rust，**不要并行**：桌面版编译要读 `pnpm build` 的产物 `out/`，构建途中它不存在，会报 ``resource path `../out` doesn't exist``。
   ```bash
   pnpm lint . && pnpm test && pnpm build
   cd src-tauri
   cargo test --features test-utils
   cargo test --no-default-features --features server-bin --bin codeg-server --lib
   cargo clippy --all-targets --features test-utils -- -D warnings
   cargo clippy --no-default-features --features server-bin --bin codeg-server --lib -- -D warnings
   cargo clippy --no-default-features --features mcp-bin --bin codeg-mcp -- -D warnings
   ```
   CI 用最新 stable Rust，本地可能更旧、漏掉新 lint。查 CI 版本：
   `curl -fsSL https://static.rust-lang.org/dist/channel-rust-stable.toml | sed -n '/^\[pkg\.rustc\]/,/^version/{s/^version = "\([0-9.]*\).*/\1/p;}'`，
   用旁路工具链跑 clippy（不动默认工具链）：`rustup toolchain install <ver> --profile minimal -c clippy`，`CARGO_TARGET_DIR=/tmp/codeg-target-<ver> cargo +<ver> clippy …`，跑完删掉那个目录（约 4 GB）。
   若新 lint 报在**上游原有代码**上、上游 main 的 CI 也一样红，不在 fork 里修（避免以后冲突），告诉用户等上游修。
6. **提交并推送**：有冲突时 `git -c user.name=keh4l -c user.email=2461454684@qq.com commit --no-edit`，然后 `git push origin keh4l`。那个同步 PR 会自动变成已合并。推送后看 `gh run list -R keh4l/codeg -w test.yml -b keh4l -L 1`。
7. **汇报**：合进了多少个上游提交、哪些文件冲突、各自怎么解决、测试结果。**不要顺手发版**，发版用 `codeg-fork-release`，并先问用户。

## 冲突处理规则

| 位置 | 规则 |
|---|---|
| `package.json`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock`（`name = "codeg"` 条目）、`src-tauri/tauri.conf.json` 的 `version` | 上游每次发版都会冲突。**取上游的版本号**（如 `0.33.0`），fork 发版时再改成 `0.33.0-1`。 |
| fork 配置：`tauri.conf.json` 的 `plugins.updater.pubkey` / `endpoints`，`src-tauri/src/update/verify.rs` 的 `TAURI_PUBKEY_B64`，`src-tauri/src/update/version.rs` 的两个 URL，`status-bar-update.tsx`(+test)、`system-network-settings.tsx` 里的 `keh4l/codeg` 链接，`install.sh` / `install.ps1` 的 `REPO` | **永远保留 fork 的**。上游若改了周边内容，把上游改动接进来但保留这些值。合并后检查：`grep -rn -e xintaofei -e spacering-net src-tauri/tauri.conf.json src-tauri/src/update install.sh install.ps1 src/components/layout/status-bar-update.tsx src/components/layout/status-bar-update.test.tsx src/components/settings/system-network-settings.tsx` 应无结果。 |
| `.github/workflows/release.yml`（可选 Apple 签名 + ad-hoc、Docker 由变量 `CODEG_PUBLISH_DOCKER` 控制）、`test.yml`（push 也跑 `keh4l`）、`sync-upstream.yml` | 接上游的改动，**保留 fork 的这几处改动**。改完用 actionlint 检查（命令见表格下方）。 |
| `README.md`、`docs/readme/README.*.md`（10 种语言） | **归定制版自己管，冲突一律取 fork 的**（`git checkout --ours`）。它们是精简的定制版说明，功能介绍链接到上游 README，所以上游的 README 改动不搬进来。定制版的 `README.md` 是**简体中文**，英文在 fork 独有的 `docs/readme/README.en.md`，fork 删掉了 `docs/readme/README.zh-CN.md`：上游改了这个文件时会出现 modify/delete 冲突，`git rm` 保持删除。只有定制版本身变了（加了功能、安装方式变了）才改，10 种语言一起改，结构（功能卡片、展开细节、「发布方式」表、安装小节）保持一致。 |
| `AGENTS.md`、`CLAUDE.md` | 接上游的改动，保留末尾的「定制版（keh4l/codeg）」一节。 |
| Kiro 相关（`parsers/kiro.rs`、`kiro-config-panel.tsx`、`connection.rs` 里的 kiro 段等） | 上游如果合并了 PR spacering-net/codeg#851（尤其是 squash 合并或改过再合），以**上游版本为准**取 `--theirs`；但共享文件里非 Kiro 的 fork 定制仍要保留。上游没合之前，这几处跟着上游的结构走：Kiro 的模型列表从回复顶层的 `models` 读，经 `apply_and_emit_session_config_options` 的 `session_models` 参数（0.35.2 起上游也用这个参数，fork 原来叫 `session_models_raw`）；`session/load` 只有 Kiro 走 `send_capturing_models`，外面和上游一样套 `unless_cancelled`；解析器和上游其它解析器一样按启动环境找目录（`KiroParser::for_env`，读 `KIRO_HOME`）。 |
| 窗口级标签（「跨窗口同步会话标签」开关）：`src/stores/tab-store.ts` 里按 `tabSyncEnabled` 分支的几处（`hydrate`、`runSaveEffect`、`handleTabsChanged`、`refetchTabs`、`setTabSync`、`handleConversationDeleted`、分组 blob 的读写和文件末尾的窗口本地函数），`tab-context.tsx` 的接线，后端 `filter_live_tab_targets`（`tab_service.rs`、`commands/conversations.rs`、web handler、`router.rs`、`lib.rs` 注册、`TabTarget` 模型），`general-settings.tsx` 里的 `<TabSyncSettingsSection />`，i18n 的 `TabSyncSettings`；fork 独有文件 `tab-sync-prefs.ts`、`window-tabs-storage.ts`、`tab-sync-settings.tsx`、`tab-context.window-local.test.tsx` | **两边都保留**，把 fork 的分支接到上游的新结构上。不变的规则：同步关闭时不读写共享的 `opened_tabs`、忽略 `tabs://changed`，删除靠 `conversation://changed` 和 `filter_live_tab_targets`；共享模式的代码路径和上游保持一致。jsdom 被当作浏览器，默认关闭同步，所以上游测试里驱动共享标签集合的部分要把 `workspace:tab-sync` 设成 `"true"`（`tab-context.test.tsx` 的 `seedWorkspaceStore` 和 `tab-store-reopen-position.test.ts` 已经这么做）；上游新增这类测试文件时照做。上游如果自己实现了 spacering-net/codeg#547，改用上游的方案，删掉这套。 |
| Claude 思考摘要：`src-tauri/src/acp/connection.rs` 的 `claude_raw_sdk_session_meta`（多了 `cwd` 参数）、`claude_session_meta`、`claude_thinking_summaries_enabled`、`claude_show_thinking_summaries_setting`，三个 `build_*_session_request` 里的调用，`acp/fork.rs` 的 `build_fork_request`（传 `Path::new(cwd)`），和对应测试（`fork.rs` 测试用 `claude_session_meta_at_work()` 代替写死的 `{"claudeCode": {"emitRawSDKMessages": true}}`） | **两边都保留**。不变的规则：Claude 的 `session/new`、`session/load`、`session/resume` 都带 `_meta.claudeCode.options.extraArgs["thinking-display"] = "summarized"`，只有 Claude 设置（用户、项目、local 三层）里显式写了 `showThinkingSummaries: false` 才不带。参数放在 `extraArgs` 里，不用 SDK 的 `thinking` 选项：那个选项会连思考模式一起改，还会盖掉 `MAX_THINKING_TOKENS`。上游如果也往 `_meta.claudeCode.options` 里加东西，合进同一个对象，不要互相覆盖。Claude 的 `session/fork` 必须带和 `session/resume` 完全一样的 `_meta`（claude-agent-acp 0.90.0 起按它判断能不能复用 fork 起的进程），所以也走 `claude_raw_sdk_session_meta`。上游或 claude-agent-acp 自己开始设置 thinking display（或 CLI 在非交互模式下也读 `showThinkingSummaries`）后，改用它们的方案，删掉这套。 |
| 服务器内存和僵尸进程修复（0.34.0-2 起，只在 fork 里）：`src-tauri/src/web/ws.rs` 的 `write_server_msg`、`enqueue_from_loop` 和 `handle_client_msg` 里的接线；`src-tauri/src/terminal/manager.rs` 里 `spawn_with_id` 出错时的回收和测试 `a_shell_that_exits_on_its_own_is_reaped`；`src-tauri/src/workspace_state/mod.rs` 的 `git_check_ignored_paths`；以及对应测试 | **两边都保留**，把 fork 的修复接到上游的新结构上。不变的规则：WS 主循环是出站队列唯一的读者，它自己产生的帧（snapshot、replay、detached、pong）不能在这个队列上 `send().await`，否则队列被转发任务填满时会死锁，泄漏的内存要到重启才释放；`std::process::Child`（包括 portable-pty 在 unix 上的 child）不能不 `wait` 就丢掉，否则留下僵尸进程。终端自己退出时的回收从 0.35.0 起由上游负责（`CompletedTerminals`：reader EOF 时 `try_wait`，记录被查看或删除时再 `try_wait`，从不 kill 关掉了 PTY 但还在跑的进程），fork 原来在 `read_loop` 末尾 kill + wait 的做法和这条策略冲突，已删掉，不要加回来；fork 的那个测试守的是 EOF 时就回收。上游改了这几处时，用 `cargo test --no-default-features --features server-bin --lib -- web::ws:: terminal::manager:: workspace_state::` 确认修复还在。上游自己修了同样的问题后，改用上游的方案，删掉这套。 |
| fork 自己加的功能 | 一般两边都保留，把 fork 的改动重新接到上游的新结构上。 |
| `Cargo.lock`、`pnpm-lock.yaml` | 先取上游的，再 `cargo build` / `pnpm install` 让它补回 fork 需要的条目；然后把 codeg 自己的版本号按第一行处理。 |
| 数据库迁移 `src-tauri/src/db/migration/` | 文件**只加不删、不改名**：fork 发布过的版本执行过的迁移，文件必须一直在，否则 sea-orm 报 "Migration file … is missing" 应用起不来。上游把同一个迁移改了名时，两个文件都留着（Kiro 迁移本身可重复执行）。`mod.rs` 的列表冲突时两边都保留，按日期排。 |

工作流文件改过之后：

```bash
curl -fsSL https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash | bash -s -- latest /tmp
/tmp/actionlint -shellcheck= .github/workflows/*.yml && rm /tmp/actionlint
```

## 经验（以前真遇到过）

- 上游新增了对 `AgentDistribution` 的穷尽 match（`acp/latest_release.rs`），fork 的 `System` 变体没有覆盖 → 编译失败。这类"无文本冲突的冲突"只有编译和测试能发现。0.35.0 时同类：上游给 `ExternalSource` 加了 `indexes` 字段（fork 的 Kiro 条目要补 `indexes: &[]`），上游新测试调用 `apply_and_emit_session_config_options` 时没带 fork 加的 `preferred_mode_id` 参数。0.35.2 时同类：`build_agent_parser` 改成接 `&AgentEnv`（fork 的 Kiro 要补 `for_env`），上游新写的 `acp/fork.rs` 调 `claude_raw_sdk_session_meta` 时没带 fork 加的 `cwd`，`apply_preferred_session_options` 多了 `session_models` 参数（fork 的 Kiro 分支要跟着传）。
- 上游的迁移日期排在 fork 迁移之后，而上游已发布的版本执行过它们 → fork 的迁移要改到更晚的日期才能按顺序跑（见 `fix(kiro): date the built-in migration after upstream's newest`）。改名只能在 fork 还没发布过该迁移时做。
- 合并用的脚本先读后写：曾经"打开即写"把 `mod.rs` 截成 0 字节，用 `git checkout -m -- <file>` 恢复冲突状态重来。按冲突块批量取一边后，`git diff origin/main -- <file>` 看一眼，确认没有吞掉行（曾把 `tauri.conf.json` 的 `version` 行弄丢）。
- 0.34.0 时上游从 `xintaofei/codeg` 迁到 `spacering-net/codeg`，把更新地址、安装脚本、应用内链接一并改了 → fork 配置表里那些文件全部冲突，冲突块里都是地址，逐块保留 `keh4l/codeg`，上游在同一文件里的其它改动照收。
- 终端测试用 `/bin/sh -l -i` 起 shell，会读本机的 `~/.profile`、`~/.bashrc`：本机配置会让上游的退出码测试失败（期望 7 实际 0），和合并无关。用空 HOME 跑：`H=$(mktemp -d); HOME=$H CARGO_HOME=~/.cargo RUSTUP_HOME=~/.rustup cargo test …; rm -rf $H`。
