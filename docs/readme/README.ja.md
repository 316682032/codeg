<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg カスタム版
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="最新リリース" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="上流リポジトリ" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="ライセンス" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.zh-TW.md">繁體中文</a> · <strong>日本語</strong> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.fr.md">Français</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong>xintaofei のマルチエージェント・コーディングワークスペース <a href="https://github.com/spacering-net/codeg">Codeg</a> を keh4l がカスタマイズ</strong><br/>
  さまざまな AI コーディングエージェントを一か所で使い、連携させられます。上流に密に追従しつつ、いくつか機能を加えています。
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>ダウンロード</ins></a> · <a href="#インストール"><ins>インストール方法</ins></a> · <a href="https://docs.codeg.app"><ins>公式ドキュメント</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="Codeg のワークスペース：エージェントとの会話と、その横のリアルタイム diff とプロジェクトのファイル" width="960" />
  </picture>
</p>

## 公式版との違い

<table>
  <tr>
    <td width="50%" valign="top">🪟 <strong>ウィンドウごとのタブ</strong><br/>同じサーバーで複数のウィンドウを開くとき、タブ同期をオフにすると各ウィンドウが独自のタブを持てます。会話とメッセージはこれまでどおり同期されます。</td>
    <td width="50%" valign="top">💭 <strong>Claude Code の思考を表示</strong><br/>API に思考の要約を要求するので、思考欄が空のままになりません。</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>返信とメッセージの翻訳</strong><br/>エージェントの返信をひとまとまり書き終えるごとに自分の言語へ（思考と質問カードも）、送るメッセージをワンキーで英語へ翻訳。Alibaba Cloud または Tencent Cloud の翻訳モデルで、1,000 字あたり約 1 秒です。</td>
    <td width="50%" valign="top">🧩 <strong>Claude Code サブエージェントのセッション</strong><br/>サブエージェントのカードに「サブエージェントのセッションを表示」が付き、Codex と同じように会話の全記録を開けます。サブエージェントの実行中から見られます。</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>上流に追従</strong><br/>上流の更新は定期的にマージされます。ここにない機能は公式版とまったく同じです。このビルドが最初に追加した Kiro CLI の内蔵は、0.36.0 から公式版に取り込まれています。</td>
  </tr>
</table>

<details>
<summary><strong>ウィンドウごとのタブ</strong> の詳細</summary>
<br/>

- 設定 → 一般の「ウィンドウ間で会話タブを同期」で切り替えます。既定はオンで、同じサーバーにつながるすべてのウィンドウとデバイス（PC、タブレット、スマートフォン）が公式版と同じく一つのタブセットを共有します。
- オフにすると、あるウィンドウで会話タブを開く・切り替える・閉じても他のウィンドウはそのままで、再読み込みするとそのウィンドウ自身のタブが戻ります。
- 会話、メッセージ、削除はこの設定に関係なく、常にすべてのウィンドウに反映されます。
- この設定はサーバーに保存されます。どのウィンドウやデバイスで切り替えても、そのサーバーにつながるすべてのウィンドウとデバイスが一緒に切り替わります（0.35.2-1 以前はブラウザごとに保存され、ブラウザでは既定でオフでした）。
- 上流への要望：[spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547)。

</details>

<details>
<summary><strong>Claude Code の思考を表示</strong> の詳細</summary>
<br/>

- 新しいモデルでは、公式版には思考の暗号化された署名しか返らないため、Claude の思考欄は空のままです。
- このビルドは API に思考の要約を要求します。ターミナルの `claude` で `showThinkingSummaries` をオンにしたときと同じ内容です。
- 不要なら、`~/.claude/settings.json`（またはプロジェクトの `.claude/settings.json`）に次を追加してください：

  ```json
  "showThinkingSummaries": false
  ```

- 以前の会話では思考テキスト自体が返されていないため、後から復元することはできません。

</details>

<details>
<summary><strong>返信とメッセージの翻訳</strong> の詳細</summary>
<br/>

