---
name: codeg-add-builtin-agent
description: 给 Codeg 新增一个内置 ACP 智能体（像 Kiro CLI 那样）：先探测它真实的 ACP 协议，再按清单改后端、解析器、MCP/技能、前端、i18n、README，并在隔离环境里验证。用户说"加一个 agent / 内置某某 CLI / 集成新智能体"时使用。
---

# 新增内置智能体

调用参数（智能体名称、启动命令、文档链接等，可能为空）：$ARGUMENTS

范例：Kiro CLI 的完整集成在提交 `fb643193`（`git show --stat fb643193` 看全部文件，`git show fb643193 -- <file>` 看具体改法）。动手前先决定目标：通用、上游也会要的 → 按 `codeg-upstream-pr` 从 `main` 开分支；只给自己用 → 从 `keh4l` 开分支。

## 1. 先摸清这个智能体（不要凭文档猜）

- 安装方式决定 `AgentDistribution`：npm 包 → `Npx`；按平台下载的二进制 → `Binary`；Python → `Uvx`；只能用厂商安装器、自己会更新 → `System { cmd, args, env, install_url, update_args }`（Kiro 用的就是它）。
- 用一个小脚本直接走 ACP（JSON-RPC over stdio），把每一行原样记到 jsonl：`initialize`（看 `agentCapabilities`、`loadSession`、MCP 支持 http/sse、`authMethods`）→ `session/new`（看 `modes`、`models`、`configOptions`）→ `session/prompt`（让它读文件、改文件、跑命令、搜索，记下 `tool_call` / `tool_call_update` 的 `title`、`kind`、`rawInput`、`rawOutput`、`_meta`）→ `session/request_permission` 的形状 → 扩展通知（`_<vendor>/…`）。
  ```python
  import subprocess, json, threading, time, os
  env = dict(os.environ, AGENT_HOME='/tmp/probe/home')          # 用它自己的 HOME 变量隔离
  for k in ('CODEG_DATA_DIR', 'KIRO_SESSION_ID'): env.pop(k, None)  # 在 Codeg 里跑时会继承这些
  p = subprocess.Popen(['<cmd>', 'acp'], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                       stderr=subprocess.DEVNULL, env=env, cwd='/tmp/probe/ws', text=True, bufsize=1)
  resp, wire = {}, open('/tmp/probe/wire.jsonl', 'w')
  def reader():
      for line in p.stdout:
          wire.write(line); wire.flush(); o = json.loads(line)
          if 'id' in o and 'method' not in o: resp[o['id']] = o
          elif o.get('method') == 'session/request_permission':
              allow = next(x for x in o['params']['options'] if x['kind'].startswith('allow'))
              p.stdin.write(json.dumps({'jsonrpc': '2.0', 'id': o['id'], 'result': {'outcome': {'outcome': 'selected', 'optionId': allow['optionId']}}}) + '\n'); p.stdin.flush()
          elif 'id' in o:
              p.stdin.write(json.dumps({'jsonrpc': '2.0', 'id': o['id'], 'error': {'code': -32601, 'message': 'no'}}) + '\n'); p.stdin.flush()
  threading.Thread(target=reader, daemon=True).start()
  n = [0]
  def call(method, params, timeout=240):
      n[0] += 1; i = n[0]
      p.stdin.write(json.dumps({'jsonrpc': '2.0', 'id': i, 'method': method, 'params': params}) + '\n'); p.stdin.flush()
      t = time.time()
      while i not in resp and time.time() - t < timeout: time.sleep(0.1)
      return resp.get(i)
  call('initialize', {'protocolVersion': 1, 'clientCapabilities': {}, 'clientInfo': {'name': 'probe', 'version': '0'}})
  sid = call('session/new', {'cwd': '/tmp/probe/ws', 'mcpServers': []})['result']['sessionId']
  call('session/prompt', {'sessionId': sid, 'prompt': [{'type': 'text', 'text': '<让它逐个调用各类工具>'}]})
  p.terminate()
  ```
- 找到它在磁盘上存会话历史的位置和格式（解析器要读），以及它读 MCP 配置、技能（skills）的位置。
- 探测在真实 HOME 里留下的测试会话要删掉；用户自己的会话不要动。命令需要网络时把 `HTTP(S)_PROXY` 等代理变量带上。

## 2. 改动清单（每项都先看已有 agent 怎么做，挑最像的那个照着写）

**后端核心**
- `src-tauri/src/models/agent.rs`：`AgentType` 变体、wire 名、显示名、registry id。加完先 `cargo check`，编译器会列出所有需要补分支的穷尽 match（含 `acp/latest_release.rs`、`acp/file_system_runtime.rs` 等），逐个按同类 agent 处理。
- `src-tauri/src/acp/registry.rs`：分发方式和启动参数；`acp/preflight.rs`：启动前检查；`acp/custom_registry.rs`：内置 registry id 与已注册自定义 agent 的冲突。
- `src-tauri/src/db/service/agent_setting_service.rs`：`default_enabled` 要包含新 agent（有守护测试）。
- `src-tauri/src/acp/connection.rs`：会话选择器（模型/模式/推理强度等，agent 不发 `configOptions` 时要自己合成）、扩展通知、斜杠命令、工具调用规范化（把它的工具名和参数映射成 Claude Code 风格的 `bash`/`read`/`edit`/`write`/`grep`/`glob`… 形状，并把结果包装拆开）、权限请求。测试放在同文件的 `mod <agent>_ext_tests`，用第 1 步抓到的真实帧。
- `src-tauri/src/acp/types.rs`、`acp/session_state.rs`：新增的会话状态。
- `src-tauri/src/commands/acp.rs`：技能目录 `SkillStorageSpec`、新命令（`_core` 函数）；`src-tauri/src/lib.rs` 注册 Tauri 命令；`src-tauri/src/web/router.rs` + `web/handlers/acp.rs` 加对应 web 路由（handler 只调 `_core`）。
- `src-tauri/src/commands/mcp.rs`：它的 MCP 配置文件位置和格式、传输类型限制、是否需要加入 ACP forward-skip 列表（agent 自己读配置文件时）。
- `src-tauri/src/commands/{experts,office_tools,science}.rs`：技能安装矩阵；`acp/delegation/tool_schema.json`、`acp/delegation/companion.rs`：委托目标列表。

