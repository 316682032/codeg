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
    <td width="50%" valign="top">🌐 <strong>Translated replies and messages</strong><br/>Each part of an agent's reply is translated into your language as soon as it is finished, thinking, question cards and todo lists too, and a message translates to English in one keystroke, via Alibaba Cloud or Tencent Cloud translation models, at about a second per 1,000 characters.</td>
    <td width="50%" valign="top">🧩 <strong>Claude Code sub-agent sessions</strong><br/>Sub-agent cards get "View sub-agent session", which opens the sub-agent's full conversation the way it already does for Codex; a sub-agent can be watched while it runs.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>Switch open conversations on a phone</strong><br/>On a phone, tap the conversation title to see every open conversation and how far each has got, then tap one to switch; the title lights up when another one is waiting for you.</td>
    <td width="50%" valign="top">🎨 <strong>Agents generate images</strong><br/>Set up the address, key and models of OpenAI, Grok, Gemini or a relay, and every agent that supports MCP can make and edit images, saved where it says; the image shows in the conversation, and the key never passes through the agent.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">⏳ <strong>Results for agents with short time-outs</strong><br/>Some agents wait only 30 to 60 seconds for a tool call. This build caps each wait per agent, returns in time and collects the rest on the next call, so a slow answer to a question no longer counts as no answer.</td>
    <td width="50%" valign="top">🗂️ <strong>Only the agents you use</strong><br/>Settings lists only the agents you added; the rest wait in “Add agents”, searchable and added several at a time. A new install enables only what is installed here, so the new-conversation picker stays short.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📋 <strong>Long-press to select text on a phone</strong><br/>Long-pressing text in a reply or the message box brings up the phone's own selection handles and copy menu instead of the conversation menu; select a reply with a finger and Copy Text / Quote / Ask appear under the message box, clear of the phone's menu.</td>
    <td width="50%" valign="top">🔁 <strong>Restart the server from the web</strong><br/>Settings → System gains “Restart codeg”: codeg deployed on a server restarts without logging in to the server, and the page reconnects by itself; restoring a backup on a server now restarts to apply it, too.</td>
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
- So does a custom agent that runs claude-agent-acp (a second Claude account, say, or Claude Code pointed at another Anthropic-compatible endpoint).
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
- Todo lists: the steps of an agent's todo list (the plan card in a reply, the floating plan over the conversation and the plan in Session Details) show translated by default, the whole list in one request (switch it off with "Translate todo lists automatically" in Settings → Translation), and the button at the plan card's top right switches between original and translation; with the switch off, the same button translates by hand.
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
- A custom agent that runs claude-agent-acp gets the button too, and keeps it after the conversation is reloaded.
- The button appears as soon as the sub-agent starts, in the foreground or the background. Opened while the sub-agent is still running, the panel refreshes every 2 seconds and shows the tool call in progress as running. Opened after the conversation is reloaded, it shows the file as it was then; close and reopen it to see the latest.
- Earlier conversations work too, as long as the sub-agent's file is still there.

</details>

<details>
<summary><strong>Switch open conversations on a phone</strong>: details</summary>
<br/>

