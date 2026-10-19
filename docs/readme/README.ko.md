<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg 커스텀 빌드
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="최신 릴리스" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="업스트림" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="라이선스" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.zh-TW.md">繁體中文</a> · <a href="./README.ja.md">日本語</a> · <strong>한국어</strong> · <a href="./README.es.md">Español</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.fr.md">Français</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong>xintaofei의 멀티 에이전트 코딩 워크스페이스 <a href="https://github.com/spacering-net/codeg">Codeg</a>, keh4l의 커스텀 빌드</strong><br/>
  여러 AI 코딩 에이전트를 한곳에서 쓰고 서로 협업하게 해 줍니다. 업스트림을 꾸준히 따라가면서 몇 가지 기능을 더했습니다.
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>다운로드</ins></a> · <a href="#설치"><ins>설치 안내</ins></a> · <a href="https://docs.codeg.app"><ins>공식 문서</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="Codeg 워크스페이스: 에이전트와의 대화, 그 옆의 실시간 diff와 프로젝트 파일" width="960" />
  </picture>
</p>

## 공식 빌드와 다른 점

<table>
  <tr>
    <td width="50%" valign="top">🪟 <strong>창마다 자체 탭</strong><br/>같은 서버에서 여러 창을 열 때 탭 동기화를 끄면 창마다 자체 탭을 유지합니다. 대화와 메시지는 그대로 동기화됩니다.</td>
    <td width="50%" valign="top">💭 <strong>Claude Code의 생각 과정 표시</strong><br/>API에 생각 요약을 요청하므로 생각 영역이 더 이상 비어 있지 않습니다.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>답변과 메시지 번역</strong><br/>에이전트의 답변을 한 덩어리씩 다 쓰는 대로 내 언어로(생각 과정, 질문 카드, 할 일 목록도), 보낼 메시지를 키 한 번으로 영어로 번역합니다. Alibaba Cloud 또는 Tencent Cloud 번역 모델을 쓰며 1,000자당 약 1초입니다.</td>
    <td width="50%" valign="top">🧩 <strong>Claude Code 하위 에이전트 세션</strong><br/>하위 에이전트 카드에 '하위 에이전트 세션 보기'가 생겨 Codex처럼 전체 대화 기록을 열 수 있습니다. 하위 에이전트가 실행 중일 때도 볼 수 있습니다.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>휴대폰에서 열린 대화 빠르게 전환</strong><br/>휴대폰에서 대화 제목을 누르면 열린 대화 전부와 각 대화의 진행 상황이 보이고, 눌러서 바로 전환합니다. 다른 대화가 응답을 기다리면 제목 옆에 알려 줍니다.</td>
    <td width="50%" valign="top">🔄 <strong>업스트림 추종</strong><br/>업스트림 변경은 정기적으로 병합됩니다. 여기에 없는 기능은 공식 빌드와 똑같습니다. 이 빌드가 처음 추가한 Kiro CLI 내장 기능은 0.36.0부터 공식 빌드에 포함되었습니다.</td>
  </tr>
</table>

<details>
<summary><strong>창마다 자체 탭</strong> 자세히</summary>
<br/>

- 설정 → 일반의 '창 간 대화 탭 동기화'로 바꿀 수 있으며 기본으로 켜져 있습니다. 켜져 있으면 같은 서버에 연결된 모든 창과 기기(PC, 태블릿, 휴대폰)가 공식 빌드처럼 하나의 탭 세트를 공유합니다.
- 끄면 한 창에서 대화 탭을 열거나 전환하거나 닫아도 다른 창은 그대로이고, 새로고침하면 그 창의 탭이 그대로 돌아옵니다.
- 대화, 메시지, 삭제는 이 설정과 관계없이 항상 모든 창에 반영됩니다.
- 이 설정은 서버에 저장됩니다. 어느 창이나 기기에서 바꾸든 그 서버에 연결된 모든 창과 기기가 함께 바뀝니다. (0.35.2-1 이하에서는 브라우저마다 따로 저장되었고 브라우저에서는 기본으로 꺼져 있었습니다.)
- 업스트림 요청: [spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547).

