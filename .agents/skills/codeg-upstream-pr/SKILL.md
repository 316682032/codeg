---
name: codeg-upstream-pr
description: 把一个通用功能贡献给上游 spacering-net/codeg：从 main 开分支、跑全平台 CI、向上游提 PR、上游更新后保持 PR 可合并，并把功能同时用进 keh4l 定制版。用户说"提 PR 给上游 / 贡献到上游 / 更新上游 PR"时使用。
---

# 向上游提 PR

调用参数（可能为空，可能是功能描述、分支名或已有 PR 链接）：$ARGUMENTS

## 约定

- 仓库 `/Users/keh4l/Documents/Github/codeg`；`origin` = `keh4l/codeg`（fork，默认分支是 `keh4l`），`upstream` = `spacering-net/codeg`（2026-10 从 `xintaofei/codeg` 迁来，旧地址会重定向）。
- 给上游的分支**从 `main` 开，不从 `keh4l` 开**——`keh4l` 带着 fork 的更新地址、签名公钥、版本号，这些绝不能进上游 PR。
- 提交身份 `git -c user.name=keh4l -c user.email=2461454684@qq.com …`；提交信息照上游风格：`feat(<scope>): <小写开头的结论>` / `fix(...)` / `chore(...)`，正文分段讲清"为什么、怎么做、取舍"（参考 `git log upstream/main` 里的 `feat(antigravity): add Google Antigravity as a built-in agent`）。
- 只有用户明确要求时才提交、推送、开 PR。不推 `main`，PR 开出后不 rebase、不 force push（用 merge 跟进上游）。
- 已有先例：PR spacering-net/codeg#851（Kiro CLI），分支 `feat/kiro-builtin-agent`，0.36.0 合并进上游。

## 步骤

1. **开分支**
   ```bash
   gh repo sync keh4l/codeg -b main && git fetch origin && git fetch upstream
   git switch -c feat/<name> origin/main
   ```
2. **实现**：先读相关代码，照现有 agent / 模块的做法写；遵守 `AGENTS.md`（静态导出、`_core` 函数供 Tauri 与 web 共用、web handler 不直接调 service、10 种语言 i18n、README 10 种语言）。新增数据库迁移时，日期要晚于上游最新的迁移（`ls src-tauri/src/db/migration/ | sort | tail -3`）。
3. **本地全部门禁**（和 `.github/workflows/test.yml` 一致）
   ```bash
   pnpm lint . && pnpm browser:agent:check && pnpm browser:agent:types && pnpm test && pnpm build
   cd src-tauri
   cargo test --features test-utils
   cargo test --no-default-features --features server-bin --bin codeg-server --lib
   cargo clippy --all-targets --features test-utils -- -D warnings
   cargo clippy --no-default-features --features server-bin --bin codeg-server --lib -- -D warnings
   cargo clippy --no-default-features --features mcp-bin --bin codeg-mcp -- -D warnings
   ```
   CI 的 clippy 是最新 stable，本地往往更旧（曾因此漏掉 `explicit_counter_loop`）。查版本：
   `curl -fsSL https://static.rust-lang.org/dist/channel-rust-stable.toml | sed -n '/^\[pkg\.rustc\]/,/^version/{s/^version = "\([0-9.]*\).*/\1/p;}'`，
   然后 `rustup toolchain install <ver> --profile minimal -c clippy`，用 `CARGO_TARGET_DIR=/tmp/codeg-target-<ver> cargo +<ver> clippy …` 跑上面三条 clippy，结束后删掉那个目录。
   另外：`rustfmt --edition 2021` 只格式化**新文件**（上游老文件本来就没统一格式化，整文件格式化会制造大量无关改动）；前端改动跑 `pnpm exec prettier --check <files>`。
4. **提交、推送，在 fork 里先跑一遍全平台 CI**（Linux / macOS / Windows × desktop / server + 前端；本机跑不了 Windows/Linux）
   ```bash
   git push -u origin feat/<name>
   gh pr create -R keh4l/codeg --base main --head feat/<name> --draft \
     --title "[fork CI] <title>" --body "Fork-internal PR to run the Test workflow before the upstream PR. Not meant to be merged."
   ```
   注意：在这个仓库里不加 `-R` 时 `gh pr create` 可能默认指向上游，**每次都显式写 `-R`**。
   盯结果：`gh pr checks <n> -R keh4l/codeg` 或 `gh run list -R keh4l/codeg -w test.yml -L 2`。日志：`gh api --allow-escape-sequences repos/keh4l/codeg/actions/jobs/<job-id>/logs`。失败就修，作为新提交推上去。
5. **全绿后向上游开 PR**（先确认 `git rev-list --count HEAD..upstream/main` 为 0 或能干净合并：`git merge-tree --write-tree HEAD upstream/main`）
   ```bash
   gh pr create -R spacering-net/codeg --base main --head keh4l:feat/<name> \
     --title "<和主提交同一句，70 字符内>" --body-file /tmp/pr-body.md
   gh pr close <fork-pr-n> -R keh4l/codeg -c "CI verified; upstream PR: <url>"
   ```
   PR 描述三段：`## Summary`（改了什么、为什么）、`## Testing`（本地门禁 + fork CI 链接 + 手动验证）、`## Known limitations`（没测到的、刻意没做的）。首次贡献者的 PR，上游 CI 要维护者点"批准运行"才会跑。
6. **同时用进定制版**（用户要的话）：`git switch keh4l && git -c user.name=keh4l -c user.email=2461454684@qq.com merge --no-ff feat/<name>`，跑门禁后 `git push origin keh4l`。

## PR 开着时上游又更新了

```bash
git fetch upstream
git switch feat/<name>
git -c user.name=keh4l -c user.email=2461454684@qq.com merge upstream/main   # 解决冲突（规则同 codeg-fork-sync）
```
然后：重跑第 3 步门禁；检查上游是否新增了迁移、自己的迁移是否还排在最后（不是就改名到更晚的日期——只限这个迁移**还没随 fork 版本发布过**时）；推送；`gh pr reopen <fork-pr-n> -R keh4l/codeg` 重新跑 fork CI；更新上游 PR 描述里过时的内容（`gh pr edit <n> -R spacering-net/codeg --body-file …`）。查看 PR 状态和评审意见：
```bash
gh pr view <n> -R spacering-net/codeg --json state,mergeable,mergeStateStatus,reviews,comments
```
维护者提了修改意见：按意见改，新提交推到同一个分支，在 PR 里简短回复改了什么。

## 上游合并之后

功能会随 `codeg-fork-sync` 回到 `keh4l`。若上游是 squash 合并或改过再合，同步时这些文件会冲突，**以上游版本为准**；fork 发布过的迁移文件不要删。分支可以留着，或在用户同意后删除远端分支 `git push origin --delete feat/<name>`。
