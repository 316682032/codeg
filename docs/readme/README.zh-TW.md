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
    <td width="50%" valign="top">🌐 <strong>翻譯回覆和訊息</strong><br/>智慧體的回覆每寫完一段就翻譯成你的語言，思考、提問卡片和待辦任務也能翻譯，要送出的訊息一鍵翻譯成英文；使用阿里雲百煉或騰訊雲的翻譯模型，一千字約一秒。</td>
    <td width="50%" valign="top">🧩 <strong>查看 Claude Code 子智慧體的會話</strong><br/>子智慧體卡片上多了「檢視子智慧體工作階段」，像 Codex 一樣打開它完整的會話紀錄；子智慧體還在執行時就能看。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>手機上快速切換開啟的會話</strong><br/>手機上點會話標題，就能看到所有開啟的會話和各自的進度，點一下切過去；別的會話在等你處理時，標題旁會亮起提醒。</td>
    <td width="50%" valign="top">🎨 <strong>智慧體生成圖片</strong><br/>設定好 OpenAI、Grok、Gemini 或中轉站的位址、Key 和模型，所有支援 MCP 的智慧體都能出圖、改圖，存到它指定的位置；圖直接顯示在會話裡，Key 不經過智慧體。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">⏳ <strong>短逾時的智慧體也能等到結果</strong><br/>有的智慧體一次工具呼叫只等 30 到 60 秒。客製版按智慧體限定每次等多久，沒等到就先返回、下次接著取：你回答得慢，提問也不會被當成沒回答。</td>
    <td width="50%" valign="top">🗂️ <strong>只列你在用的智慧體</strong><br/>設定裡只列你新增的智慧體，其餘的收進「新增智慧體」，可搜尋、一次多選；新裝的 codeg 只啟用本機已裝的，新對話的選擇器也清爽了。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📋 <strong>手機上長按選取文字</strong><br/>長按回覆或輸入框裡的文字，出來的是手機內建的選取控點和拷貝選單，不再彈出會話選單；手指選取回覆後，「複製文字、引用、提問」出現在輸入框下方，不和手機的選單擠在一起。</td>
    <td width="50%" valign="top">🔁 <strong>在網頁上重新啟動伺服器</strong><br/>「設定 → 系統」裡多了「重新啟動 codeg」：部署在伺服器上的 codeg 不用登入伺服器就能重新啟動，頁面會自動重新連線；在伺服器上還原備份後也會自動重新啟動生效。</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>緊跟上游</strong><br/>上游的更新定期合併進來；沒列在這裡的功能，和官方版完全一樣。客製版最早加入的內建 Kiro CLI，0.36.0 起已併入官方版。</td>
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
- 自訂智慧體只要跑的是 claude-agent-acp（例如再接一個 Claude 帳號，或把 Claude Code 接到其他 Anthropic 相容介面），也一樣請求思考摘要。
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
- 回覆：開啟「回覆翻譯」開關後，智慧體每寫完一段（接著去呼叫工具、思考，或整輪結束）就把這一段整段翻譯（同一次請求，模型能看到整段的上下文），以譯文取代原文顯示；寫的過程中先顯示原文。每則回覆下方的翻譯按鈕可以切回原文；沒開自動翻譯時，也可以用它手動翻譯這一則。思考過程在展開時翻譯，跟著同一個按鈕切換；程式碼區塊和工具呼叫不翻譯。複製按鈕複製的是目前顯示的內容。
- 會話名稱：開著自動翻譯回覆時，智慧體取的會話名稱在側邊欄、分頁和會話標題列裡也顯示成你的語言；你手動改過的名稱不翻譯，滑鼠停在側邊欄的會話上能看到原名。
- 提問卡片：智慧體向你提問時，問題和選項預設直接顯示譯文（「設定 → 翻譯」裡可以關掉），卡片右上角的按鈕切換原文和譯文；送出的仍是智慧體給出的原選項。在「其他」裡寫的回答，用旁邊的翻譯按鈕或 `⌘⇧L` 翻譯成目標語言，再點一次還原；開著「送出時自動翻譯」時送出前自動翻譯。標為保密的提問不會送去翻譯。
- 待辦任務：智慧體列出的待辦任務（回覆裡的計畫卡片、對話上方的浮動計畫和工作階段詳情裡的計畫）每一步預設直接顯示譯文，整張清單一次請求（「設定 → 翻譯」裡的「自動翻譯待辦任務」可以關掉），計畫卡片右上角的按鈕切換原文和譯文；關掉自動翻譯時，用這個按鈕手動翻譯。
- 訊息：用輸入框的翻譯按鈕、`⌘⇧L`（Windows 和 Linux 上是 `Ctrl+Shift+L`）或右鍵選單，把輸入框裡的內容就地翻譯成目標語言（預設英語）。@提及、斜線指令、路徑和程式碼保持原樣，`⌘Z` 一步回到原文。只在你按下時才翻譯，寫到一半的草稿不會送出去。也可以開啟「送出時自動翻譯」。送出之後，訊息旁的翻譯按鈕可以切回你翻譯前寫的原文，複製也跟著顯示的內容走。
- 遇到速率限制時自動改用 `qwen-mt-lite` 或另一個引擎；術語表可以固定專有名詞的譯法，譯文留空表示保持原文不翻。
- API Key 存在系統鑰匙圈裡（伺服器版存在資料目錄的 `tokens.json`），不寫進資料庫。翻譯請求直連，不經過代理；網路只能經代理連外時自動改走代理。
- 回覆的譯文只用於顯示，對話紀錄裡保存的仍是智慧體的原文。訊息翻譯前的原文另存在本機資料庫裡，清空翻譯快取不會刪掉它。

