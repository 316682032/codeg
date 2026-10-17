---
name: codeg-fork-release
description: 为 keh4l/codeg 定制版发一个新版本（改版本号、写双语发版说明、打 tag、盯 Release 工作流、验证更新通道和签名）。用户说"发版 / 发新版本 / release / 打 tag"时使用。
---

# 发布定制版

调用参数（可能为空，可能是想要的版本号或这一版的要点）：$ARGUMENTS

## 约定

- 仓库 `/Users/keh4l/Documents/Github/codeg`，从 **`keh4l` 分支**发版；`origin` = `keh4l/codeg`。
- 提交身份 `git -c user.name=keh4l -c user.email=2461454684@qq.com …`，不改 git config。
- 版本号 = 上游版本 + `-N`（N 只能是数字，Windows 安装包要求）：上游 `0.32.4` 上的第一版是 `0.32.4-1`，再发是 `0.32.4-2`；同步到上游 `0.33.0` 后从 `0.33.0-1` 开始。带 `-rc` 的 tag 会被标成预发布。
- `release.yml` 由 tag `v*.*.*` 触发，检查两件事：tag 等于 `v` + `tauri.conf.json` 的 version；tag 指向的提交在默认分支 `keh4l` 上。**发版说明 = tag 指向的那个提交的提交信息**，标题是 `codeg vX`。
- 签名：更新签名私钥已存为 fork secrets `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`，本地备份在 `~/.codeg-signing/`。**不要读取、打印或复制里面的内容。**
- 没配 Apple 证书时 macOS 包是 ad-hoc 签名、未公证（配了 `APPLE_CERTIFICATE` 等 6 个 secrets 会自动正式签名+公证）。Docker 默认不发；要发需仓库变量 `CODEG_PUBLISH_DOCKER=true`，并配 `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`。
- 发版是公开且难撤回的操作：**推 tag 之前必须让用户确认版本号和发版说明。**

## 步骤

1. **准备**
   ```bash
   git switch keh4l && git pull --ff-only && git status --short   # 必须干净
   git fetch origin --tags
   git rev-list --count keh4l..origin/main   # >0 说明上游有新东西没合，问用户要不要先跑 codeg-fork-sync
   BASE=$(git show origin/main:src-tauri/tauri.conf.json | python3 -c 'import json,sys;print(json.load(sys.stdin)["version"])')
   git tag -l "v${BASE}-*" --sort=-v:refname | head -3      # 已有的 fork 版本
   PREV=$(git describe --tags --abbrev=0 --match 'v*-*' 2>/dev/null)   # 上一个 fork 版本
   ```
   新版本 `VER=${BASE}-<下一个数字>`（用户在参数里指定了就用用户的，但要符合上面的格式）。
2. **整理这一版的内容**
   ```bash
   git log --oneline --no-merges ${PREV}..keh4l              # fork 自己和合进来的改动
   git log --format='%h %s' --grep='^# Release version' ${PREV}..keh4l   # 期间合进来的上游版本
   ```
   上游发版提交的信息就是上游的发版说明，可以直接引用其中的要点。
3. **改版本号**（四处，和上游的发版提交一样）：
   - `package.json` 的 `"version"`
   - `src-tauri/tauri.conf.json` 的 `"version"`
   - `src-tauri/Cargo.toml` `[package]` 的 `version`
   - `src-tauri/Cargo.lock` 里 `name = "codeg"` 那个条目的 `version`

   检查：`(cd src-tauri && cargo metadata --format-version 1 --no-deps --locked >/dev/null && echo ok)`。
