<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg – angepasste Version
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="Neuestes Release" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="Upstream" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="Lizenz" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.zh-TW.md">繁體中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <strong>Deutsch</strong> · <a href="./README.fr.md">Français</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong><a href="https://github.com/spacering-net/codeg">Codeg</a>, der Multi-Agent-Coding-Workspace von xintaofei, angepasst von keh4l</strong><br/>
  Alle KI-Coding-Agenten an einem Ort, die zusammenarbeiten. Folgt dem Upstream eng und ergänzt ein paar Funktionen.
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>Download</ins></a> · <a href="#installation"><ins>Installation</ins></a> · <a href="https://docs.codeg.app"><ins>Offizielle Doku</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="Der Codeg-Workspace: eine Unterhaltung mit einem Agenten neben seinen Live-Diffs und den Projektdateien" width="960" />
  </picture>
</p>

## Unterschiede zur offiziellen Version

<table>
  <tr>
    <td width="50%" valign="top">🤖 <strong>Kiro CLI eingebaut</strong><br/>Nutzt dein installiertes <code>kiro-cli</code>: Modell und Modus wählen, MCP-Server und Skills hinzufügen, frühere Sitzungen fortsetzen.</td>
    <td width="50%" valign="top">🪟 <strong>Tabs pro Fenster</strong><br/>Mit mehreren Fenstern auf einem Server lässt sich die Tab-Synchronisierung abschalten, dann behält jedes Fenster seine eigenen Tabs; Unterhaltungen und Nachrichten werden weiter synchronisiert.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">💭 <strong>Claude Code zeigt sein Thinking</strong><br/>Fordert bei der API Thinking-Zusammenfassungen an, der Thinking-Bereich bleibt also nicht mehr leer.</td>
    <td width="50%" valign="top">🌐 <strong>Übersetzte Antworten und Nachrichten</strong><br/>Agentenantworten werden nach dem Fertigschreiben in deine Sprache übersetzt, und eine Nachricht wird per Tastendruck ins Englische übersetzt, mit Übersetzungsmodellen von Alibaba Cloud oder Tencent Cloud in etwa einer Sekunde pro 1.000 Zeichen.</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>Nah am Upstream</strong><br/>Upstream wird regelmäßig hineingemergt; was hier nicht steht, funktioniert genau wie in der offiziellen Version.</td>
  </tr>
</table>

<details>
<summary><strong>Kiro CLI eingebaut</strong> – Details</summary>
<br/>