</details>

<details>
<summary><strong>查看 Claude Code 子智慧體的會話</strong> 的細節</summary>
<br/>

- Claude Code 把每個子智慧體（Agent / Task 工具）的整段對話單獨存在 `~/.claude/projects/<專案>/<會話 id>/subagents/agent-<id>.jsonl`。官方版的卡片裡只能看到它過程的摘要和最終結果（在背景執行的連過程摘要也沒有），這份紀錄打不開。
- 客製版在子智慧體卡片的標題旁加了「檢視子智慧體工作階段」按鈕，在右側抽屜裡打開這份紀錄：它收到的任務、思考、回覆，以及每次工具呼叫的輸入和輸出。和 Codex、Grok 子智慧體卡片上的是同一個按鈕。
- 自訂智慧體只要跑的是 claude-agent-acp，卡片上也有這個按鈕，重新載入對話後也在。
- 子智慧體一啟動按鈕就出現，前景、背景執行都一樣；它還在執行時打開，內容每 2 秒重新整理一次，正在執行的工具呼叫顯示為執行中。重新載入對話後再打開的是當時的內容，關掉再開就是最新的。
- 以前的對話也能看，只要紀錄檔還在。

</details>

<details>
<summary><strong>手機上快速切換開啟的會話</strong> 的細節</summary>
<br/>

