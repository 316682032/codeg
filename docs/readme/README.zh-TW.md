<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg 客製版
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="最新版本" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="上游儲存庫" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="授權" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <strong>繁體中文</strong> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.fr.md">Français</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong>xintaofei 的多智慧體程式設計工作台 <a href="https://github.com/spacering-net/codeg">Codeg</a>，由 keh4l 客製</strong><br/>
  把各種 AI 程式設計智慧體放在一起使用、彼此協作。緊跟上游，另外加了幾項功能。
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>下載</ins></a> · <a href="#安裝"><ins>安裝說明</ins></a> · <a href="https://docs.codeg.app"><ins>官方文件</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="Codeg 工作區：和智慧體的對話，旁邊是即時 diff 和專案檔案" width="960" />
  </picture>
</p>

## 與官方版的差異

<table>
  <tr>
    <td width="50%" valign="top">🪟 <strong>每個視窗一組分頁</strong><br/>同一台伺服器開多個視窗時，可以關掉分頁同步，讓各視窗各自管理分頁；會話和訊息照常同步。</td>
    <td width="50%" valign="top">💭 <strong>Claude Code 顯示思考過程</strong><br/>向 API 請求思考摘要，思考區域不再是空的。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>翻譯回覆和訊息</strong><br/>智慧體寫完回覆後整則翻譯成你的語言，要送出的訊息一鍵翻譯成英文；使用阿里雲百煉或騰訊雲的翻譯模型，一千字約一秒。</td>
    <td width="50%" valign="top">🔄 <strong>緊跟上游</strong><br/>上游的更新定期合併進來；沒列在這裡的功能，和官方版完全一樣。客製版最早加入的內建 Kiro CLI，0.36.0 起已併入官方版。</td>
  </tr>
</table>

<details>
<summary><strong>每個視窗一組分頁</strong> 的細節</summary>
<br/>

- 開關是「設定 → 一般」裡的「跨視窗同步會話分頁」，預設開啟：連到同一個服務的所有視窗和裝置（電腦、平板、手機）共用一組開啟的分頁，和官方版一樣。
- 關閉後，在一個視窗裡開啟、切換或關閉會話分頁，其他視窗維持原樣；重新整理後還原的是本視窗自己的分頁。
- 會話、訊息和刪除操作不受開關影響，一律同步到所有視窗。
- 開關儲存在服務端：在任一視窗或裝置上切換，連到這個服務的所有視窗和裝置會一起切換。（0.35.2-1 及以前按瀏覽器分別儲存，瀏覽器端預設關閉。）
- 上游的對應需求：[spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547)。

</details>

<details>
<summary><strong>Claude Code 顯示思考過程</strong> 的細節</summary>
<br/>

- 新模型在官方版裡只回傳加密的思考簽章，所以思考內容一直是空的。
- 客製版向 API 請求思考摘要，和終端機裡開啟 `showThinkingSummaries` 後的 `claude` 看到的一樣。
- 不需要的話，在 `~/.claude/settings.json`（或專案的 `.claude/settings.json`）裡加上：

  ```json
  "showThinkingSummaries": false
  ```

- 以前的對話當時就沒有回傳思考文字，無法補回。

</details>

<details>
<summary><strong>翻譯回覆和訊息</strong> 的細節</summary>
<br/>

