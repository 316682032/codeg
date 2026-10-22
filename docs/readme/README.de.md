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
    <td width="50%" valign="top">🪟 <strong>Tabs pro Fenster</strong><br/>Mit mehreren Fenstern auf einem Server lässt sich die Tab-Synchronisierung abschalten, dann behält jedes Fenster seine eigenen Tabs; Unterhaltungen und Nachrichten werden weiter synchronisiert.</td>
    <td width="50%" valign="top">💭 <strong>Claude Code zeigt sein Thinking</strong><br/>Fordert bei der API Thinking-Zusammenfassungen an, der Thinking-Bereich bleibt also nicht mehr leer.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>Übersetzte Antworten und Nachrichten</strong><br/>Jeder Abschnitt einer Agentenantwort wird in deine Sprache übersetzt, sobald er fertig ist, auch Denkprozesse, Fragekarten und Aufgabenlisten, und eine Nachricht wird per Tastendruck ins Englische übersetzt, mit Übersetzungsmodellen von Alibaba Cloud oder Tencent Cloud in etwa einer Sekunde pro 1.000 Zeichen.</td>
    <td width="50%" valign="top">🧩 <strong>Sitzungen von Claude-Code-Subagenten</strong><br/>Subagent-Karten bekommen „Subagent-Sitzung ansehen“, das wie bei Codex die vollständige Unterhaltung öffnet; einem Subagenten lässt sich bei der Arbeit zusehen.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>Offene Konversationen auf dem Handy wechseln</strong><br/>Auf dem Handy zeigt ein Tipp auf den Konversationstitel alle offenen Konversationen und wie weit jede ist; ein Tipp auf eine wechselt dorthin. Der Titel meldet sich, wenn eine andere auf dich wartet.</td>
    <td width="50%" valign="top">🎨 <strong>Agenten erzeugen Bilder</strong><br/>Adresse, Schlüssel und Modelle von OpenAI, Grok, Gemini oder einem Relay eintragen, und jeder Agent mit MCP-Unterstützung kann Bilder erzeugen und bearbeiten und dort speichern, wo er es angibt; das Bild erscheint in der Konversation, und der Schlüssel geht nie durch den Agenten.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">⏳ <strong>Ergebnisse auch bei Agenten mit kurzem Timeout</strong><br/>Manche Agenten warten nur 30 bis 60 Sekunden auf einen Tool-Aufruf. Dieser Build begrenzt jedes Warten je Agent, antwortet rechtzeitig und holt den Rest beim nächsten Aufruf ab, sodass eine langsame Antwort auf eine Frage nicht mehr als keine Antwort zählt.</td>
    <td width="50%" valign="top">🗂️ <strong>Nur die Agenten, die du nutzt</strong><br/>Die Einstellungen listen nur die Agenten, die du hinzugefügt hast; der Rest wartet unter „Agenten hinzufügen“, durchsuchbar und mehrere auf einmal hinzuzufügen. Eine neue Installation aktiviert nur, was hier installiert ist, damit die Auswahl für neue Unterhaltungen kurz bleibt.</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>Nah am Upstream</strong><br/>Upstream wird regelmäßig hineingemergt; was hier nicht steht, funktioniert genau wie in der offiziellen Version. Das eingebaute Kiro CLI, das diese Version als Erstes hinzugefügt hat, ist seit 0.36.0 Teil der offiziellen Version.</td>
  </tr>