- 螢幕寬度不到 768 像素時（手機，或很窄的瀏覽器視窗），官方版不顯示會話分頁列。要切到別的開啟的會話，只能在側邊欄的全部歷史裡找；已完成的會話側邊欄預設不顯示，開著也找不到。
- 客製版把會話標題變成按鈕：標題後面是 ⌄ 和開啟的數量；別的會話在等你授權或回答時，數量上亮一個橘點。點開後從底部彈出「已開啟的會話」，按分頁順序列出全部開啟的會話，每個標著狀態（需要處理、進行中、待複查、已完成、已取消、未送出）。點一下切過去，點 × 關掉；也能新增會話，或點「全部會話（含歷史）」打開側邊欄。點空白處、往下拖或用返回手勢關閉。
- 「需要處理」要這台裝置連著那個會話才知道：在這台裝置上開啟過的會話才會顯示，沒開啟過的顯示它儲存的狀態。
- 開著「跨視窗同步會話分頁」（預設開啟）時，在手機上關掉的會話，電腦上也會關掉，和在電腦上關分頁一樣。
- 寬度 768 像素及以上（電腦、平板）不變，仍是分頁列。
- 從側邊欄點開的對話先是預覽（和電腦上一樣），下一個點開的會取代它；它在這裡的標題是斜體，點旁邊的 📌 就保留下來。也可以像電腦上那樣雙擊側邊欄裡的對話直接保留：手機上側邊欄會在點完後稍等一下再收起，好讓第二下落在同一列上。
- 對應的需求：[keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10)、[#12](https://github.com/keh4l/codeg/issues/12)。

</details>

<details>
<summary><strong>智慧體生成圖片</strong> 的細節</summary>
<br/>

- 在「設定 → 圖片生成」裡新增服務：介面類型選「OpenAI 介面」（OpenAI 官方、Grok 和大多數中轉站）或「Gemini 介面」（Google 官方或中轉站），位址留空就是官方位址，再填 Key 和模型名稱，如 `gpt-image-2`、`grok-imagine-image-2.0`、`gemini-3-pro-image`。可以加多個服務。「測試」會生成一張低品質小圖確認能用，由服務方計費。
- 開啟頁面頂部的開關（和「設定 → 協作 → 對話內工具」裡的「生成圖片」是同一個，預設關閉），並且至少有一個服務填了 Key 和模型後，之後啟動的智慧體會多出 `image_generate` 和 `image_get_result` 兩個工具。智慧體可以選模型、寬高比、解析度和透明背景，也可以傳參考圖來修改已有的圖片；沒選模型時用設定裡的預設模型。
- 儲存位置由智慧體傳參決定，相對路徑按會話的工作目錄算；沒傳時存到 `~/.codeg/generated-images/<日期>/`，這個目錄可以在設定裡改。
- 會話裡每張圖一張卡片：生成中顯示已用的秒數，完成後顯示圖片、儲存路徑（點一下打開）、服務和模型、尺寸和用時。圖從檔案讀取，重新載入會話後只要檔案還在就能看到。
- 預設附一張約 512 像素寬的預覽圖給智慧體，讓它看到結果再決定要不要改，會佔用它的一些上下文；智慧體用的模型看不了圖片時可以在設定裡關掉。
- 生成一張圖常要幾十秒到兩分鐘。超過這個智慧體一次工具呼叫能等的時間時，先返回任務編號，智慧體用 `image_get_result` 接著取，見下一節。
- 呼叫介面的是 codeg 自己，智慧體只拿到圖片檔案。API Key 存在系統鑰匙圈裡（伺服器版存在資料目錄的 `tokens.json`），不寫進資料庫，也不隨設定同步。

</details>

<details>
<summary><strong>短逾時的智慧體也能等到結果</strong> 的細節</summary>
<br/>

- 智慧體對一次 MCP 工具呼叫能等多久各不相同：ZCode 30 秒；Cursor、Kimi、DeepSeek、OpenCode 60 秒；Codex 5 分鐘；Claude Code、Qoder、CodeBuddy、Grok 基本不限。官方版裡，`get_delegation_status`（等委託任務的結果）可以一次等很久，`ask_user_question`（向你提問）一直等到你回答，超過時限後智慧體就當作呼叫失敗接著往下做，提問也就當成沒回答。
- 客製版按智慧體給這些工具設一個比時限短的上限，例如 ZCode 20 秒、OpenCode 45 秒、Codex 4 分鐘；不限時的智慧體不設上限，和官方版一樣。到了上限還沒有結果就先返回，告訴智慧體下一次怎麼接著等。
- 提問：到時你還沒回答，問題卡片照樣留著，智慧體用新工具 `get_question_answer` 接著等；你回答後，答案顯示在原來的提問卡片裡。
- 委託任務：`get_delegation_status` 一次最多等到上限，再返回任務目前的狀態。生成圖片同理，見上一節。
- 等待時每 10 秒向智慧體回報一次進度，OpenCode 這類按進度延長時限的智慧體能等得更久。

</details>

<details>
<summary><strong>只列你在用的智慧體</strong> 的細節</summary>
<br/>

- 內建智慧體有近 20 個，官方版不管裝沒裝預設全部啟用：設定頁一長串，新對話的選擇器裡也擠滿還沒裝的（對話頁不會替你安裝，選了也用不了），每次打開設定頁還要逐個預檢。
- 客製版的「設定 → 智能體」只列「我的智慧體」，照樣可以拖曳排序。標題列的「新增」和清單下方那一列打開「新增智慧體」：按名稱或描述搜尋，按已安裝 / 未安裝篩選，本機已安裝的排在前面，一次多選。沒安裝的，加進來後在詳情裡點安裝。
- 詳情裡的開關就是「我的智慧體」：關掉就從清單裡移除，可以復原。它就是官方版的「啟用」，所以新對話的選擇器、委派和其他地方都跟著它走。
- 打開設定頁時只預檢「我的智慧體」；其他智慧體在你點開時再檢測。
- codeg 裡還沒有某個智慧體的設定時（全新安裝，或以後版本新增的內建智慧體），只啟用本機偵測到已安裝的。codeg 認的「已安裝」是它要用的 ACP 轉接器或 CLI 已經就位，全新安裝時常常一個都沒有，清單是空的，從「新增智慧體」挑就行。以後新裝的智慧體不會自動加進來，已有的設定一律不動。
- 從以前的版本升級上來、「我的智慧體」裡有沒安裝的，清單頂部會提示一次：「只保留已安裝的」或「維持現狀」（這個選擇按裝置記）。
- 新對話的選擇器一列末尾多了「+」，點它直接打開「新增智慧體」；智慧體多到放不下時，它在「更多」選單的底部。一個智慧體都沒有時，選擇器裡的按鈕也直接打開「新增智慧體」。

</details>

<details>
<summary><strong>手機上長按選取文字</strong> 的細節</summary>
<br/>

- 官方版的整個對話區和輸入框都掛著自己的右鍵選單，手指長按也會打開它：在回覆上按住約 0.7 秒，彈出的是會話選單（新增會話、匯出對話……）；Android 上長按送出的系統事件還被攔下，手機自己的選字也跟著取消。輸入框在 HTTPS 下長按，彈出的是它自己的剪下、複製、全選選單。手機內建的選取控點和拷貝選單出不來，回覆和輸入框裡的文字很難複製。
- 客製版把手指和觸控筆的長按交給手機：選取、拖動控點、拷貝、貼上都用手機內建的。滑鼠右鍵照舊打開這兩個選單，帶觸控螢幕的電腦也一樣。
- 官方版選取回覆後彈出的「複製文字、引用、提問」氣泡貼著選取範圍，手機的選單也貼著選取範圍，放在上方還是下方由手機決定，網頁既讀不到也挪不動，兩個常常疊在一起。客製版裡用手指選取時，這幾個按鈕和選取的字數出現在輸入框下方，暫時頂替資料夾和分支那一行，取消選取後換回來；手機的選單隔著輸入框碰不到這裡。「提問」在這一行裡直接輸入問題。用滑鼠選取時仍是浮在選取範圍上方的氣泡。
- 輸入框選單裡的「快捷訊息」在輸入框左下角的「+」裡也有；翻譯要送出的訊息有自己的按鈕。
- iOS 上網頁裡的一般文字，系統選單本來就沒有「全選」（輸入框裡才有）；要複製整段回覆，用回覆下面的複製按鈕。

</details>

<details>
<summary><strong>在網頁上重新啟動伺服器</strong> 的細節</summary>
<br/>

- 官方版部署在伺服器上時，網頁裡沒有重新啟動 codeg 的入口：改了需要重新啟動才生效的設定（外觀、語言、服務商清單、瀏覽器代理等），或者服務出了問題，只能登入伺服器去重新啟動。在伺服器上還原備份也是這樣：還原要重新啟動後才生效，但它呼叫的重新啟動只認「有待安裝的更新」，每次都提示「服務未能重新啟動，請手動重新啟動」。
- 客製版在「設定 → 系統」的「軟體更新」下面加了「重新啟動 codeg」。點「重新啟動」先確認，確認框會寫明有幾個會話正在執行、會被中斷；確認後倒數幾秒，等服務回來，頁面自動重新整理。其他開著的視窗，狀態列也會顯示「正在重新啟動」。
- 重新啟動方式和線上更新一樣：Docker 或帶守護行程（`--supervise`）執行時，由守護行程重新拉起，間隔是 `CODEG_RESTART_DELAY_MS`；單獨執行時，行程原地重新啟動（systemd 等看到的還是同一個行程）。一般的重新啟動不進線上更新的試執行期，也不會觸發自動回滾。線上更新正在下載或安裝時不能重新啟動。
- 在伺服器上還原備份後，結果面板裡的「立即重新啟動」改用同一個重新啟動，還原會自動生效。
- 只在伺服器版顯示：桌面版不顯示，用瀏覽器連到桌面版內建 Web 服務時也不顯示；Windows 伺服器和線上更新一樣暫不支援。

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
