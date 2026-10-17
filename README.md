<h1 align="center">
  <img src="./public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg 定制版
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="最新版本" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="上游仓库" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="许可证" /></a>
</p>

<p align="center">
  <sub><strong>简体中文</strong> · <a href="./docs/readme/README.en.md">English</a> · <a href="./docs/readme/README.zh-TW.md">繁體中文</a> · <a href="./docs/readme/README.ja.md">日本語</a> · <a href="./docs/readme/README.ko.md">한국어</a> · <a href="./docs/readme/README.es.md">Español</a> · <a href="./docs/readme/README.de.md">Deutsch</a> · <a href="./docs/readme/README.fr.md">Français</a> · <a href="./docs/readme/README.pt.md">Português</a> · <a href="./docs/readme/README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong>xintaofei 的多智能体编码工作台 <a href="https://github.com/spacering-net/codeg">Codeg</a>，由 keh4l 定制</strong><br/>
  把各种 AI 编码智能体放在一起使用、相互协作。紧跟上游，另外加了几个功能。
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>下载</ins></a> · <a href="#安装"><ins>安装说明</ins></a> · <a href="https://docs.codeg.app"><ins>官方文档</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/workspace-dark.png" />
    <img src="./docs/images/workspace-light.png" alt="Codeg 工作区：和智能体的对话，旁边是实时 diff 和项目文件" width="960" />
  </picture>
</p>

## 与官方版的区别

<table>
  <tr>
    <td width="50%" valign="top">🪟 <strong>每个窗口一套标签</strong><br/>同一个服务器开多个窗口时，可以关掉标签同步，让每个窗口各管各的；会话和消息照常同步。</td>
    <td width="50%" valign="top">💭 <strong>Claude Code 显示思考过程</strong><br/>向 API 请求思考摘要，思考区域不再是空的。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>翻译回复和消息</strong><br/>智能体的回复每写完一段就翻译成你的语言，思考和提问卡片也能翻译，要发的消息一键翻译成英文；用阿里云百炼或腾讯云的翻译模型，一千字约一秒。</td>
    <td width="50%" valign="top">🔄 <strong>紧跟上游</strong><br/>上游的更新定期合并进来；没列在这里的功能，和官方版完全一样。定制版最早加的内置 Kiro CLI，0.36.0 起已并入官方版。</td>
  </tr>
</table>

<details>
<summary><strong>每个窗口一套标签</strong> 的细节</summary>
<br/>

- 开关是「设置 → 常规」里的「跨窗口同步会话标签」，默认开启：连到同一个服务的所有窗口和设备（电脑、平板、手机）共用一套打开的标签，和官方版一样。
- 关闭后，在一个窗口里打开、切换或关闭会话标签，其他窗口保持原样；刷新后恢复的是本窗口自己的标签。
- 会话、消息和删除操作不受开关影响，始终同步到所有窗口。
- 开关保存在服务端：在任意一个窗口或设备上切换，连到这个服务的所有窗口和设备会一起切换。（0.35.2-1 及以前按浏览器分别保存，浏览器端默认关闭。）
- 上游的对应需求：[spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547)。

</details>

<details>
<summary><strong>Claude Code 显示思考过程</strong> 的细节</summary>
<br/>

- 新模型在官方版里只返回加密的思考签名，所以思考内容一直是空的。
- 定制版向 API 请求思考摘要，和终端里打开 `showThinkingSummaries` 后的 `claude` 看到的一样。
- 不需要的话，在 `~/.claude/settings.json`（或项目的 `.claude/settings.json`）里加上：

  ```json
  "showThinkingSummaries": false
  ```

- 以前的对话当时就没有返回思考文本，无法补回。

</details>

<details>
<summary><strong>翻译回复和消息</strong> 的细节</summary>
<br/>