</table>

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
- Antworten: Ist der Schalter „Antworten übersetzen“ an, wird jeder Abschnitt einer Antwort übersetzt, sobald der Agent ihn fertig hat (zu einem Tool-Aufruf oder Denkprozess übergeht oder die Runde endet) – als Ganzes in einer Anfrage, damit das Modell ihn vollständig sieht – und anstelle des Originals angezeigt; solange der Agent schreibt, siehst du das Original. Die Übersetzen-Schaltfläche unter jeder Antwort wechselt zurück zum Original oder übersetzt bei ausgeschalteter Automatik nur diese Antwort. Denkprozesse werden beim Aufklappen übersetzt und folgen derselben Schaltfläche; Codeblöcke und Tool-Aufrufe werden nicht übersetzt. Die Kopieren-Schaltfläche kopiert, was gerade angezeigt wird.
- Sitzungsnamen: Bei aktiver automatischer Antwortübersetzung erscheinen auch die Namen, die der Agent Sitzungen gibt, in deiner Sprache – in der Seitenleiste, den Tabs und der Gesprächskopfzeile. Einen selbst vergebenen Namen lässt sie, wie er ist; fährst du in der Seitenleiste über eine Sitzung, siehst du das Original.
- Fragekarten: Stellt dir ein Agent eine Frage, erscheinen Frage und Optionen standardmäßig übersetzt (abschaltbar unter Einstellungen → Übersetzung), und die Schaltfläche oben rechts auf der Karte wechselt zwischen Original und Übersetzung; die Antwort nennt weiterhin die Option des Agenten. Eine unter „Andere“ getippte Antwort wird mit der Schaltfläche daneben oder `⌘⇧L` in die Zielsprache übersetzt, und dieselbe Schaltfläche stellt sie wieder her; mit „Beim Senden übersetzen“ geschieht das beim Absenden. Als geheim markierte Fragen werden nie zur Übersetzung geschickt.
- Aufgabenlisten: Die Schritte der Aufgabenliste eines Agenten (die Plankarte in einer Antwort, der schwebende Plan über der Unterhaltung und der Plan in den Sitzungsdetails) erscheinen standardmäßig übersetzt, die ganze Liste in einer Anfrage (abschaltbar mit „Aufgabenlisten automatisch übersetzen“ unter Einstellungen → Übersetzung), und die Schaltfläche oben rechts auf der Plankarte wechselt zwischen Original und Übersetzung; ist der Schalter aus, übersetzt dieselbe Schaltfläche von Hand.
- Nachrichten: Die Übersetzen-Schaltfläche des Eingabefelds, `⌘⇧L` (`Strg+Umschalt+L` unter Windows und Linux) oder das Kontextmenü übersetzen das Eingabefeld direkt in die Zielsprache (standardmäßig Englisch). Erwähnungen, Slash-Befehle, Pfade und Code bleiben unverändert, und `⌘Z` holt das Original in einem Schritt zurück. Übersetzt wird erst, wenn du es auslöst – ein halb geschriebener Entwurf verlässt den Rechner nie. „Beim Senden übersetzen“ erledigt das bei jedem Senden. Nach dem Senden wechselt die Übersetzen-Schaltfläche neben der Nachricht zurück zu dem, was du vor dem Übersetzen geschrieben hast, und Kopieren folgt der Anzeige.
- Bei einem Anfragelimit wird auf `qwen-mt-lite` oder die andere Engine ausgewichen; ein Glossar legt fest, wie bestimmte Begriffe übersetzt werden, und ein Eintrag ohne Übersetzung lässt seinen Begriff unverändert.
- API-Schlüssel liegen im Schlüsselbund des Systems (auf einem Server in `tokens.json` im Datenverzeichnis), nie in der Datenbank. Übersetzungsanfragen verbinden sich direkt, ohne Proxy, und nehmen den Proxy nur, wenn das Netz keinen anderen Weg nach draußen lässt.
- Übersetzte Antworten dienen nur der Anzeige: Der Verlauf der Unterhaltung behält den Originaltext des Agenten. Was du vor dem Übersetzen einer Nachricht geschrieben hast, wird in der lokalen Datenbank gespeichert; das Leeren des Übersetzungs-Caches löscht es nicht.

</details>

<details>
<summary><strong>Sitzungen von Claude-Code-Subagenten</strong>: Details</summary>
<br/>