- 在「設定 → 翻譯」裡填入[阿里雲百煉](https://bailian.console.aliyun.com/)或[騰訊雲 TokenHub](https://console.cloud.tencent.com/tokenhub/apikey)的 API Key 後啟用，費用依各平台的規則計算。預設使用百煉的 `qwen-mt-flash`，實測一段約 0.5 秒。
- 回覆：開啟「回覆翻譯」開關後，等智慧體寫完整則回覆再整則一起翻譯（同一次請求，模型能看到整則回覆的上下文），以譯文取代原文顯示；寫的過程中先顯示原文。每則回覆下方的翻譯按鈕可以切回原文；沒開自動翻譯時，也可以用它手動翻譯這一則。思考過程在展開時翻譯，跟著同一個按鈕切換；程式碼區塊和工具呼叫不翻譯。複製按鈕複製的是目前顯示的內容。
- 會話名稱：開著自動翻譯回覆時，智慧體取的會話名稱在側邊欄、分頁和會話標題列裡也顯示成你的語言；你手動改過的名稱不翻譯，滑鼠停在側邊欄的會話上能看到原名。
- 訊息：用輸入框的翻譯按鈕、`⌘⇧L`（Windows 和 Linux 上是 `Ctrl+Shift+L`）或右鍵選單，把輸入框裡的內容就地翻譯成目標語言（預設英語）。@提及、斜線指令、路徑和程式碼保持原樣，`⌘Z` 一步回到原文。只在你按下時才翻譯，寫到一半的草稿不會送出去。也可以開啟「送出時自動翻譯」。送出之後，訊息旁的翻譯按鈕可以切回你翻譯前寫的原文，複製也跟著顯示的內容走。
- 遇到速率限制時自動改用 `qwen-mt-lite` 或另一個引擎；術語表可以固定專有名詞的譯法，譯文留空表示保持原文不翻。
- API Key 存在系統鑰匙圈裡（伺服器版存在資料目錄的 `tokens.json`），不寫進資料庫。翻譯請求直連，不經過代理；網路只能經代理連外時自動改走代理。
- 回覆的譯文只用於顯示，對話紀錄裡保存的仍是智慧體的原文。訊息翻譯前的原文另存在本機資料庫裡，清空翻譯快取不會刪掉它。

</details>

### 發行方式

|  | 客製版 | 官方版 |
| --- | --- | --- |
| 下載與更新 | 本儲存庫的 [Releases](https://github.com/keh4l/codeg/releases)，以本 fork 自己的金鑰簽署 | [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) 的 Releases |
| 版本號 | 上游版本-序號，如 `0.33.0-2` 是基於上游 0.33.0 的第 2 個客製版 | 如 `0.33.0` |
| macOS 公證 | 沒有，第一次開啟要放行一次（見[安裝](#安裝)） | 有 |
| Docker 映像檔 | 沒有 | 有 |

兩邊的更新互不相通：客製版不會被更新成官方版，官方版也不會被更新成客製版。`keh4l` 分支就是上游的 `main` 加上上面這些改動。

## 安裝

### 桌面版

從 [Releases](https://github.com/keh4l/codeg/releases/latest) 下載最新的安裝檔：

| 系統 | 安裝檔 |
| --- | --- |
| macOS（Apple 晶片或 Intel） | `.dmg` |
| Windows（x64 或 ARM64） | `-setup.exe` |
| Linux | `.deb`、`.rpm` 或 `.AppImage` |

它和官方版是同一個應用程式：安裝後會取代官方版，原有的對話和設定都會保留。

> [!NOTE]
> macOS 第一次開啟時如果提示「已損毀」或「無法開啟」，執行一次下面的指令，或者在「系統設定 → 隱私權與安全性」裡允許開啟：
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### 伺服器

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

兩者都從本儲存庫的 Releases 安裝，伺服器內建的更新也走這裡。

### 換回官方版

> [!WARNING]
> 先備份 Codeg 的資料。客製版有幾個官方版沒有的資料庫遷移（例如翻譯功能用的資料表），官方版可能無法用同一份資料啟動。

## 文件

功能、設定與用法請看官方 [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.zh-TW.md) 和 [docs.codeg.app](https://docs.codeg.app)。它們描述的是官方版，差異見上文。

## 授權與致謝

Apache-2.0，見 [LICENSE](../../LICENSE)。Codeg 由 [xintaofei](https://github.com/xintaofei) 及貢獻者開發，客製版只是在它的基礎上增加內容。Codeg 建立在 [Agent Client Protocol](https://agentclientprotocol.com)、[Superpowers](https://github.com/obra/superpowers)、[OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) 和 [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) 之上。