4. **写发版说明草稿并给用户确认**。格式照上游（英文在前，分隔线，中文在后；只写有内容的小节）：
   ```markdown
   # Release version <VER>

   <一两句概述：基于上游哪个版本，fork 加了什么>

   ## New
   - **<一句话结论>** — <细节>
   ## Improved
   ## Fixed
   ## Note
   - **This build updates from keh4l/codeg, not from the official releases**, and is signed with this fork's own update key.
   - **The macOS app is not notarized.** If macOS says it is damaged or can't be opened, run `xattr -cr /Applications/codeg.app` once, or allow it in System Settings → Privacy & Security.

   -----------------------------

   # 发布版本 <VER>

   <中文概述>

   ## 新增
   ## 改进
   ## 修复
   ## 注意
   - **这个版本从 keh4l/codeg 获取更新，不再接收官方版本的更新**，并使用本 fork 自己的更新签名密钥。
   - **macOS 应用没有经过 Apple 公证。** 如果提示「已损坏」或「无法打开」，执行一次 `xattr -cr /Applications/codeg.app`，或者在「系统设置 → 隐私与安全性」里允许打开。
   ```
   配了 Apple 证书之后，去掉"未公证"那两条。
5. **提交并推送**（用户确认后）
   ```bash
   git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
   git -c user.name=keh4l -c user.email=2461454684@qq.com commit -F /tmp/release-notes.md   # 第一行就是 "# Release version <VER>"
   git push origin keh4l
   ```
   看 `gh run list -R keh4l/codeg -w test.yml -b keh4l -L 1` 的结果。真正的代码问题要先修；只有"GitHub runner 换了新 Rust、clippy 在上游原有代码上报新 lint、上游 main 也一样红"这种情况可以不阻塞（Release 工作流不跑 lint/clippy），并在汇报里说明。
6. **打 tag 触发发版**
   ```bash
   REL=$(git log -1 --format=%h --grep="^# Release version ${VER}$" keh4l)
   git tag "v${VER}" "$REL" && git push origin "v${VER}"
   gh run list -R keh4l/codeg -w release.yml -L 1
   ```
   整个流程约 40–60 分钟（桌面 6 个平台 + 服务端 5 个）。等待时用 `gh run view <id> -R keh4l/codeg --json status,conclusion,jobs` 轮询，中间不要逐条播报。
7. **验证**
   ```bash
   gh release view "v${VER}" -R keh4l/codeg --json isDraft,isPrerelease,assets --jq '"draft=\(.isDraft) prerelease=\(.isPrerelease) assets=\(.assets|length)"'
   curl -fsSL https://github.com/keh4l/codeg/releases/latest/download/latest.json | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["version"], len(d["platforms"]))'
   ```
   期望：不是草稿；`latest.json` 的版本等于 `VER`，有 12 个平台条目，其中有 `linux-x86_64-rpm`（v0.32.4-1 时是 36 个附件）。RPM 从 0.36.0-1 起叫 `codeg-<上游版本>-<N>.<arch>.rpm`（RPM 的版本和 release），不再是 `codeg-<VER>-1.<arch>.rpm`，由 `release.yml` 里单独的 RPM 步骤打包。需要更进一步时，下载最小的 `codeg-server-darwin-arm64.tar.gz` 和它的 `.sha256`/`.sig`（用 `curl -C - --retry 3`，大文件容易中断），`shasum -a 256 -c` 校验，再用一个临时测试调用 `crate::update::verify::verify_release_signature(data, sig, VER)` 验签，验完删除临时测试。0.36.0 起签名必须写明版本（trusted comment 里的 `version:<VER>`，桌面版 `requireSignedVersion`、服务端 `verify_signed_version` 都会检查），验签失败说没写版本时，看 `release.yml` 的 `tauri signer sign` 是否还带着 `--app-version`。
8. **汇报**：版本号、Release 链接 `https://github.com/keh4l/codeg/releases/tag/v<VER>`、各平台构建结果、验证结果、需要用户注意的事。

## 出错时

- 某几个构建失败、原因是偶发（网络、runner）：`gh run rerun <id> -R keh4l/codeg --failed`，草稿 release 会被复用。
- 需要改代码才能修好：在 `keh4l` 上修复并推送，然后**问用户**选哪种：(a) 删掉草稿 release 和 tag 后在新提交上重打同名 tag（删 tag 属于破坏性操作），或 (b) 直接发下一个版本号 `-N+1`。
- 不要修改 `release.yml` 去绕过版本或默认分支检查。