- Startet das `kiro-cli`, das du mit [Kiros eigenem Installer](https://kiro.dev/docs/getting-started/installation/) installiert hast.
- Im Eingabefeld wählst du Modell, Modus, Reasoning-Stufe und Thinking; seine Slash-Befehle funktionieren auch.
- Berechtigungsmodus: jedes Mal fragen oder allen Tools vertrauen.
- Du kannst ihm MCP-Server und Skills geben und frühere Sitzungen importieren und fortsetzen.
- „Aktualisieren“ unter Einstellungen → Agenten startet Kiros eigenen Updater.
- Unterhaltungen, die du mit Kiro als benutzerdefiniertem Agenten geführt hast, wandern zum eingebauten Agenten.
- Upstream vorgeschlagen: [spacering-net/codeg#851](https://github.com/spacering-net/codeg/pull/851).

</details>

<details>
<summary><strong>Tabs pro Fenster</strong> – Details</summary>
<br/>

- Gesteuert über „Konversationstabs fensterübergreifend synchronisieren“ unter Einstellungen → Allgemein, standardmäßig an: Alle Fenster und Geräte am Server (Computer, Tablet, Handy) teilen sich wie im offiziellen Build einen Satz geöffneter Tabs.
- Ausgeschaltet lässt das Öffnen, Fokussieren oder Schließen eines Konversationstabs in einem Fenster die anderen unverändert, und nach dem Neuladen kommen die Tabs genau dieses Fensters zurück.
- Unterhaltungen, Nachrichten und Löschungen erreichen unabhängig von der Einstellung immer alle Fenster.
- Die Einstellung liegt auf dem Server: Wer sie in einem beliebigen Fenster oder auf einem beliebigen Gerät umschaltet, schaltet alle mit diesem Server verbundenen Fenster und Geräte mit um. (Bis 0.35.2-1 wurde sie pro Browser gespeichert und war im Browser standardmäßig aus.)
- Upstream angefragt in [spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547).

</details>

<details>
<summary><strong>Claude Code zeigt sein Thinking</strong> – Details</summary>
<br/>

- Bei neueren Modellen bekommt die offizielle Version für jeden Thinking-Block nur eine verschlüsselte Signatur, Claudes Thinking bleibt also leer.
- Diese Version fordert bei der API Thinking-Zusammenfassungen an – dasselbe, was das Terminal-`claude` mit eingeschaltetem `showThinkingSummaries` zeigt.
- Zum Abschalten trägst du das in `~/.claude/settings.json` (oder in die `.claude/settings.json` eines Projekts) ein:

  ```json
  "showThinkingSummaries": false
  ```

- Für frühere Unterhaltungen wurde nie Thinking-Text geliefert, er lässt sich daher nicht nachholen.

</details>

<details>
<summary><strong>Übersetzte Antworten und Nachrichten</strong>: Details</summary>
<br/>

- Wird unter Einstellungen → Übersetzung mit einem API-Schlüssel von [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) oder [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey) aktiviert; abgerechnet wird nach den Regeln der jeweiligen Plattform. Standard ist `qwen-mt-flash` von Bailian, das im Test etwa 0,5 s pro Absatz brauchte.
- Antworten: Ist der Schalter „Antworten übersetzen“ an, wird eine Antwort übersetzt, sobald der Agent sie fertig hat – als Ganzes in einer Anfrage, damit das Modell die ganze Antwort als Kontext sieht – und anstelle des Originals angezeigt; solange der Agent schreibt, siehst du das Original. Die Übersetzen-Schaltfläche unter jeder Antwort wechselt zurück zum Original oder übersetzt bei ausgeschalteter Automatik nur diese Antwort. Denkprozesse werden beim Aufklappen übersetzt und folgen derselben Schaltfläche; Codeblöcke und Tool-Aufrufe werden nicht übersetzt. Die Kopieren-Schaltfläche kopiert, was gerade angezeigt wird.
- Sitzungsnamen: Bei aktiver automatischer Antwortübersetzung erscheinen auch die Namen, die der Agent Sitzungen gibt, in deiner Sprache – in der Seitenleiste, den Tabs und der Gesprächskopfzeile. Einen selbst vergebenen Namen lässt sie, wie er ist; fährst du in der Seitenleiste über eine Sitzung, siehst du das Original.
- Nachrichten: Die Übersetzen-Schaltfläche des Eingabefelds, `⌘⇧L` (`Strg+Umschalt+L` unter Windows und Linux) oder das Kontextmenü übersetzen das Eingabefeld direkt in die Zielsprache (standardmäßig Englisch). Erwähnungen, Slash-Befehle, Pfade und Code bleiben unverändert, und `⌘Z` holt das Original in einem Schritt zurück. Übersetzt wird erst, wenn du es auslöst – ein halb geschriebener Entwurf verlässt den Rechner nie. „Beim Senden übersetzen“ erledigt das bei jedem Senden. Nach dem Senden wechselt die Übersetzen-Schaltfläche neben der Nachricht zurück zu dem, was du vor dem Übersetzen geschrieben hast, und Kopieren folgt der Anzeige.
- Bei einem Anfragelimit wird auf `qwen-mt-lite` oder die andere Engine ausgewichen; ein Glossar legt fest, wie bestimmte Begriffe übersetzt werden, und ein Eintrag ohne Übersetzung lässt seinen Begriff unverändert.
- API-Schlüssel liegen im Schlüsselbund des Systems (auf einem Server in `tokens.json` im Datenverzeichnis), nie in der Datenbank. Übersetzungsanfragen verbinden sich direkt, ohne Proxy, und nehmen den Proxy nur, wenn das Netz keinen anderen Weg nach draußen lässt.
- Übersetzte Antworten dienen nur der Anzeige: Der Verlauf der Unterhaltung behält den Originaltext des Agenten. Was du vor dem Übersetzen einer Nachricht geschrieben hast, wird in der lokalen Datenbank gespeichert; das Leeren des Übersetzungs-Caches löscht es nicht.

</details>

### Veröffentlichung

|  | Diese Version | Offizielle Version |
| --- | --- | --- |
| Downloads und Updates | [Releases](https://github.com/keh4l/codeg/releases) dieses Repositorys, mit dem eigenen Schlüssel dieses Forks signiert | Releases von [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) |
| Version | `<Upstream-Version>-<n>`: `0.33.0-2` ist die 2. Version auf Basis von Upstream 0.33.0 | z. B. `0.33.0` |
| macOS-Notarisierung | Nein; beim ersten Start einmal erlauben (siehe [Installation](#installation)) | Ja |
| Docker-Image | Nein | Ja |

Updates wechseln nie die Seite: Diese Version aktualisiert sich nie auf ein offizielles Release, und eine offizielle Version nie auf diese. Der Branch `keh4l` ist Upstreams `main` plus die Änderungen oben.

## Installation

### Desktop

Lade den neuesten Installer unter [Releases](https://github.com/keh4l/codeg/releases/latest) herunter:

| System | Installer |
| --- | --- |
| macOS (Apple Silicon oder Intel) | `.dmg` |
| Windows (x64 oder ARM64) | `-setup.exe` |
| Linux | `.deb`, `.rpm` oder `.AppImage` |

Sie wird als dieselbe App wie das offizielle Codeg installiert: Sie ersetzt es und behält deine Unterhaltungen und Einstellungen.

> [!NOTE]
> Wenn macOS beim ersten Start meldet, die App sei beschädigt oder könne nicht geöffnet werden, führe einmal Folgendes aus oder erlaube sie unter Systemeinstellungen → Datenschutz & Sicherheit:
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### Server

Linux oder macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

Beide installieren aus den Releases dieses Repositorys, und auch der eingebaute Updater des Servers nutzt sie.

### Zurück zur offiziellen Version

> [!WARNING]
> Sichere zuerst deine Codeg-Daten. Diese Version fügt eine Datenbankmigration für Kiro hinzu, und eine offizielle Version ohne sie startet mit denselben Daten möglicherweise nicht.

## Dokumentation

Funktionen, Konfiguration und Nutzung beschreiben das offizielle [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.de.md) und [docs.codeg.app](https://docs.codeg.app). Sie beziehen sich auf die offizielle Version; die Unterschiede stehen oben.

## Lizenz und Danksagung

Apache-2.0, siehe [LICENSE](../../LICENSE). Codeg wird von [xintaofei](https://github.com/xintaofei) und den Mitwirkenden entwickelt; diese Version ergänzt es nur. Codeg baut auf [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) und [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) auf.
