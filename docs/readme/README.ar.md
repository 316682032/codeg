<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> نسخة Codeg المخصّصة
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="أحدث إصدار" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="المشروع الأصلي" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="الترخيص" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.zh-TW.md">繁體中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.fr.md">Français</a> · <a href="./README.pt.md">Português</a> · <strong>العربية</strong></sub>
</p>

<p align="center">
  <strong><a href="https://github.com/spacering-net/codeg">Codeg</a>، مساحة العمل البرمجية متعددة الوكلاء من xintaofei، بتخصيص keh4l</strong><br/>
  كل وكلاء البرمجة بالذكاء الاصطناعي في مكان واحد، يعملون معًا. تتابع المشروع الأصلي عن قرب وتضيف بعض الميزات.
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>التنزيل</ins></a> · <a href="#التثبيت"><ins>طريقة التثبيت</ins></a> · <a href="https://docs.codeg.app"><ins>التوثيق الرسمي</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="مساحة عمل Codeg: محادثة مع وكيل بجانب الفروقات المباشرة وملفات المشروع" width="960" />
  </picture>
</p>

## الاختلافات عن النسخة الرسمية

<table>
  <tr>
    <td width="50%" valign="top">🤖 <strong>‏Kiro CLI مدمج</strong><br/>يستخدم أداة <code>kiro-cli</code> المثبّتة لديك: اختر النموذج والوضع، وأضف خوادم MCP والمهارات، وتابع جلساتك السابقة.</td>
    <td width="50%" valign="top">🪟 <strong>علامات تبويب لكل نافذة</strong><br/>لم تعد نوافذ المتصفح على الخادم نفسه تتبع علامات تبويب بعضها؛ وتبقى المحادثات والرسائل متزامنة.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">💭 <strong>يعرض Claude Code تفكيره</strong><br/>يطلب من الواجهة البرمجية ملخّصات للتفكير، فلا يبقى قسم التفكير فارغًا.</td>
    <td width="50%" valign="top">🌐 <strong>ترجمة الردود والرسائل</strong><br/>تُترجم ردود الوكيل إلى لغتك بعد اكتمالها، وتُترجم الرسالة إلى الإنجليزية بضغطة زر، بنماذج الترجمة من Alibaba Cloud أو Tencent Cloud، في نحو ثانية لكل 1000 حرف.</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>مواكبة المشروع الأصلي</strong><br/>تُدمج تحديثات المشروع الأصلي بانتظام؛ وكل ما لم يُذكر هنا يعمل كما في النسخة الرسمية.</td>
  </tr>
</table>

<details>
<summary>تفاصيل: <strong>‏Kiro CLI مدمج</strong></summary>
<br/>