- Claude Code speichert die gesamte Unterhaltung jedes Subagenten (Agent- / Task-Tool) in einer eigenen Datei, `~/.claude/projects/<Projekt>/<Sitzungs-ID>/subagents/agent-<id>.jsonl`. Im offiziellen Build zeigt die Karte nur eine Zusammenfassung des Ablaufs und das Endergebnis (bei einem Subagenten im Hintergrund nicht einmal die Zusammenfassung), und die Datei lässt sich nicht öffnen.
- Dieser Build ergänzt neben dem Kartentitel die Schaltfläche „Subagent-Sitzung ansehen“, die diese Datei in einem Seitenbereich öffnet: die Aufgabe, die der Subagent bekommen hat, seine Denkprozesse und Antworten und jeden Tool-Aufruf mit Ein- und Ausgabe. Es ist dieselbe Schaltfläche wie auf den Subagent-Karten von Codex und Grok.
- Die Schaltfläche erscheint, sobald der Subagent startet, im Vorder- wie im Hintergrund. Wird sie geöffnet, während er noch arbeitet, aktualisiert sich der Bereich alle 2 Sekunden und zeigt den gerade laufenden Tool-Aufruf als laufend an. Nach dem Neuladen der Unterhaltung geöffnet, zeigt er die Datei im damaligen Stand; Schließen und erneutes Öffnen zeigt den aktuellen.
- Auch frühere Unterhaltungen funktionieren, solange die Datei des Subagenten noch da ist.

</details>

<details>
<summary><strong>Offene Konversationen auf dem Handy wechseln</strong> – Details</summary>
<br/>

- Unter 768 px Breite (Handy oder sehr schmales Browserfenster) zeigt der offizielle Build keine Tableiste für Konversationen. Eine andere offene Konversation findet man nur im gesamten Verlauf der Seitenleiste, und eine abgeschlossene, die die Seitenleiste standardmäßig ausblendet, ist gar nicht erreichbar.
- Dieser Build macht den Konversationstitel zu einer Schaltfläche: Hinter dem Titel stehen ⌄ und die Zahl der offenen Konversationen, mit einem orangen Punkt auf der Zahl, solange eine andere Konversation auf deine Freigabe oder Antwort wartet. Ein Tipp öffnet von unten „Offene Konversationen“: alle offenen Konversationen in Tab-Reihenfolge, jede mit ihrem Status (Wartet auf dich, In Bearbeitung, Prüfung, Abgeschlossen, Abgebrochen, Nicht gesendet). Ein Tipp wechselt dorthin, × schließt sie; außerdem lässt sich eine neue Konversation starten oder über „Alle Konversationen (mit Verlauf)“ die Seitenleiste öffnen. Schließen per Tipp daneben, Herunterziehen oder Zurück-Geste.
- „Wartet auf dich“ ist nur bekannt, solange dieses Gerät mit der Konversation verbunden ist: Es erscheint bei Konversationen, die auf diesem Gerät mindestens einmal geöffnet wurden; die anderen zeigen ihren gespeicherten Status.
- Mit „Konversationstabs fensterübergreifend synchronisieren“ an (Standard) wird eine auf dem Handy geschlossene Konversation auch am Computer geschlossen, genau wie beim Schließen ihres Tabs dort.
- Ab 768 px Breite (Computer, Tablets) ändert sich nichts: Die Tableiste bleibt.
- Angefragt in [keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10).

</details>

<details>
<summary><strong>Agenten erzeugen Bilder</strong> – Details</summary>
<br/>