</details>

<details>
<summary><strong>Claude Code의 생각 과정 표시</strong> 자세히</summary>
<br/>

- 최신 모델에서는 공식 빌드에 생각(thinking) 블록의 암호화된 서명만 오기 때문에 Claude의 생각 내용이 비어 있습니다.
- 이 빌드는 API에 생각 요약을 요청합니다. 터미널의 `claude`에서 `showThinkingSummaries`를 켰을 때와 같은 내용입니다.
- 원하지 않으면 `~/.claude/settings.json`(또는 프로젝트의 `.claude/settings.json`)에 다음을 추가하세요:

  ```json
  "showThinkingSummaries": false
  ```

- 이전 대화는 생각 텍스트를 받은 적이 없으므로 되살릴 수 없습니다.

</details>

<details>
<summary><strong>답변과 메시지 번역</strong> 자세히</summary>
<br/>

- 설정 → 번역에 [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) 또는 [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey)의 API 키를 넣으면 켜집니다. 요금은 각 플랫폼 기준을 따릅니다. 기본값은 Bailian의 `qwen-mt-flash`이며, 테스트에서 단락당 약 0.5초였습니다.
- 답변: "답변 번역" 스위치를 켜면 에이전트가 답변을 한 덩어리씩 다 쓸 때마다(도구 호출이나 생각으로 넘어가거나 턴이 끝날 때) 그 덩어리 전체를 한 번의 요청으로 번역해(모델이 덩어리 전체를 맥락으로 봅니다) 원문 대신 번역문을 보여 주며, 쓰는 동안에는 원문을 보여 줍니다. 각 답변 아래의 번역 버튼으로 원문으로 돌아갈 수 있고, 자동 번역이 꺼져 있을 때는 그 답변만 번역할 수 있습니다. 생각 과정은 펼칠 때 번역하며 같은 버튼으로 전환됩니다. 코드 블록과 도구 호출은 번역하지 않습니다. 복사 버튼은 화면에 보이는 내용을 복사합니다.
- 세션 이름: 답변 자동 번역이 켜져 있으면 에이전트가 붙인 세션 이름도 사이드바, 탭, 대화 제목 표시줄에 사용자의 언어로 표시합니다. 직접 지은 이름은 번역하지 않으며, 사이드바의 세션에 마우스를 올리면 원래 이름을 볼 수 있습니다.
- 질문 카드: 에이전트가 질문하면 질문과 선택지를 기본으로 번역해 보여 줍니다(설정 → 번역에서 끌 수 있습니다). 카드 오른쪽 위 버튼으로 원문과 번역을 전환하며, 답변은 에이전트가 제시한 원래 선택지로 보냅니다. "기타"에 쓴 답변은 옆의 번역 버튼이나 `⌘⇧L`로 대상 언어로 번역하고, 다시 누르면 되돌립니다. "보낼 때 번역"이 켜져 있으면 제출 전에 자동으로 번역합니다. 비밀로 표시된 질문은 번역에 보내지 않습니다.
- 할 일 목록: 에이전트가 세운 할 일 목록(답변 안의 계획 카드, 대화 위의 떠 있는 계획, 세션 상세의 계획)은 각 단계를 기본으로 번역해 보여 주며, 목록 전체를 한 번의 요청으로 번역합니다(설정 → 번역의 "할 일 목록 자동 번역"으로 끌 수 있습니다). 계획 카드 오른쪽 위 버튼으로 원문과 번역을 전환하고, 자동 번역이 꺼져 있으면 이 버튼으로 직접 번역합니다.
- 메시지: 입력창의 번역 버튼, `⌘⇧L`(Windows와 Linux에서는 `Ctrl+Shift+L`) 또는 오른쪽 클릭 메뉴로 입력창의 내용을 그 자리에서 대상 언어(기본값 영어)로 번역합니다. 멘션, 슬래시 명령, 경로, 코드는 그대로 남고, `⌘Z` 한 번으로 원문으로 돌아갑니다. 번역은 누를 때만 하며, 쓰다 만 초안이 전송되는 일은 없습니다. "보낼 때 번역"을 켤 수도 있습니다. 보낸 뒤에는 메시지 옆 번역 버튼으로 번역 전에 쓴 원문으로 돌아갈 수 있고, 복사도 보이는 내용을 따릅니다.
- 요청 한도에 걸리면 `qwen-mt-lite`나 다른 엔진으로 넘어갑니다. 용어집으로 특정 용어의 번역을 고정할 수 있으며, 번역을 비워 두면 그 용어는 원문 그대로 둡니다.
- API 키는 OS 키체인(서버판은 데이터 디렉터리의 `tokens.json`)에 저장되며 데이터베이스에는 기록되지 않습니다. 번역 요청은 프록시를 거치지 않고 직접 연결하며, 프록시로만 밖에 나갈 수 있는 네트워크에서는 자동으로 프록시를 씁니다.
- 답변의 번역문은 표시용일 뿐이며, 대화 기록에는 에이전트의 원문이 그대로 남습니다. 메시지의 번역 전 원문은 로컬 데이터베이스에 따로 저장되며, 번역 캐시를 비워도 지워지지 않습니다.