- Below 768 px wide (a phone, or a very narrow browser window) the official build shows no conversation tab strip. Reaching another open conversation means finding it in the sidebar's full history, and a completed one, which the sidebar hides by default, can't be reached at all.
- This build turns the conversation title into a button: after the title come a ⌄ and the number of open conversations, with an amber dot on the number while another conversation waits for your approval or answer. It opens "Open conversations" from the bottom: every open conversation in tab order, each with its status (Needs you, In Progress, Review, Completed, Cancelled, Not sent). Tap one to switch to it, × to close it; you can also start a new conversation, or open the sidebar with "All conversations (incl. history)". Tap outside, drag it down or use the back gesture to close it.
- "Needs you" is only known while this device is connected to that conversation: it shows for conversations opened at least once on this device, and the others show their saved status.
- With "Sync open conversation tabs across windows" on (the default), a conversation closed on the phone closes on the computer too, just as closing its tab there would.
- At 768 px and wider (computers, tablets) nothing changes: the tab strip stays.
- A conversation opened from the sidebar starts as a preview (as on the desktop) that the next one opened replaces; here its title is in italics, and the 📌 next to it keeps it. Double-tapping it in the sidebar keeps it too, as a double click does on the desktop: on a phone the sidebar now waits a moment before closing, so the second tap lands on the same row.
- Requested in [keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10), [#12](https://github.com/keh4l/codeg/issues/12).

</details>

<details>
<summary><strong>Agents generate images</strong>: details</summary>
<br/>

- In Settings → Image generation, add a service: pick OpenAI API (OpenAI itself, Grok and most relays) or Gemini API (Google itself or a relay), leave the address empty for the official one, then add the key and model names such as `gpt-image-2`, `grok-imagine-image-2.0` or `gemini-3-pro-image`. You can add several. Test generates one small, low-quality image to check it works, billed by the service.
- Once the switch at the top of the page is on (the same one as "Generate images" in Settings → Collaboration → In-conversation tools, off by default) and at least one service has a key and a model, agents started from then on get two tools, `image_generate` and `image_get_result`. An agent can pick the model, aspect ratio, resolution and a transparent background, and pass reference images to edit an existing picture; without a model it gets the default one from the settings.
- The agent decides where the image is saved; a relative path is resolved against the conversation's working folder. Without one, images go to `~/.codeg/generated-images/<date>/`, a folder you can change in the settings.
- Each image gets a card in the conversation: while it is being made, the seconds so far; then the image, where it was saved (click to open), the service and model, the size and the time taken. The image is read from the file, so after reloading the conversation it shows for as long as the file is there.
- By default the agent also gets a copy about 512 pixels wide, so it can see the result before deciding whether to change it; this uses some of its context. Turn it off in the settings if the agent's model can't read images.
- An image often takes from tens of seconds to two minutes. When that is longer than the agent can wait for one tool call, it gets a job id first and collects the image with `image_get_result`; see the next section.
- Codeg makes the call itself; the agent only gets the image file. API keys are kept in the system keychain (on the server build, in `tokens.json` in the data folder), not in the database, and are not part of config sync.

</details>

<details>
<summary><strong>Results for agents with short time-outs</strong>: details</summary>
<br/>

- How long an agent waits for one MCP tool call varies: ZCode 30 seconds; Cursor, Kimi, DeepSeek and OpenCode 60 seconds; Codex 5 minutes; Claude Code, Qoder, CodeBuddy and Grok practically without a limit. In the official build, `get_delegation_status` (waiting for a delegated task's result) can wait a long time in one call and `ask_user_question` (a question for you) waits until you answer; past the deadline the agent treats the call as failed and carries on, so the question counts as unanswered.
- This build gives these tools a cap per agent, below its deadline: for example 20 seconds on ZCode, 45 seconds on OpenCode, 4 minutes on Codex; agents without a limit get no cap, as in the official build. When the cap is reached without a result, the call returns and tells the agent how to keep waiting.
- Questions: if you haven't answered by then, the question card stays where it is and the agent keeps waiting with a new tool, `get_question_answer`; once you answer, the answer shows in the original question card.
- Delegated tasks: one `get_delegation_status` call waits at most up to the cap, then returns the tasks' current status. Image generation works the same way; see the previous section.
- While waiting, the agent gets a progress update every 10 seconds, which lets agents that extend their deadline on progress, such as OpenCode, wait longer.

</details>

<details>
<summary><strong>Only the agents you use</strong>: details</summary>
<br/>

- There are close to 20 built-in agents, and the official build enables all of them, installed or not: a long settings list, a new-conversation picker crowded with agents that aren't installed (the conversation page never installs one, so picking one gets you nowhere), and an install check for every one each time the settings page opens.
- In this build, Settings → Agents lists only “My agents”, which you can still drag to reorder. “Add” in its title bar and the row below the list open “Add agents”: search by name or description, filter by installed / not installed, find the agents already installed here first, and add several at a time. One that isn't installed is installed from its details once added.
- The switch in an agent's details is “My agents”: turn it off to take the agent off the list, with undo. It is the official build's “enabled” setting, so the new-conversation picker, delegation and everything else follow it.
- Opening the settings page checks only “My agents”; any other agent is checked when you open it.
- When codeg has no settings for an agent yet (a fresh install, or a built-in added by a later release), it enables the agent only if it is detected as installed here. Codeg counts an agent as installed once the ACP adapter or CLI it runs is in place, so a fresh install often has none and the list starts empty: pick from “Add agents”. An agent you install later is not added by itself, and existing settings are never changed.
- After upgrading from an earlier build with agents in “My agents” that aren't installed, a hint at the top of the list offers once to “Keep only the installed” ones or keep things as they are (the choice is remembered per device).
- The new-conversation picker ends its row with a “+” that opens “Add agents”; when the agents don't all fit, it is at the bottom of the “more” menu instead. With no agent enabled, the picker's button opens “Add agents” too.

</details>

<details>
<summary><strong>Long-press to select text on a phone</strong>: details</summary>
<br/>

- In the official build the whole conversation area and the message box carry menus of their own, and a long press with a finger opens them too: hold a reply for about 0.7 s and the conversation menu (New Conversation, Export Conversation, …) appears; on Android the event the long press sends is cancelled as well, which cancels the phone's own word selection. Over HTTPS, a long press in the message box opens its own Cut / Copy / Select all menu. The phone's selection handles and copy menu never appear, so text in replies and in the message box is hard to copy.
- This build leaves a long press with a finger or a pen to the phone: selecting, dragging the handles, copying and pasting are the phone's own. A right click with a mouse still opens both menus, on a computer with a touch screen too.
- In the official build, the Copy Text / Quote / Ask bubble for a selected reply sits next to the selection, and so does the phone's menu, above it or below as the phone decides; a page can neither read nor move it, so the two often land on top of each other. In this build, a selection made with a finger puts these buttons and the number of characters selected under the message box, standing in for the folder and branch row until the selection goes; the phone's menu can't reach past the message box. Ask takes the question right in that row. A selection made with a mouse still gets the bubble above it.
- The message box menu's Quick messages are also under the “+” at the bottom left of the message box; translating a message has its own button.
- On iOS, the system menu for ordinary text on a web page has no Select All (only text fields do); to copy a whole reply, use the copy button under it.

</details>

<details>
<summary><strong>Restart the server from the web</strong>: details</summary>
<br/>

- Deployed on a server, the official build has no way to restart codeg from the web page: after changing a setting that needs a restart (appearance, language, provider list, browser proxy, …), or when the service misbehaves, you have to log in to the server and restart it there. Restoring a backup on a server is the same: the restore only applies after a restart, but the restart it calls only accepts a staged update, so it always ends with “the service could not restart, restart it manually”.
- This build adds “Restart codeg” under “Software Update” in Settings → System. “Restart” asks first, and the dialog says how many conversations are running and will be interrupted; after that it counts down, waits for the service to come back and reloads the page. Other open windows show “Restarting” in their status bar too.
- It restarts the way an in-place update does: under Docker or the supervisor (`--supervise`), the supervisor starts it again after `CODEG_RESTART_DELAY_MS`; run on its own, the process restarts in place (systemd and the like still see the same process). A plain restart doesn't enter the update's trial period and never triggers its automatic rollback. It can't restart while an update is downloading or installing.
- After restoring a backup on a server, “Restart now” in the result panel uses the same restart, so the restore applies by itself.
- Server builds only: not in the desktop app, nor in a browser connected to a desktop's built-in web service; like the in-place update, not on Windows servers yet.

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