- Unter Einstellungen → Bildgenerierung einen Dienst hinzufügen: OpenAI-API (OpenAI selbst, Grok und die meisten Relays) oder Gemini-API (Google selbst oder ein Relay) wählen, die Adresse für die offizielle leer lassen, dann den Schlüssel und Modellnamen wie `gpt-image-2`, `grok-imagine-image-2.0` oder `gemini-3-pro-image` eintragen. Es können mehrere sein. „Testen“ erzeugt ein kleines Bild in niedriger Qualität, um zu prüfen, ob es geht; der Dienst berechnet es.
- Ist der Schalter oben auf der Seite an (derselbe wie „Bilder erzeugen“ unter Einstellungen → Zusammenarbeit → Tools in der Unterhaltung, standardmäßig aus) und hat mindestens ein Dienst Schlüssel und Modell, bekommen Agenten, die danach starten, zwei Tools: `image_generate` und `image_get_result`. Ein Agent kann Modell, Seitenverhältnis, Auflösung und transparenten Hintergrund wählen und Referenzbilder übergeben, um ein vorhandenes Bild zu bearbeiten; ohne Modell gilt das Standardmodell aus den Einstellungen.
- Wo das Bild gespeichert wird, bestimmt der Agent; ein relativer Pfad gilt ab dem Arbeitsordner der Konversation. Ohne Pfad landen Bilder in `~/.codeg/generated-images/<Datum>/`, einem Ordner, den man in den Einstellungen ändern kann.
- Jedes Bild bekommt eine Karte in der Konversation: während der Erzeugung die bisherigen Sekunden, danach das Bild, wo es gespeichert wurde (Klick öffnet es), Dienst und Modell, Größe und Dauer. Das Bild wird aus der Datei gelesen, nach dem Neuladen der Konversation ist es also zu sehen, solange die Datei da ist.
- Standardmäßig bekommt der Agent zusätzlich eine etwa 512 Pixel breite Kopie, damit er das Ergebnis sieht, bevor er entscheidet, ob er es ändert; das belegt etwas von seinem Kontext. In den Einstellungen ausschalten, wenn das Modell des Agenten keine Bilder lesen kann.
- Ein Bild dauert oft zwischen einigen zehn Sekunden und zwei Minuten. Ist das länger, als der Agent auf einen Tool-Aufruf warten kann, bekommt er zuerst eine Job-ID und holt das Bild mit `image_get_result` ab; siehe nächster Abschnitt.
- Den Aufruf macht Codeg selbst; der Agent bekommt nur die Bilddatei. API-Schlüssel liegen im Schlüsselbund des Systems (im Server-Build in `tokens.json` im Datenordner), nicht in der Datenbank, und gehören nicht zur Konfigurationssynchronisierung.

</details>

<details>
<summary><strong>Ergebnisse auch bei Agenten mit kurzem Timeout</strong> – Details</summary>
<br/>

- Wie lange ein Agent auf einen MCP-Tool-Aufruf wartet, ist verschieden: ZCode 30 Sekunden; Cursor, Kimi, DeepSeek und OpenCode 60 Sekunden; Codex 5 Minuten; Claude Code, Qoder, CodeBuddy und Grok praktisch unbegrenzt. Im offiziellen Build kann `get_delegation_status` (Warten auf das Ergebnis einer delegierten Aufgabe) in einem Aufruf lange warten, und `ask_user_question` (eine Frage an dich) wartet, bis du antwortest; nach Ablauf der Frist wertet der Agent den Aufruf als fehlgeschlagen und macht weiter, die Frage gilt also als unbeantwortet.
- Dieser Build gibt diesen Tools je Agent eine Obergrenze unterhalb seiner Frist: etwa 20 Sekunden bei ZCode, 45 Sekunden bei OpenCode, 4 Minuten bei Codex; Agenten ohne Frist bekommen keine, wie im offiziellen Build. Ist die Grenze ohne Ergebnis erreicht, kehrt der Aufruf zurück und sagt dem Agenten, wie er weiter wartet.
- Fragen: Hast du bis dahin nicht geantwortet, bleibt die Fragekarte stehen, und der Agent wartet mit einem neuen Tool weiter, `get_question_answer`; sobald du antwortest, steht die Antwort in der ursprünglichen Fragekarte.
- Delegierte Aufgaben: Ein Aufruf von `get_delegation_status` wartet höchstens bis zur Grenze und liefert dann den aktuellen Stand der Aufgaben. Bei der Bildgenerierung ist es genauso; siehe vorheriger Abschnitt.
- Während des Wartens bekommt der Agent alle 10 Sekunden eine Fortschrittsmeldung, sodass Agenten, die ihre Frist bei Fortschritt verlängern, etwa OpenCode, länger warten können.

