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
    <td width="50%" valign="top">🪟 <strong>Tabs per window</strong><br/>With several windows on one server, turn tab sync off and each window keeps its own tabs; conversations and messages still sync.</td>
    <td width="50%" valign="top">💭 <strong>Claude Code shows its thinking</strong><br/>Requests thinking summaries from the API, so the thinking section is no longer empty.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>Translated replies and messages</strong><br/>Each part of an agent's reply is translated into your language as soon as it is finished, thinking and question cards too, and a message translates to English in one keystroke, via Alibaba Cloud or Tencent Cloud translation models, at about a second per 1,000 characters.</td>
    <td width="50%" valign="top">🧩 <strong>Claude Code sub-agent sessions</strong><br/>Sub-agent cards get "View sub-agent session", which opens the sub-agent's full conversation the way it already does for Codex; a sub-agent can be watched while it runs.</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>Follows upstream</strong><br/>Upstream is merged in regularly; anything not listed here works exactly as in the official build. The built-in Kiro CLI, the first thing this build added, has been part of the official build since 0.36.0.</td>
  </tr>
</table>

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
- Replies: with the "Reply translation" switch on, each part of a reply is translated as soon as the agent has finished it (it moves on to a tool call or more thinking, or the turn ends), all of that part in one request so the model sees it whole, and shown in place of the original; while the agent writes you see the original. The translate button under each reply switches back to the original, or translates that one reply when automatic translation is off. Thinking is translated when you expand it and follows the same button; code blocks and tool calls are not translated. The copy button copies what is on screen.
- Session names: with automatic reply translation on, the names the agent gives sessions are shown in your language too, in the sidebar, the tabs and the conversation header. A name you set yourself is left as written, and hovering a session in the sidebar shows the original.
- Question cards: when an agent asks you something, the question and its options show translated by default (switch it off in Settings → Translation), and the button at the card's top right switches between original and translation; the answer still names the agent's own option. An answer typed under "Other" translates into the target language with the button beside it or `⌘⇧L`, and the same button puts it back; with "Translate when sending" on it is translated on submit. Questions marked secret are never sent for translation.
- Messages: the composer's translate button, `⌘⇧L` (`Ctrl+Shift+L` on Windows and Linux) or the right-click menu translate the message box in place into the target language (English by default). Mentions, slash commands, paths and code stay as written, and `⌘Z` brings the original back in one step. Nothing is sent for translation until you ask, so a half-written draft never leaves the machine. "Translate when sending" does it on every send. Once sent, the translate button beside the message switches back to what you wrote before translating, and copying follows what is shown.
- On a rate limit it falls back to `qwen-mt-lite` or the other engine; a glossary pins down how specific terms are translated, and an entry with no translation keeps its term as written.
- API keys are kept in the OS keychain (on a server, in `tokens.json` in the data directory), never in the database. Translation requests connect directly, bypassing any proxy, and go through the proxy only when the network allows nothing else.
- Reply translations are for display only: the conversation history keeps the agent's original text. What you wrote before a message was translated is kept in the local database, and clearing the translation cache leaves it alone.

</details>

<details>
<summary><strong>Claude Code sub-agent sessions</strong>: details</summary>
<br/>

- Claude Code keeps each sub-agent's (Agent / Task tool) whole conversation in a file of its own, `~/.claude/projects/<project>/<session id>/subagents/agent-<id>.jsonl`. In the official build the card shows only a summary of what it did and the final result (a background sub-agent's not even the summary), and that file can't be opened.
- This build adds a "View sub-agent session" button beside the card's title that opens the file in a side panel: the task the sub-agent was given, its thinking and replies, and every tool call with its input and output. It's the same button Codex and Grok sub-agent cards have.
- The button appears as soon as the sub-agent starts, in the foreground or the background. Opened while the sub-agent is still running, the panel refreshes every 2 seconds and shows the tool call in progress as running. Opened after the conversation is reloaded, it shows the file as it was then; close and reopen it to see the latest.
- Earlier conversations work too, as long as the sub-agent's file is still there.

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
> Back up your Codeg data first. This build adds database migrations the official build doesn't have (the translation tables, for one), and an official build may refuse to start on the same data.

## Documentation

For features, configuration and usage, see the official [README](https://github.com/spacering-net/codeg#readme) and [docs.codeg.app](https://docs.codeg.app). They describe the official build; the differences are listed above.

## License and acknowledgments

Apache-2.0, see [LICENSE](../../LICENSE). Codeg is created by [xintaofei](https://github.com/xintaofei) and its contributors; this build only adds to it. Codeg builds on [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) and [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills).
