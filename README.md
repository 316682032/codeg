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
    <td width="50%" valign="top">🌐 <strong>翻译回复和消息</strong><br/>智能体的回复每写完一段就翻译成你的语言，思考、提问卡片和待办任务也能翻译，要发的消息一键翻译成英文；用阿里云百炼或腾讯云的翻译模型，一千字约一秒。</td>
    <td width="50%" valign="top">🧩 <strong>查看 Claude Code 子智能体的会话</strong><br/>子智能体卡片上多了「查看子智能体会话」，像 Codex 一样打开它完整的会话记录；子智能体还在跑时就能看。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>手机上快速切换打开的会话</strong><br/>手机上点会话标题，就能看到所有打开的会话和各自的进度，点一下切过去；别的会话在等你处理时，标题旁会亮起提醒。</td>
    <td width="50%" valign="top">🎨 <strong>智能体生成图片</strong><br/>配好 OpenAI、Grok、Gemini 或中转站的地址、Key 和模型，所有支持 MCP 的智能体都能出图、改图，存到它指定的位置；图直接显示在对话里，Key 不经过智能体。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">⏳ <strong>短超时的智能体也能等到结果</strong><br/>有的智能体一次工具调用只等 30 到 60 秒。定制版按智能体限定每次等多久，没等到就先返回、下次接着取：你回答得慢，提问也不会被当成没回答。</td>
    <td width="50%" valign="top">🗂️ <strong>只列你在用的智能体</strong><br/>设置里只列你添加的智能体，其余的收进「添加智能体」，可搜索、一次多选；新装的 codeg 只启用本机已装的，新会话的选择器也清爽了。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📋 <strong>手机上长按选中文字</strong><br/>长按回复或输入框里的文字，出来的是手机自带的选中手柄和复制菜单，不再弹出会话菜单；手指选中回复后，「复制文本、引用、提问」出现在输入框下方，不和手机的菜单挤在一起。</td>
    <td width="50%" valign="top">🔁 <strong>在网页上重启服务器</strong><br/>「设置 → 系统」里多了「重启 codeg」：部署在服务器上的 codeg 不用登录服务器就能重启，页面会自动重新连接；在服务器上恢复备份后也会自动重启生效。</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>紧跟上游</strong><br/>上游的更新定期合并进来；没列在这里的功能，和官方版完全一样。定制版最早加的内置 Kiro CLI，0.36.0 起已并入官方版。</td>
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
- 待办任务：智能体列出的待办任务（回复里的计划卡片、对话上方的浮动计划和会话详情里的计划）每一步默认直接显示译文，整张清单一次请求（「设置 → 翻译」里的「自动翻译待办任务」可以关掉），计划卡片右上角的按钮切换原文和译文；关掉自动翻译时，用这个按钮手动翻译。
- 消息：用输入框的翻译按钮、`⌘⇧L`（Windows 和 Linux 上是 `Ctrl+Shift+L`）或右键菜单，把输入框里的内容原地翻译成目标语言（默认英语）。@提及、斜杠命令、路径和代码保持原样，`⌘Z` 一步回到原文。只在你按下时才翻译，写到一半的草稿不会发出去。也可以打开「发送时自动翻译」。发出去之后，消息旁的翻译按钮可以切回你翻译前写的原文，复制也跟着显示的内容走。
- 遇到限流时自动换用 `qwen-mt-lite` 或另一个引擎；术语表可以固定专有名词的译法，译文留空表示保持原文不翻。
- API Key 存在系统钥匙串里（服务器版存在数据目录的 `tokens.json`），不写进数据库。翻译请求直连，不走代理；网络只能经代理出去时自动改走代理。
- 回复的译文只用于显示，会话记录里保存的仍是智能体的原文。消息翻译前的原文另存在本机数据库里，清空翻译缓存不会删掉它。

</details>

<details>
<summary><strong>查看 Claude Code 子智能体的会话</strong> 的细节</summary>
<br/>

- Claude Code 把每个子智能体（Agent / Task 工具）的整段对话单独存在 `~/.claude/projects/<项目>/<会话 id>/subagents/agent-<id>.jsonl`。官方版的卡片里只能看到它过程的摘要和最终结果（在后台跑的连过程摘要也没有），这份记录打不开。
- 定制版在子智能体卡片的标题旁加了「查看子智能体会话」按钮，在右侧抽屉里打开这份记录：它收到的任务、思考、回复，以及每次工具调用的输入和输出。和 Codex、Grok 子智能体卡片上的是同一个按钮。
- 子智能体一启动按钮就出现，前台、后台运行都一样；它还在跑时打开，内容每 2 秒刷新一次，正在执行的工具调用显示为运行中。重新载入对话后再打开的是当时的内容，关掉再开就是最新的。
- 以前的对话也能看，只要记录文件还在。