**会话历史**
- `src-tauri/src/parsers/<agent>.rs`（新文件）+ `parsers/mod.rs` 注册 + `parsers/summary_cache.rs`（历史由多个文件组成时用 companion 缓存）+ `db/service/import_service.rs`（导入/备份）。解析器按启动环境找历史目录：提供 `<Agent>Parser::for_env(&AgentEnv)` 和 `resolve_<agent>_..._for_env`，用 `env.var_os(...)` 读搬目录的环境变量，在 `build_agent_parser` 里用 `for_env(env)` 构造；否则用户在智能体设置的环境变量里改了数据目录，codeg 还在默认目录里找历史（上游 #948）。工具调用用和实时流**同一个**规范化函数，保证实时和重新打开后显示一致。
- `src-tauri/tests/parsers_snapshot.rs` 加用例，`INSTA_UPDATE=new cargo test --features test-utils --test parsers_snapshot`，审过 `.snap.new` 再改名为 `.snap`。

**数据库迁移**（只在需要时）：例如用户以前把它注册成自定义 agent、registry id 和内置冲突 → 迁移把 `custom:<id>` 改成新的 wire 名（参考 `m20261001_000001_kiro_builtin_agent.rs`：覆盖所有存 agent 类型的表和 JSON 配置、冲突时不丢数据、`down` 为空）。日期晚于上游最新迁移。

**前端**
- `src/lib/types.ts`、`src/lib/api.ts`；`src/components/agent-icon.tsx`（图标）。
- `src/components/settings/acp-agent-settings.tsx`（+ `.test.tsx`）：版本卡片、环境变量键、专属配置面板（如 `kiro-config-panel.tsx`，权限模式照 Cursor 的 `CURSOR_FORCE` 做法）。
- `src/components/settings/mcp-settings.tsx`、`delegation-agent-defaults.tsx`。
- `src/lib/tool-call-normalization.ts`（+ test）：实时工具名识别（后端在 `_meta.<vendor>` 里打的规范名）。
- `src/i18n/messages/*.json`：10 种语言都要加。

**文档**：`README.md` 和 `docs/readme/README.*.md`（9 个）里的智能体数量词和列表。

## 3. 验证

- 全部门禁（同 `codeg-upstream-pr` 第 3 步，含最新 stable 的 clippy）。
- **隔离的桌面开发版**——不碰已安装 Codeg 的数据（`~/Library/Application Support/app.codeg`、`~/.codeg`），也不要杀它的进程：
  ```bash
  env -i HOME="$HOME" USER="$USER" PATH="$PATH" LANG="${LANG:-en_US.UTF-8}" TERM=xterm-256color \
    TMPDIR="$(getconf DARWIN_USER_TEMP_DIR)" HTTP_PROXY="$HTTP_PROXY" HTTPS_PROXY="$HTTPS_PROXY" ALL_PROXY="$ALL_PROXY" NO_PROXY="$NO_PROXY" \
    CODEG_DATA_DIR="$HOME/Library/Application Support/app.codeg.dev" CODEG_HOME="$HOME/.codeg-dev" \
    pnpm tauri dev --config '{"identifier":"app.codeg.dev"}' > /tmp/codeg-dev-run.log 2>&1 &
  ```
  在 Codeg 里运行的 agent 会继承 `CODEG_DATA_DIR`、`TMPDIR`、`KIRO_SESSION_ID`、`GIT_CONFIG_*`，所以必须用 `env -i` 清掉。要用真实数据测试时，先 `sqlite3 "<正式库>" ".backup '<dev 数据目录>/codeg.db'"` 复制一份，**迁移只在副本上跑**。
- **服务端 + 网页**：`pnpm build`，再在 `src-tauri/` 下 `cargo build --no-default-features --features server-bin --bin codeg-server`（不开 `server-bin` 不会产出这个二进制），然后用 `CODEG_HOST=127.0.0.1 CODEG_PORT=<端口> CODEG_TOKEN=<随机> CODEG_DATA_DIR=<副本目录> CODEG_HOME=<临时目录> CODEG_STATIC_DIR=$PWD/out src-tauri/target/debug/codeg-server` 启动（同样 `env -i` 并带上代理），浏览器打开 `/login` 填令牌。接口参数是 camelCase。告诉用户这个服务没有对外暴露、需要令牌。
- 实际走一遍：选择器切换真的到达 agent、斜杠命令、权限模式、读/写/改/命令/搜索/MCP 工具卡片显示、历史导入后与实时一致、升级/安装按钮。
- 测完：只停自己启动的进程；临时目录和测试数据先问用户再删。

## 4. 收尾

汇报改了什么、验证了什么、**没验证到的**（写进 PR 的 Known limitations）。提交、推送、开 PR 都要用户明确同意。