</details>

<details>
<summary><strong>Claude Code 하위 에이전트 세션</strong> 자세히</summary>
<br/>

- Claude Code는 하위 에이전트(Agent / Task 도구)마다 대화 전체를 `~/.claude/projects/<프로젝트>/<세션 id>/subagents/agent-<id>.jsonl`에 따로 저장합니다. 공식 빌드의 카드에는 진행 과정 요약과 최종 결과만 있고(백그라운드 하위 에이전트는 요약도 없음) 이 파일은 열 수 없습니다.
- 이 빌드는 카드 제목 옆에 '하위 에이전트 세션 보기' 버튼을 추가해 오른쪽 패널에서 이 기록을 엽니다. 받은 작업, 생각 과정, 답변, 그리고 각 도구 호출의 입력과 출력을 볼 수 있습니다. Codex와 Grok 하위 에이전트 카드에 있는 것과 같은 버튼입니다.
- 버튼은 하위 에이전트가 시작하자마자 나타납니다(포그라운드든 백그라운드든 같습니다). 실행 중에 열면 2초마다 새로 고쳐지고, 실행 중인 도구 호출은 '실행 중'으로 표시됩니다. 대화를 다시 불러온 뒤에 열면 그 시점의 내용이므로, 닫았다가 다시 열면 최신 내용이 보입니다.
- 예전 대화도 기록 파일이 남아 있으면 볼 수 있습니다.

</details>

<details>
<summary><strong>휴대폰에서 열린 대화 빠르게 전환</strong> 자세히</summary>
<br/>