</details>

<details>
<summary><strong>手机上快速切换打开的会话</strong> 的细节</summary>
<br/>

- 屏幕宽度不到 768 像素时（手机，或很窄的浏览器窗口），官方版不显示会话标签栏。要切到别的打开的会话，只能在侧边栏的全部历史里找；已完成的会话侧边栏默认不显示，开着也找不到。
- 定制版把会话标题变成按钮：标题后面是 ⌄ 和打开的数量；别的会话在等你授权或回答时，数量上亮一个橙点。点开后从底部弹出「已打开的会话」，按标签顺序列出全部打开的会话，每个标着状态（需要处理、进行中、待复查、已完成、已取消、未发送）。点一下切过去，点 × 关掉；也能新建会话，或点「全部会话（含历史）」打开侧边栏。点空白处、往下拖或用返回手势关闭。
- 「需要处理」要这台设备连着那个会话才知道：在这台设备上打开过的会话才会显示，没打开过的显示它保存的状态。
- 开着「跨窗口同步会话标签」（默认开启）时，在手机上关掉的会话，电脑上也会关掉，和在电脑上关标签一样。
- 宽度 768 像素及以上（电脑、平板）不变，仍是标签栏。
- 从侧边栏点开的会话先是预览（和电脑上一样），下一个点开的会替换它；它在这里的标题是斜体，点旁边的 📌 就保留下来。也可以像电脑上那样双击侧边栏里的会话直接保留：手机上侧边栏会在点完后稍等一下再收起，好让第二下落在同一行上。
- 对应的需求：[keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10)、[#12](https://github.com/keh4l/codeg/issues/12)。

</details>

<details>
<summary><strong>智能体生成图片</strong> 的细节</summary>
<br/>

- 在「设置 → 图片生成」里添加服务：接口类型选「OpenAI 接口」（OpenAI 官方、Grok 和大多数中转站）或「Gemini 接口」（Google 官方或中转站），地址留空就是官方地址，再填 Key 和模型名，如 `gpt-image-2`、`grok-imagine-image-2.0`、`gemini-3-pro-image`。可以加多个服务。「测试」会生成一张低质量小图确认能用，由服务方计费。
- 打开页面顶部的开关（和「设置 → 协作 → 会话内工具」里的「生成图片」是同一个，默认关闭），并且至少有一个服务填了 Key 和模型后，之后启动的智能体会多出 `image_generate` 和 `image_get_result` 两个工具。智能体可以选模型、宽高比、分辨率和透明背景，也可以传参考图来修改已有的图片；没选模型时用设置里的默认模型。
- 保存位置由智能体传参决定，相对路径按会话的工作目录算；没传时存到 `~/.codeg/generated-images/<日期>/`，这个目录可以在设置里改。
- 对话里每张图一张卡片：生成中显示已用的秒数，完成后显示图片、保存路径（点一下打开）、服务和模型、尺寸和用时。图从文件读，重新载入对话后只要文件还在就能看到。
- 默认附一张约 512 像素宽的预览图给智能体，让它看到结果再决定要不要改，会占用它的一些上下文；智能体用的模型看不了图片时可以在设置里关掉。
- 生成一张图常要几十秒到两分钟。超过这个智能体一次工具调用能等的时间时，先返回任务号，智能体用 `image_get_result` 接着取，见下一节。
- 调接口的是 codeg 自己，智能体只拿到图片文件。API Key 存在系统钥匙串里（服务器版存在数据目录的 `tokens.json`），不写进数据库，也不随配置同步。

</details>

<details>
<summary><strong>短超时的智能体也能等到结果</strong> 的细节</summary>
<br/>

- 智能体对一次 MCP 工具调用能等多久各不相同：ZCode 30 秒；Cursor、Kimi、DeepSeek、OpenCode 60 秒；Codex 5 分钟；Claude Code、Qoder、CodeBuddy、Grok 基本不限。官方版里，`get_delegation_status`（等委托任务的结果）可以一次等很久，`ask_user_question`（向你提问）一直等到你回答，超过时限后智能体就当作调用失败接着往下做，提问也就当成没回答。
- 定制版按智能体给这些工具设一个比时限短的上限，例如 ZCode 20 秒、OpenCode 45 秒、Codex 4 分钟；不限时的智能体不设上限，和官方版一样。到了上限还没有结果就先返回，告诉智能体下一次怎么接着等。
- 提问：到时你还没回答，问题卡片照样留着，智能体用新工具 `get_question_answer` 接着等；你回答后，答案显示在原来的提问卡片里。
- 委托任务：`get_delegation_status` 一次最多等到上限，再返回任务当前的状态。生成图片同理，见上一节。
- 等待时每 10 秒向智能体报一次进度，OpenCode 这类按进度续时的智能体能等得更久。

</details>

<details>
<summary><strong>只列你在用的智能体</strong> 的细节</summary>
<br/>

- 内置智能体有近 20 个，官方版不管装没装默认全部启用：设置页一长串，新会话的选择器里也挤满还没装的（会话页不会替你安装，选了也用不了），每次打开设置页还要逐个预检。
- 定制版的「设置 → 智能体」只列「我的智能体」，照样可以拖动排序。标题栏的「添加」和列表下方那一行打开「添加智能体」：按名称或描述搜索，按已安装 / 未安装筛选，本机已安装的排在前面，一次多选。没安装的，加进来后在详情里点安装。
- 详情里的开关就是「我的智能体」：关掉就从列表里移除，可以撤销。它就是官方版的「启用」，所以新会话的选择器、委托和其它地方都跟着它走。
- 打开设置页时只预检「我的智能体」；别的智能体在你点开时再检测。
- codeg 里还没有某个智能体的设置时（全新安装，或以后版本新增的内置智能体），只启用本机检测到已安装的。codeg 认的「已安装」是它要用的 ACP 适配器或 CLI 已经就位，全新安装时常常一个都没有，列表是空的，从「添加智能体」挑就行。以后新装的智能体不会自动加进来，已有的设置一律不动。
- 从以前的版本升级上来、「我的智能体」里有没安装的，列表顶部会提示一次：「只保留已安装的」或「保持现状」（这个选择按设备记）。
- 新会话的选择器一行末尾多了「+」，点它直接打开「添加智能体」；智能体多到放不下时，它在「更多」菜单的底部。一个智能体都没有时，选择器里的按钮也直接打开「添加智能体」。

</details>

<details>
<summary><strong>手机上长按选中文字</strong> 的细节</summary>
<br/>

- 官方版的整个对话区和输入框都挂着自己的右键菜单，手指长按也会打开它：在回复上按住约 0.7 秒，弹出的是会话菜单（新建会话、导出会话……）；安卓上长按发出的系统事件还被拦下，手机自己的选词也跟着取消。输入框在 HTTPS 下长按，弹出的是它自己的剪切、复制、全选菜单。手机自带的选中手柄和复制菜单出不来，回复和输入框里的文字很难复制。
- 定制版把手指和触控笔的长按交给手机：选中、拖动手柄、复制、粘贴都用手机自带的。鼠标右键照旧打开这两个菜单，带触屏的电脑也一样。
- 官方版选中回复后弹出的「复制文本、引用、提问」气泡贴着选区，手机的菜单也贴着选区，放在上方还是下方由手机决定，网页既读不到也挪不动，两个常常叠在一起。定制版里用手指选中时，这几个按钮和选中的字数出现在输入框下方，暂时顶替文件夹和分支那一行，取消选中后换回来；手机的菜单隔着输入框碰不到这里。「提问」在这一行里直接输入问题。用鼠标选中时仍是浮在选区上方的气泡。
- 输入框菜单里的「快捷消息」在输入框左下角的「+」里也有；翻译要发的消息有自己的按钮。
- iOS 上网页里的普通文字，系统菜单本来就没有「全选」（输入框里才有）；要复制整段回复，用回复下面的复制按钮。

</details>

<details>
<summary><strong>在网页上重启服务器</strong> 的细节</summary>
<br/>

- 官方版部署在服务器上时，网页里没有重启 codeg 的入口：改了需要重启才生效的设置（外观、语言、服务商列表、浏览器代理等），或者服务出了问题，只能登录服务器去重启。在服务器上恢复备份也是这样：恢复要重启后才生效，但它调用的重启只认「有待安装的更新」，每次都提示「服务未能重启，请手动重启」。
- 定制版在「设置 → 系统」的「软件更新」下面加了「重启 codeg」。点「重启」先确认，确认框会写明有几个会话正在运行、会被中断；确认后倒数几秒，等服务回来，页面自动刷新。其他打开着的窗口，状态栏也会显示「正在重启」。
- 重启方式和在线更新一样：Docker 或带守护进程（`--supervise`）运行时，由守护进程重新拉起，间隔是 `CODEG_RESTART_DELAY_MS`；单独运行时，进程原地重新启动（systemd 等看到的还是同一个进程）。普通重启不进在线更新的试运行期，也不会触发自动回滚。在线更新正在下载或安装时不能重启。
- 在服务器上恢复备份后，结果面板里的「立即重启」改用同一个重启，恢复会自动生效。
- 只在服务器版显示：桌面版不显示，用浏览器连到桌面版内置 Web 服务时也不显示；Windows 服务器和在线更新一样暂不支持。

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