- 在「设置 → 翻译」里填入[阿里云百炼](https://bailian.console.aliyun.com/)或[腾讯云 TokenHub](https://console.cloud.tencent.com/tokenhub/apikey)的 API Key 后启用，费用按各平台的规则计。默认用百炼的 `qwen-mt-flash`，实测一段约 0.5 秒。
- 回复：打开「回复翻译」开关后，智能体每写完一段（接着去调用工具、思考，或整轮结束）就把这一段整段翻译（同一次请求，模型能看到整段的上下文），用译文替换原文显示；写的过程中先显示原文。每条回复下方的翻译按钮可以切回原文；没开自动翻译时，也可以用它手动翻译这一条。思考过程在展开时翻译，跟着同一个按钮切换；代码块和工具调用不翻译。复制按钮复制的是当前显示的内容。
- 会话名：开着自动翻译回复时，智能体起的会话名在侧边栏、标签页和会话标题栏里也显示成你的语言；你手动改过的名字不翻译，悬停在侧边栏的会话上能看到原名。
- 提问卡片：智能体向你提问时，问题和选项默认直接显示译文（「设置 → 翻译」里可以关掉），卡片右上角的按钮切换原文和译文；提交的仍是智能体给出的原选项。在「其他」里写的回答，用旁边的翻译按钮或 `⌘⇧L` 翻译成目标语言，再点一次恢复；开着「发送时自动翻译」时提交前自动翻译。标为保密的提问不会送去翻译。
- 消息：用输入框的翻译按钮、`⌘⇧L`（Windows 和 Linux 上是 `Ctrl+Shift+L`）或右键菜单，把输入框里的内容原地翻译成目标语言（默认英语）。@提及、斜杠命令、路径和代码保持原样，`⌘Z` 一步回到原文。只在你按下时才翻译，写到一半的草稿不会发出去。也可以打开「发送时自动翻译」。发出去之后，消息旁的翻译按钮可以切回你翻译前写的原文，复制也跟着显示的内容走。
- 遇到限流时自动换用 `qwen-mt-lite` 或另一个引擎；术语表可以固定专有名词的译法，译文留空表示保持原文不翻。
- API Key 存在系统钥匙串里（服务器版存在数据目录的 `tokens.json`），不写进数据库。翻译请求直连，不走代理；网络只能经代理出去时自动改走代理。
- 回复的译文只用于显示，会话记录里保存的仍是智能体的原文。消息翻译前的原文另存在本机数据库里，清空翻译缓存不会删掉它。

</details>

### 发布方式

|  | 定制版 | 官方版 |
| --- | --- | --- |
| 下载与更新 | 本仓库的 [Releases](https://github.com/keh4l/codeg/releases)，用本 fork 自己的密钥签名 | [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) 的 Releases |
| 版本号 | 上游版本-序号，如 `0.33.0-2` 是基于上游 0.33.0 的第 2 个定制版 | 如 `0.33.0` |
| macOS 公证 | 没有，第一次打开要放行一次（见[安装](#安装)） | 有 |
| Docker 镜像 | 没有 | 有 |

两边的更新互不相通：定制版不会被更新成官方版，官方版也不会被更新成定制版。`keh4l` 分支就是上游的 `main` 加上上面这些改动。

## 安装

### 桌面版

从 [Releases](https://github.com/keh4l/codeg/releases/latest) 下载最新的安装包：

| 系统 | 安装包 |
| --- | --- |
| macOS（Apple 芯片或 Intel） | `.dmg` |
| Windows（x64 或 ARM64） | `-setup.exe` |
| Linux | `.deb`、`.rpm` 或 `.AppImage` |

它和官方版是同一个应用：装上后会替换官方版，原有的对话和设置都会保留。

> [!NOTE]
> macOS 第一次打开时如果提示「已损坏」或「无法打开」，执行一次下面的命令，或者在「系统设置 → 隐私与安全性」里允许打开：
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### 服务端

Linux 或 macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows（PowerShell）：

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

两者都从本仓库的 Releases 安装，服务端内置的更新也走这里。

### 换回官方版

> [!WARNING]
> 先备份 Codeg 的数据。定制版有几个官方版没有的数据库迁移（例如翻译功能用的表），官方版可能无法用同一份数据启动。

## 文档

功能、配置和用法请看官方 [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.zh-CN.md) 和 [docs.codeg.app](https://docs.codeg.app)。它们描述的是官方版，区别见上文。

## 许可证与鸣谢

Apache-2.0，见 [LICENSE](./LICENSE)。Codeg 由 [xintaofei](https://github.com/xintaofei) 及贡献者开发，定制版只是在它的基础上增加内容。Codeg 构建在 [Agent Client Protocol](https://agentclientprotocol.com)、[Superpowers](https://github.com/obra/superpowers)、[OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) 和 [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) 之上。