- يشغّل أداة `kiro-cli` التي ثبّتها باستخدام [مثبّت Kiro الرسمي](https://kiro.dev/docs/getting-started/installation/).
- يمكنك اختيار النموذج والوضع ومستوى الاستدلال والتفكير من مربع الإدخال، واستخدام أوامر الشرطة المائلة.
- وضع الأذونات: السؤال في كل مرة، أو الوثوق بجميع الأدوات.
- يمكنك تزويده بخوادم MCP والمهارات، واستيراد جلساته السابقة ومتابعتها.
- يشغّل زر «ترقية» في الإعدادات ← الوكلاء أداة التحديث الخاصة بـ Kiro.
- تنتقل المحادثات التي أجريتها مع Kiro كوكيل مخصّص إلى الوكيل المدمج.
- مقترحة على المشروع الأصلي أيضًا: [spacering-net/codeg#851](https://github.com/spacering-net/codeg/pull/851).

</details>

<details>
<summary>تفاصيل: <strong>علامات تبويب لكل نافذة</strong></summary>
<br/>

- فتح علامة تبويب محادثة أو التركيز عليها أو إغلاقها في نافذة يترك النوافذ الأخرى كما هي.
- عند إعادة التحميل تعود علامات تبويب تلك النافذة نفسها.
- تصل المحادثات والرسائل وعمليات الحذف إلى كل النوافذ كما في السابق.
- يتحكم في ذلك مفتاح «مزامنة علامات تبويب المحادثات بين النوافذ» في الإعدادات ← عام: معطّل افتراضيًا في المتصفح ومفعّل في تطبيق سطح المكتب. وعند تفعيله تتشارك كل النوافذ مجموعة واحدة من علامات التبويب كما في الإصدار الرسمي.
- طُلبت هذه الميزة من المشروع الأصلي في [spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547).

</details>

<details>
<summary>تفاصيل: <strong>يعرض Claude Code تفكيره</strong></summary>
<br/>

- مع النماذج الحديثة لا تتلقى النسخة الرسمية إلا توقيعًا مشفّرًا لكل كتلة تفكير، فيبقى تفكير Claude فارغًا.
- تطلب هذه النسخة من الواجهة البرمجية (API) ملخّصات للتفكير، وهي نفسها التي يعرضها `claude` في الطرفية عند تفعيل `showThinkingSummaries`.
- لإيقافها، أضف ما يلي إلى `~/.claude/settings.json` (أو إلى ملف `.claude/settings.json` الخاص بالمشروع):

  ```json
  "showThinkingSummaries": false
  ```

- لم يُرسَل نص التفكير للمحادثات السابقة أصلًا، لذا لا يمكن استعادته.

</details>

<details>
<summary><strong>ترجمة الردود والرسائل</strong>: التفاصيل</summary>
<br/>

- تُفعَّل من الإعدادات → الترجمة بمفتاح API من [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) أو [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey)، وتحتسب كل منصة رسوم استخدامها. الافتراضي هو `qwen-mt-flash` من Bailian، واستغرق في الاختبار نحو 0.5 ثانية لكل فقرة.
- الردود: عند تشغيل مفتاح "ترجمة الردود" يُترجم الرد بعد أن ينتهي الوكيل منه، كاملًا في طلب واحد ليرى النموذج الرد كله سياقًا، ويُعرض بدلًا من النص الأصلي؛ وفي أثناء الكتابة يظهر النص الأصلي. يعيد زر الترجمة أسفل كل رد النص الأصلي، أو يترجم ذلك الرد وحده عندما تكون الترجمة التلقائية متوقفة. ويُترجم التفكير عند توسيعه ويتبع الزر نفسه، ولا تُترجم كتل الشيفرة واستدعاءات الأدوات. وينسخ زر النسخ ما يظهر على الشاشة.
- أسماء الجلسات: عند تشغيل الترجمة التلقائية للردود تظهر الأسماء التي يضعها الوكيل للجلسات بلغتك أيضًا، في الشريط الجانبي وعلامات التبويب وترويسة المحادثة. أما الاسم الذي وضعته بنفسك فيبقى كما كتبته، ويُظهر تمرير المؤشر فوق جلسة في الشريط الجانبي الاسم الأصلي.
- الرسائل: يترجم زر الترجمة في مربع الرسالة، أو `⌘⇧L` (`Ctrl+Shift+L` في Windows وLinux)، أو قائمة النقر بزر الماوس الأيمن، محتوى المربع في مكانه إلى اللغة الهدف (الإنجليزية افتراضيًا). تبقى الإشارات وأوامر الشرطة المائلة والمسارات والشيفرة كما هي، ويعيد `⌘Z` النص الأصلي بخطوة واحدة. لا يُرسل شيء للترجمة حتى تطلبها، فلا تغادر المسودة غير المكتملة جهازك أبدًا. ويمكن تشغيل "الترجمة عند الإرسال" لترجمتها مع كل إرسال. وبعد الإرسال يعيد زر الترجمة بجوار الرسالة ما كتبته قبل الترجمة، ويتبع النسخ ما يظهر.
- عند بلوغ حدّ الطلبات يتحوّل إلى `qwen-mt-lite` أو إلى المحرّك الآخر، ويثبّت مسرد المصطلحات ترجمة مصطلحات بعينها، والإدخال الذي بلا ترجمة يُبقي مصطلحه كما هو.
- تُحفظ مفاتيح API في سلسلة مفاتيح النظام (وعلى الخادم في `tokens.json` داخل مجلد البيانات)، ولا تُكتب في قاعدة البيانات أبدًا. تتصل طلبات الترجمة اتصالًا مباشرًا دون وكيل، ولا تمر عبر الوكيل إلا إذا لم تسمح الشبكة بغيره.
- ترجمة الردود للعرض فقط، ويبقى سجل المحادثة محتفظًا بالنص الأصلي للوكيل. ويُحفظ ما كتبته قبل ترجمة الرسالة في قاعدة البيانات المحلية، ولا يحذفه مسح ذاكرة الترجمة المؤقتة.

</details>

### طريقة النشر

|  | هذه النسخة | النسخة الرسمية |
| --- | --- | --- |
| التنزيل والتحديث | [Releases](https://github.com/keh4l/codeg/releases) في هذا المستودع، موقّعة بمفتاح هذا الفرع الخاص | ‏Releases في [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) |
| رقم الإصدار | `<إصدار المشروع الأصلي>-<رقم>`: ‏`0.33.0-2` هو الإصدار الثاني المبني على الإصدار الأصلي 0.33.0 | مثل `0.33.0` |
| توثيق macOS | لا؛ يلزم السماح به مرة واحدة عند أول فتح (انظر [التثبيت](#التثبيت)) | نعم |
| صورة Docker | لا | نعم |

لا تنتقل التحديثات بين النسختين: لا تتحدّث هذه النسخة أبدًا إلى إصدار رسمي، ولا تتحدّث نسخة رسمية إلى هذه النسخة. فرع `keh4l` هو فرع `main` في المشروع الأصلي مضافًا إليه التغييرات أعلاه.

## التثبيت

### سطح المكتب

نزّل أحدث مُثبّت من [Releases](https://github.com/keh4l/codeg/releases/latest):

| النظام | المُثبّت |
| --- | --- |
| macOS (Apple Silicon أو Intel) | `.dmg` |
| Windows (x64 أو ARM64) | `-setup.exe` |
| Linux | `.deb` أو `.rpm` أو `.AppImage` |

يُثبَّت بوصفه التطبيق نفسه الذي هو Codeg الرسمي: يحلّ محلّه ويحتفظ بمحادثاتك وإعداداتك.

> [!NOTE]
> على macOS، إذا ظهرت عند التشغيل الأول رسالة بأن التطبيق تالف أو لا يمكن فتحه، فنفّذ الأمر التالي مرة واحدة، أو اسمح بفتحه من إعدادات النظام ← الخصوصية والأمان:
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### الخادم

على Linux أو macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

على Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

كلاهما يثبّت من إصدارات هذا المستودع، وأداة التحديث المدمجة في الخادم تستخدمها أيضًا.

### العودة إلى النسخة الرسمية

> [!WARNING]
> انسخ بيانات Codeg احتياطيًا أولًا. تضيف هذه النسخة ترحيلًا لقاعدة البيانات خاصًا بـ Kiro، وقد ترفض النسخة الرسمية التي لا تتضمّنه البدء بالبيانات نفسها.

## التوثيق

للتعرّف على الميزات والإعدادات وطريقة الاستخدام، راجع [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.ar.md) الرسمي و[docs.codeg.app](https://docs.codeg.app). يصفان النسخة الرسمية؛ والاختلافات مذكورة أعلاه.

## الترخيص والشكر

Apache-2.0، راجع [LICENSE](../../LICENSE). ‏Codeg من تطوير [xintaofei](https://github.com/xintaofei) والمساهمين، وهذه النسخة تضيف إليه فقط. يعتمد Codeg على [Agent Client Protocol](https://agentclientprotocol.com) و[Superpowers](https://github.com/obra/superpowers) و[OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) و[scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills).