- 화면 너비가 768픽셀 미만이면(휴대폰이나 아주 좁은 브라우저 창) 공식 빌드는 대화 탭 막대를 표시하지 않습니다. 열려 있는 다른 대화로 가려면 사이드바의 전체 기록에서 찾아야 하고, 완료된 대화는 사이드바에서 기본으로 숨겨지므로 열려 있어도 찾을 수 없습니다.
- 이 빌드는 대화 제목을 버튼으로 바꿉니다. 제목 뒤에 ⌄와 열린 대화 수가 붙고, 다른 대화가 승인이나 답변을 기다리는 동안 숫자에 주황색 점이 켜집니다. 누르면 아래에서 '열린 대화'가 열리며, 열린 대화를 모두 탭 순서대로 각각의 상태(응답 필요, 진행 중, 검토, 완료, 취소됨, 보내지 않음)와 함께 보여 줍니다. 누르면 전환하고 ×로 닫습니다. 새 대화를 시작하거나 '모든 대화 (기록 포함)'로 사이드바를 열 수도 있습니다. 바깥을 누르거나 아래로 끌거나 뒤로 가기 제스처로 닫습니다.
- '응답 필요'는 이 기기가 그 대화에 연결되어 있을 때만 알 수 있습니다. 이 기기에서 한 번이라도 연 대화에 표시되고, 열지 않은 대화에는 저장된 상태가 표시됩니다.
- '창 간 대화 탭 동기화'가 켜져 있으면(기본값) 휴대폰에서 닫은 대화는 PC에서도 닫힙니다. PC에서 탭을 닫을 때와 같습니다.
- 너비 768픽셀 이상(PC, 태블릿)에서는 바뀌지 않고 탭 막대가 그대로입니다.
- 관련 요청: [keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10).

</details>

### 배포 방식

|  | 이 빌드 | 공식 빌드 |
| --- | --- | --- |
| 다운로드와 업데이트 | 이 저장소의 [Releases](https://github.com/keh4l/codeg/releases), 이 포크 자체의 키로 서명 | [spacering-net/codeg](https://github.com/spacering-net/codeg/releases)의 Releases |
| 버전 | `<업스트림 버전>-<번호>`: `0.33.0-2`는 업스트림 0.33.0 기반의 두 번째 빌드 | 예: `0.33.0` |
| macOS 공증 | 없음, 처음 열 때 한 번 허용 필요([설치](#설치) 참고) | 있음 |
| Docker 이미지 | 없음 | 있음 |

업데이트는 서로 넘어가지 않습니다. 이 빌드가 공식 릴리스로 업데이트되거나 공식 빌드가 이 빌드로 업데이트되는 일은 없습니다. `keh4l` 브랜치는 업스트림 `main`에 위의 변경을 더한 것입니다.

## 설치

### 데스크톱

[Releases](https://github.com/keh4l/codeg/releases/latest)에서 최신 설치 파일을 받으세요:

| 운영체제 | 설치 파일 |
| --- | --- |
| macOS(Apple 실리콘 또는 Intel) | `.dmg` |
| Windows(x64 또는 ARM64) | `-setup.exe` |
| Linux | `.deb`, `.rpm`, `.AppImage` |

공식 Codeg와 같은 앱으로 설치되어 공식 앱을 대체하며, 대화와 설정은 그대로 유지됩니다.

> [!NOTE]
> macOS에서 처음 실행할 때 '손상되었습니다' 또는 '열 수 없습니다'라고 나오면 다음 명령을 한 번 실행하거나, 시스템 설정 → 개인정보 보호 및 보안에서 열기를 허용하세요:
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### 서버

Linux 또는 macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows(PowerShell):

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

둘 다 이 저장소의 릴리스에서 설치되며, 서버에 내장된 업데이트도 여기를 사용합니다.

### 공식 빌드로 돌아갈 때

> [!WARNING]
> 먼저 Codeg 데이터를 백업하세요. 이 빌드에는 공식 빌드에 없는 데이터베이스 마이그레이션(번역 기능의 테이블 등)이 있어, 공식 빌드는 같은 데이터로 시작하지 못할 수 있습니다.

## 문서

기능, 설정, 사용법은 공식 [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.ko.md)와 [docs.codeg.app](https://docs.codeg.app)을 참고하세요. 공식 빌드 기준으로 쓰여 있으며, 다른 점은 위에 정리되어 있습니다.

## 라이선스와 감사의 말

Apache-2.0, [LICENSE](../../LICENSE)를 참고하세요. Codeg는 [xintaofei](https://github.com/xintaofei)와 기여자들이 만들었고, 이 빌드는 거기에 기능을 더했을 뿐입니다. Codeg는 [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI), [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills)를 바탕으로 합니다.