</details>

<details>
<summary><strong>Nur die Agenten, die du nutzt</strong> – Details</summary>
<br/>

- Es gibt fast 20 eingebaute Agenten, und der offizielle Build aktiviert alle, ob installiert oder nicht: eine lange Liste in den Einstellungen, eine Auswahl für neue Unterhaltungen voller nicht installierter Agenten (die Unterhaltungsseite installiert nie einen, die Wahl bringt also nichts) und eine Installationsprüfung für jeden bei jedem Öffnen der Einstellungsseite.
- In diesem Build listet Einstellungen → Agenten nur „Meine Agenten“, weiterhin per Ziehen sortierbar. „Hinzufügen“ in der Titelleiste und die Zeile unter der Liste öffnen „Agenten hinzufügen“: nach Name oder Beschreibung suchen, nach installiert / nicht installiert filtern, die hier schon installierten zuerst finden und mehrere auf einmal hinzufügen. Ein nicht installierter wird nach dem Hinzufügen in seinen Details installiert.
- Der Schalter in den Details eines Agenten ist „Meine Agenten“: ausschalten nimmt den Agenten aus der Liste, mit Rückgängig. Es ist die Einstellung „aktiviert“ des offiziellen Builds, daher folgen ihr die Auswahl für neue Unterhaltungen, die Delegation und alles andere.
- Beim Öffnen der Einstellungsseite werden nur „Meine Agenten“ geprüft; jeder andere Agent, wenn du ihn öffnest.
- Solange codeg für einen Agenten noch keine Einstellungen hat (eine neue Installation oder ein eingebauter Agent aus einer späteren Version), aktiviert es ihn nur, wenn er hier als installiert erkannt wird. Als installiert gilt ein Agent, sobald der ACP-Adapter oder die CLI, die codeg startet, vorhanden ist; eine neue Installation hat daher oft keinen, und die Liste beginnt leer: wähle unter „Agenten hinzufügen“. Ein später installierter Agent wird nicht von selbst hinzugefügt, und bestehende Einstellungen ändern sich nie.
- Nach einem Update von einem früheren Build mit nicht installierten Agenten in „Meine Agenten“ bietet ein Hinweis oben in der Liste einmal an, „nur die installierten zu behalten“ oder es so zu lassen (die Wahl wird pro Gerät gemerkt).
- Die Auswahl für neue Unterhaltungen endet ihre Zeile mit einem „+“, das „Agenten hinzufügen“ öffnet; passen nicht alle Agenten hinein, steht es unten im „Mehr“-Menü. Ist kein Agent aktiviert, öffnet die Schaltfläche der Auswahl ebenfalls „Agenten hinzufügen“.

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
> Sichere zuerst deine Codeg-Daten. Diese Version fügt Datenbankmigrationen hinzu, die die offizielle Version nicht hat (etwa die Tabellen der Übersetzung), und eine offizielle Version startet mit denselben Daten möglicherweise nicht.

## Dokumentation

Funktionen, Konfiguration und Nutzung beschreiben das offizielle [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.de.md) und [docs.codeg.app](https://docs.codeg.app). Sie beziehen sich auf die offizielle Version; die Unterschiede stehen oben.

## Lizenz und Danksagung

Apache-2.0, siehe [LICENSE](../../LICENSE). Codeg wird von [xintaofei](https://github.com/xintaofei) und den Mitwirkenden entwickelt; diese Version ergänzt es nur. Codeg baut auf [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) und [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) auf.