- 「設定 → 翻訳」で [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) または [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey) の API キーを入れると使えます。料金は各プラットフォームの規定どおりです。既定は Bailian の `qwen-mt-flash` で、テストでは 1 段落約 0.5 秒でした。
- 返信：「返信の翻訳」のスイッチをオンにすると、エージェントが返信をひとまとまり書き終えるたびに（ツール呼び出しや思考に移ったとき、またはターンが終わったとき）、そのまとまり全体を 1 回のリクエストで翻訳し（モデルはまとまり全体を文脈として見られます）、原文の代わりに訳文を表示します。書いている間は原文を表示します。各返信の下の翻訳ボタンで原文に戻せます。自動翻訳がオフのときは、そのボタンでその返信だけを翻訳できます。思考は展開したときに翻訳し、同じボタンで切り替わります。コードブロックとツール呼び出しは翻訳しません。コピーボタンは表示中の内容をコピーします。
- セッション名：返信の自動翻訳がオンのとき、エージェントが付けたセッション名もサイドバー、タブ、会話のタイトルバーであなたの言語で表示します。自分で付けた名前は翻訳せず、サイドバーのセッションにカーソルを合わせると元の名前が見られます。
- 質問カード：エージェントが質問すると、質問と選択肢を既定で訳文表示します（「設定 → 翻訳」でオフにできます）。カード右上のボタンで原文と訳文を切り替えられ、回答はエージェントが示した元の選択肢のまま送られます。「その他」に書いた回答は、横の翻訳ボタンか `⌘⇧L` で目的の言語に翻訳でき、もう一度押すと元に戻ります。「送信時に翻訳」がオンなら送信前に自動で翻訳します。秘密扱いの質問は翻訳に送りません。
- メッセージ：入力欄の翻訳ボタン、`⌘⇧L`（Windows と Linux では `Ctrl+Shift+L`）、または右クリックメニューで、入力欄の内容をその場で目的の言語（既定は英語）に翻訳します。メンション、スラッシュコマンド、パス、コードはそのまま残り、`⌘Z` で一度に原文へ戻せます。翻訳するのは押したときだけで、書きかけの下書きが送られることはありません。「送信時に翻訳」をオンにすることもできます。送信後は、メッセージ横の翻訳ボタンで翻訳前に書いた原文に切り替えられ、コピーも表示中の内容に従います。
- レート制限にかかると `qwen-mt-lite` またはもう一方のエンジンに切り替えます。用語集で固有名詞の訳し方を固定できます。訳語を空欄にすると、その用語は原文のまま残ります。
- API キーは OS のキーチェーン（サーバー版ではデータディレクトリの `tokens.json`）に保存し、データベースには書きません。翻訳リクエストはプロキシを通さず直接接続し、プロキシ経由でしか外に出られないネットワークでは自動でプロキシを使います。
- 返信の訳文は表示用で、会話履歴にはエージェントの原文が残ります。メッセージの翻訳前の原文はローカルのデータベースに別途保存され、翻訳キャッシュを消去しても消えません。

</details>

<details>
<summary><strong>Claude Code サブエージェントのセッション</strong> の詳細</summary>
<br/>

- Claude Code は各サブエージェント（Agent / Task ツール）の会話全体を `~/.claude/projects/<プロジェクト>/<セッション id>/subagents/agent-<id>.jsonl` に別ファイルで保存します。公式版のカードには処理の要約と最終結果しかなく（バックグラウンドのものは要約もなし）、このファイルは開けません。
- このビルドではカードのタイトルの横に「サブエージェントのセッションを表示」ボタンを追加し、右側のパネルでこの記録を開きます。受け取ったタスク、思考、返信、各ツール呼び出しの入力と出力が見られます。Codex や Grok のサブエージェントのカードにあるのと同じボタンです。
- ボタンはサブエージェントが起動するとすぐに出ます（フォアグラウンドでもバックグラウンドでも同じ）。実行中に開くと 2 秒ごとに更新され、実行中のツール呼び出しは実行中と表示されます。会話を再読み込みした後に開くとその時点の内容なので、閉じて開き直すと最新になります。
- 以前の会話でも、記録ファイルが残っていれば見られます。

</details>

### 配布方法

|  | このビルド | 公式版 |
| --- | --- | --- |
| ダウンロードと更新 | このリポジトリの [Releases](https://github.com/keh4l/codeg/releases)。このフォーク独自の鍵で署名 | [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) の Releases |
| バージョン | 上流バージョン-番号。`0.33.0-2` は上流 0.33.0 をベースにした 2 番目のビルド | 例：`0.33.0` |
| macOS の公証 | なし。初回起動時に一度許可が必要（[インストール](#インストール)を参照） | あり |
| Docker イメージ | なし | あり |

更新は互いに行き来しません。このビルドが公式リリースに更新されることも、公式ビルドがこのビルドに更新されることもありません。`keh4l` ブランチは、上流の `main` に上記の変更を加えたものです。

## インストール

### デスクトップ

[Releases](https://github.com/keh4l/codeg/releases/latest) から最新のインストーラーをダウンロードしてください：

| OS | インストーラー |
| --- | --- |
| macOS（Apple シリコンまたは Intel） | `.dmg` |
| Windows（x64 または ARM64） | `-setup.exe` |
| Linux | `.deb`・`.rpm`・`.AppImage` |

公式の Codeg と同じアプリとしてインストールされ、公式版を置き換えます。会話と設定はそのまま残ります。

> [!NOTE]
> macOS で初回起動時に「壊れている」「開けません」と表示された場合は、次のコマンドを一度だけ実行するか、「システム設定 → プライバシーとセキュリティ」で開くことを許可してください：
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### サーバー

Linux または macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows（PowerShell）：

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

どちらもこのリポジトリのリリースからインストールされ、サーバーの組み込みアップデートもここを使います。

### 公式版に戻すとき

> [!WARNING]
> まず Codeg のデータをバックアップしてください。このビルドには公式版にないデータベース移行（翻訳機能のテーブルなど）があり、公式版は同じデータで起動できない場合があります。

## ドキュメント

機能・設定・使い方は、公式の [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.ja.md) と [docs.codeg.app](https://docs.codeg.app) を参照してください。これらは公式版について書かれています。違いは上記のとおりです。

## ライセンスと謝辞

Apache-2.0。[LICENSE](../../LICENSE) を参照してください。Codeg は [xintaofei](https://github.com/xintaofei) とコントリビューターによって開発されており、このビルドはそれに機能を加えたものです。Codeg は [Agent Client Protocol](https://agentclientprotocol.com)、[Superpowers](https://github.com/obra/superpowers)、[OfficeCLI](https://github.com/iOfficeAI/OfficeCLI)、[scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) の上に成り立っています。
