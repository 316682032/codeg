<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg custom build
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="Latest release" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="Upstream" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="License" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <strong>English</strong> · <a href="./README.zh-TW.md">繁體中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.fr.md">Français</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong>xintaofei's multi-agent coding workspace <a href="https://github.com/spacering-net/codeg">Codeg</a>, customized by keh4l</strong><br/>
  Every AI coding agent in one place, working together. Follows upstream closely and adds a few features.
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>Download</ins></a> · <a href="#install"><ins>Install guide</ins></a> · <a href="https://docs.codeg.app"><ins>Official docs</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="The Codeg workspace: a conversation with an agent beside its live diffs and the project's files" width="960" />
  </picture>
</p>

## What's different from the official build

<table>
  <tr>
    <td width="50%" valign="top">🤖 <strong>Kiro CLI built in</strong><br/>Uses the <code>kiro-cli</code> you installed: pick its model and mode, add MCP servers and skills, resume past sessions.</td>
    <td width="50%" valign="top">🪟 <strong>Tabs per window</strong><br/>With several windows on one server, turn tab sync off and each window keeps its own tabs; conversations and messages still sync.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">💭 <strong>Claude Code shows its thinking</strong><br/>Requests thinking summaries from the API, so the thinking section is no longer empty.</td>
    <td width="50%" valign="top">🌐 <strong>Translated replies and messages</strong><br/>Agent replies are translated into your language once they are finished, and a message translates to English in one keystroke, via Alibaba Cloud or Tencent Cloud translation models, at about a second per 1,000 characters.</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>Follows upstream</strong><br/>Upstream is merged in regularly; anything not listed here works exactly as in the official build.</td>
  </tr>
</table>

<details>
<summary><strong>Kiro CLI built in</strong>: details</summary>
<br/>

- Runs the `kiro-cli` you installed with [Kiro's own installer](https://kiro.dev/docs/getting-started/installation/).
- Pick its model, mode, reasoning effort and thinking in the composer, and use its slash commands.
- Permission mode: ask every time, or trust all tools.
- Give it MCP servers and skills, and import and resume its past sessions.
- Upgrade in Settings → Agents runs Kiro's own updater.
- Conversations you had with Kiro as a custom agent move over to the built-in one.
- Proposed upstream as [spacering-net/codeg#851](https://github.com/spacering-net/codeg/pull/851).

</details>

<details>
<summary><strong>Tabs per window</strong>: details</summary>
<br/>

- It's the "Sync open conversation tabs across windows" switch in Settings → General, on by default: every window and device on the server (computer, tablet, phone) shares one set of open tabs, as in the official build.
- Turned off, opening, focusing or closing a conversation tab in one window leaves the others as they were, and a reload brings back that window's own tabs.
- Conversations, messages and deletions always reach every window, whichever way it is set.
- The switch is stored on the server: flip it in any window or on any device and every window and device connected to that server switches with it. (Up to 0.35.2-1 it was kept per browser and off by default in browsers.)
- Requested upstream in [spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547).

</details>

<details>
<summary><strong>Claude Code shows its thinking</strong>: details</summary>
<br/>

- With recent models the official build gets only an encrypted signature for each thinking block, so Claude's thinking stays empty.
- This build asks the API for thinking summaries — what the terminal `claude` shows with `showThinkingSummaries` on.
- To turn it off, add this to `~/.claude/settings.json` (or a project's `.claude/settings.json`):

  ```json
  "showThinkingSummaries": false
  ```

- Thinking from earlier conversations was never sent, so it can't be recovered.

</details>

<details>
<summary><strong>Translated replies and messages</strong>: details</summary>
<br/>

- Turned on in Settings → Translation with an API key from [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) or [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey); each platform bills its own usage. The default is Bailian's `qwen-mt-flash`, which took about 0.5 s per paragraph in testing.
- Replies: with the "Reply translation" switch on, a reply is translated once the agent has finished it, all of it in one request so the model sees the whole reply as context, and shown in place of the original; while the agent writes you see the original. The translate button under each reply switches back to the original, or translates that one reply when automatic translation is off. Thinking is translated when you expand it and follows the same button; code blocks and tool calls are not translated. The copy button copies what is on screen.
- Session names: with automatic reply translation on, the names the agent gives sessions are shown in your language too, in the sidebar, the tabs and the conversation header. A name you set yourself is left as written, and hovering a session in the sidebar shows the original.
- Messages: the composer's translate button, `⌘⇧L` (`Ctrl+Shift+L` on Windows and Linux) or the right-click menu translate the message box in place into the target language (English by default). Mentions, slash commands, paths and code stay as written, and `⌘Z` brings the original back in one step. Nothing is sent for translation until you ask, so a half-written draft never leaves the machine. "Translate when sending" does it on every send. Once sent, the translate button beside the message switches back to what you wrote before translating, and copying follows what is shown.
- On a rate limit it falls back to `qwen-mt-lite` or the other engine; a glossary pins down how specific terms are translated, and an entry with no translation keeps its term as written.
- API keys are kept in the OS keychain (on a server, in `tokens.json` in the data directory), never in the database. Translation requests connect directly, bypassing any proxy, and go through the proxy only when the network allows nothing else.
- Reply translations are for display only: the conversation history keeps the agent's original text. What you wrote before a message was translated is kept in the local database, and clearing the translation cache leaves it alone.

</details>

### Releases

|  | This build | Official build |
| --- | --- | --- |
| Downloads and updates | This repository's [Releases](https://github.com/keh4l/codeg/releases), signed with this fork's own key | [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) Releases |
| Version | `<upstream version>-<n>`: `0.33.0-2` is the 2nd build on upstream 0.33.0 | e.g. `0.33.0` |
| macOS notarization | None; allow it once on first launch (see [Install](#install)) | Yes |
| Docker image | None | Yes |

Updates never cross over: this build never updates to an official release, and an official build never updates to this one. The `keh4l` branch is upstream's `main` plus the changes above.

## Install

### Desktop

Download the latest installer from [Releases](https://github.com/keh4l/codeg/releases/latest):

| System | Installer |
| --- | --- |
| macOS (Apple Silicon or Intel) | `.dmg` |
| Windows (x64 or ARM64) | `-setup.exe` |
| Linux | `.deb`, `.rpm` or `.AppImage` |

It installs as the same app as the official Codeg: it replaces it and keeps your conversations and settings.

> [!NOTE]
> On macOS, if the first launch says the app is damaged or can't be opened, run this once, or allow it under System Settings → Privacy & Security:
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### Server

Linux or macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

Both install from this repository's releases, and the server's built-in updater uses them too.

### Going back to the official build

> [!WARNING]
> Back up your Codeg data first. This build adds a database migration for Kiro, and an official build that doesn't have it may refuse to start on the same data.

## Documentation

For features, configuration and usage, see the official [README](https://github.com/spacering-net/codeg#readme) and [docs.codeg.app](https://docs.codeg.app). They describe the official build; the differences are listed above.

## License and acknowledgments

Apache-2.0, see [LICENSE](../../LICENSE). Codeg is created by [xintaofei](https://github.com/xintaofei) and its contributors; this build only adds to it. Codeg builds on [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) and [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills).
