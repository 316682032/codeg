<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg, version personnalisée
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="Dernière version" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="Projet d'origine" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="Licence" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.zh-TW.md">繁體中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.de.md">Deutsch</a> · <strong>Français</strong> · <a href="./README.pt.md">Português</a> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong><a href="https://github.com/spacering-net/codeg">Codeg</a>, l'espace de travail multi-agents de xintaofei, personnalisé par keh4l</strong><br/>
  Tous vos agents de code IA au même endroit, qui travaillent ensemble. Suit de près le projet d'origine et ajoute quelques fonctionnalités.
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>Télécharger</ins></a> · <a href="#installation"><ins>Installation</ins></a> · <a href="https://docs.codeg.app"><ins>Documentation officielle</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="L'espace de travail Codeg : une conversation avec un agent, à côté de ses diffs en direct et des fichiers du projet" width="960" />
  </picture>
</p>

## Différences avec la version officielle

<table>
  <tr>
    <td width="50%" valign="top">🪟 <strong>Des onglets par fenêtre</strong><br/>Avec plusieurs fenêtres sur un même serveur, désactivez la synchronisation des onglets et chaque fenêtre garde les siens ; conversations et messages restent synchronisés.</td>
    <td width="50%" valign="top">💭 <strong>Claude Code affiche sa réflexion</strong><br/>Demande à l'API des résumés de la réflexion : cette zone n'est plus vide.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>Réponses et messages traduits</strong><br/>Chaque partie d'une réponse de l'agent est traduite dans votre langue dès qu'elle est terminée, raisonnement, cartes de question et listes de tâches compris, et un message passe en anglais d'une touche, grâce aux modèles de traduction d'Alibaba Cloud ou de Tencent Cloud, en une seconde environ pour 1 000 caractères.</td>
    <td width="50%" valign="top">🧩 <strong>Sessions des sous-agents de Claude Code</strong><br/>Les cartes de sous-agent gagnent « Voir la session du sous-agent », qui ouvre sa conversation complète comme c'est déjà le cas pour Codex ; un sous-agent se suit pendant qu'il travaille.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>Changer de conversation ouverte sur téléphone</strong><br/>Sur téléphone, touchez le titre de la conversation pour voir toutes les conversations ouvertes et où en est chacune, puis touchez-en une pour y passer ; le titre vous prévient quand une autre vous attend.</td>
    <td width="50%" valign="top">🎨 <strong>Les agents génèrent des images</strong><br/>Renseignez l'adresse, la clé et les modèles d'OpenAI, de Grok, de Gemini ou d'un relais, et tout agent compatible MCP peut créer et modifier des images et les enregistrer là où il l'indique ; l'image s'affiche dans la conversation, et la clé ne passe jamais par l'agent.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">⏳ <strong>Des résultats même pour les agents au délai court</strong><br/>Certains agents n'attendent que 30 à 60 secondes un appel d'outil. Cette version plafonne chaque attente selon l'agent, répond à temps et récupère la suite à l'appel suivant : une réponse lente à une question ne compte plus comme une absence de réponse.</td>
    <td width="50%" valign="top">🔄 <strong>Au plus près de l'original</strong><br/>Le projet d'origine est fusionné régulièrement ; ce qui n'est pas listé ici fonctionne comme dans la version officielle. Kiro CLI intégré, le premier ajout de cette version, fait partie de la version officielle depuis la 0.36.0.</td>
  </tr>
</table>

<details>
<summary><strong>Des onglets par fenêtre</strong> : détails</summary>
<br/>

- C'est l'interrupteur « Synchroniser les onglets de conversation entre les fenêtres » dans Réglages → Général, activé par défaut : toutes les fenêtres et tous les appareils du serveur (ordinateur, tablette, téléphone) partagent un même ensemble d'onglets ouverts, comme dans la version officielle.
- Désactivé, ouvrir, activer ou fermer un onglet de conversation dans une fenêtre laisse les autres telles quelles, et un rechargement restaure les onglets de cette fenêtre.
- Les conversations, les messages et les suppressions atteignent toujours toutes les fenêtres, quel que soit le réglage.
- Le réglage est enregistré sur le serveur : le changer dans n'importe quelle fenêtre ou sur n'importe quel appareil fait basculer toutes les fenêtres et tous les appareils connectés à ce serveur. (Jusqu'à la 0.35.2-1, il était enregistré par navigateur et désactivé par défaut dans les navigateurs.)
- Demandé en amont dans [spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547).

</details>

<details>
<summary><strong>Claude Code affiche sa réflexion</strong> : détails</summary>
<br/>

- Avec les modèles récents, la version officielle ne reçoit qu'une signature chiffrée pour chaque bloc de réflexion : la réflexion de Claude reste donc vide.
- Cette version demande à l'API des résumés de la réflexion — ce qu'affiche `claude` dans le terminal quand `showThinkingSummaries` est activé.
- Pour le désactiver, ajoutez ceci dans `~/.claude/settings.json` (ou dans le `.claude/settings.json` d'un projet) :

  ```json
  "showThinkingSummaries": false
  ```

- La réflexion des conversations précédentes n'a jamais été transmise ; elle ne peut pas être récupérée.

</details>

<details>
<summary><strong>Réponses et messages traduits</strong> : détails</summary>
<br/>

- S'active dans Réglages → Traduction avec une clé d'API de [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) ou de [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey) ; chaque plateforme facture son propre usage. Par défaut, c'est `qwen-mt-flash` de Bailian, qui a pris environ 0,5 s par paragraphe lors des tests.
- Réponses : avec l'interrupteur « Traduction des réponses » activé, chaque partie d'une réponse est traduite dès que l'agent l'a terminée (quand il passe à un outil ou à la réflexion, ou en fin de tour), en entier dans une seule requête pour que le modèle la voie en entier, et s'affiche à la place de l'original ; pendant que l'agent écrit, vous voyez l'original. Le bouton de traduction sous chaque réponse revient à l'original ou, si la traduction automatique est désactivée, traduit cette seule réponse. Le raisonnement est traduit quand vous le dépliez et suit le même bouton ; les blocs de code et les appels d'outils ne sont pas traduits. Le bouton de copie copie ce qui est affiché.
- Noms de session : avec la traduction automatique des réponses, les noms que l'agent donne aux sessions s'affichent aussi dans votre langue, dans la barre latérale, les onglets et l'en-tête de la conversation. Un nom que vous avez choisi reste tel quel, et survoler une session dans la barre latérale montre l'original.
- Cartes de question : quand un agent vous pose une question, la question et ses options s'affichent traduites par défaut (désactivable dans Réglages → Traduction), et le bouton en haut à droite de la carte bascule entre original et traduction ; la réponse désigne toujours l'option de l'agent. Une réponse saisie dans « Autre » se traduit dans la langue cible avec le bouton à côté ou `⌘⇧L`, et le même bouton la rétablit ; avec « Traduire à l'envoi » activé, elle est traduite à l'envoi. Les questions marquées secrètes ne sont jamais envoyées à la traduction.
- Listes de tâches : les étapes de la liste de tâches d'un agent (la carte de plan dans une réponse, le plan flottant au-dessus de la conversation et le plan dans les Détails de la session) s'affichent traduites par défaut, toute la liste en une seule requête (désactivable avec « Traduire les listes de tâches automatiquement » dans Réglages → Traduction), et le bouton en haut à droite de la carte de plan bascule entre original et traduction ; interrupteur coupé, le même bouton traduit à la demande.
- Messages : le bouton de traduction de la zone de saisie, `⌘⇧L` (`Ctrl+Maj+L` sous Windows et Linux) ou le menu contextuel traduisent la zone sur place dans la langue cible (l'anglais par défaut). Mentions, commandes slash, chemins et code restent tels quels, et `⌘Z` rétablit l'original en une fois. Rien n'est envoyé à la traduction avant que vous la demandiez : un brouillon inachevé ne quitte jamais la machine. « Traduire à l'envoi » le fait à chaque envoi. Une fois envoyé, le bouton de traduction à côté du message réaffiche ce que vous avez écrit avant de traduire, et la copie suit ce qui est affiché.
- En cas de limite de requêtes, il bascule sur `qwen-mt-lite` ou sur l'autre moteur ; un glossaire fixe la traduction de certains termes, et une entrée sans traduction garde son terme tel quel.
- Les clés d'API sont conservées dans le trousseau du système (sur un serveur, dans `tokens.json` du répertoire de données), jamais dans la base de données. Les requêtes de traduction se connectent directement, sans proxy, et ne passent par le proxy que si le réseau n'autorise rien d'autre.
- La traduction des réponses ne sert qu'à l'affichage : l'historique de la conversation garde le texte original de l'agent. Ce que vous avez écrit avant de traduire un message est gardé dans la base de données locale, et vider le cache de traduction ne l'efface pas.

</details>

<details>
<summary><strong>Sessions des sous-agents de Claude Code</strong> : détails</summary>
<br/>

- Claude Code enregistre toute la conversation de chaque sous-agent (outil Agent / Task) dans un fichier à part, `~/.claude/projects/<projet>/<id de session>/subagents/agent-<id>.jsonl`. Dans la version officielle, la carte ne montre qu'un résumé de son déroulement et le résultat final (pas même le résumé pour un sous-agent en arrière-plan), et ce fichier ne peut pas être ouvert.
- Cette version ajoute à côté du titre de la carte un bouton « Voir la session du sous-agent » qui ouvre ce fichier dans un panneau latéral : la tâche reçue, son raisonnement et ses réponses, et chaque appel d'outil avec son entrée et sa sortie. C'est le même bouton que sur les cartes de sous-agent de Codex et de Grok.
- Le bouton apparaît dès le lancement du sous-agent, au premier plan comme en arrière-plan. Ouvert pendant qu'il travaille encore, le panneau se rafraîchit toutes les 2 secondes et affiche comme en cours l'appel d'outil qui s'exécute. Ouvert après un rechargement de la conversation, il montre le fichier tel qu'il était alors ; fermez-le et rouvrez-le pour voir la suite.
- Les conversations plus anciennes en profitent aussi, tant que le fichier du sous-agent existe encore.

</details>

<details>
<summary><strong>Changer de conversation ouverte sur téléphone</strong> : détails</summary>
<br/>

- Sous 768 px de large (un téléphone ou une fenêtre de navigateur très étroite), la version officielle n'affiche pas la barre d'onglets de conversation. Pour atteindre une autre conversation ouverte, il faut la chercher dans tout l'historique de la barre latérale, et une conversation terminée, que la barre latérale masque par défaut, est inaccessible.
- Cette version fait du titre de la conversation un bouton : après le titre viennent ⌄ et le nombre de conversations ouvertes, avec un point orange sur le nombre tant qu'une autre conversation attend votre accord ou votre réponse. Il ouvre par le bas « Conversations ouvertes » : toutes les conversations ouvertes dans l'ordre des onglets, chacune avec son état (Vous attend, En cours, Revue, Terminé, Annulé, Non envoyé). Touchez-en une pour y passer, × pour la fermer ; vous pouvez aussi démarrer une nouvelle conversation ou ouvrir la barre latérale avec « Toutes les conversations (historique compris) ». On le ferme en touchant à côté, en le tirant vers le bas ou avec le geste retour.
- « Vous attend » n'est connu que si cet appareil est connecté à la conversation : il s'affiche pour les conversations ouvertes au moins une fois sur cet appareil, les autres montrent leur état enregistré.
- Avec « Synchroniser les onglets de conversation entre les fenêtres » activé (par défaut), une conversation fermée sur le téléphone se ferme aussi sur l'ordinateur, comme si l'on fermait son onglet là-bas.
- À partir de 768 px de large (ordinateurs, tablettes), rien ne change : la barre d'onglets reste.
- Demandé dans [keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10).

</details>

<details>
<summary><strong>Les agents génèrent des images</strong> : détails</summary>
<br/>

- Dans Paramètres → Génération d'images, ajoutez un service : choisissez API OpenAI (OpenAI, Grok et la plupart des relais) ou API Gemini (Google ou un relais), laissez l'adresse vide pour l'adresse officielle, puis ajoutez la clé et des noms de modèle comme `gpt-image-2`, `grok-imagine-image-2.0` ou `gemini-3-pro-image`. Vous pouvez en ajouter plusieurs. Tester génère une petite image de faible qualité pour vérifier que tout fonctionne ; elle est facturée par le service.
- Une fois l'interrupteur en haut de la page activé (le même que « Générer des images » dans Paramètres → Collaboration → Outils dans la conversation, désactivé par défaut) et au moins un service doté d'une clé et d'un modèle, les agents lancés ensuite reçoivent deux outils, `image_generate` et `image_get_result`. Un agent peut choisir le modèle, le format, la résolution et un fond transparent, et transmettre des images de référence pour modifier une image existante ; sans modèle, c'est celui par défaut des paramètres.
- L'agent décide où l'image est enregistrée ; un chemin relatif part du dossier de travail de la conversation. Sans chemin, les images vont dans `~/.codeg/generated-images/<date>/`, un dossier modifiable dans les paramètres.
- Chaque image a sa carte dans la conversation : pendant la génération, les secondes écoulées ; ensuite l'image, l'endroit où elle a été enregistrée (clic pour l'ouvrir), le service et le modèle, la taille et la durée. L'image est lue depuis le fichier : après un rechargement de la conversation, elle reste visible tant que le fichier existe.
- Par défaut l'agent reçoit aussi une copie d'environ 512 pixels de large, pour voir le résultat avant de décider s'il le modifie ; cela consomme un peu de son contexte. Désactivez-le dans les paramètres si le modèle de l'agent ne sait pas lire les images.
- Une image prend souvent de quelques dizaines de secondes à deux minutes. Quand c'est plus long que ce que l'agent peut attendre pour un appel d'outil, il reçoit d'abord un identifiant de tâche et récupère l'image avec `image_get_result` ; voir la section suivante.
- C'est Codeg qui fait l'appel ; l'agent ne reçoit que le fichier image. Les clés d'API sont conservées dans le trousseau du système (dans la version serveur, dans `tokens.json` du dossier de données), pas dans la base de données, et ne font pas partie de la synchronisation de la configuration.

</details>

<details>
<summary><strong>Des résultats même pour les agents au délai court</strong> : détails</summary>
<br/>

- Le temps qu'un agent attend un appel d'outil MCP varie : ZCode 30 secondes ; Cursor, Kimi, DeepSeek et OpenCode 60 secondes ; Codex 5 minutes ; Claude Code, Qoder, CodeBuddy et Grok pratiquement sans limite. Dans la version officielle, `get_delegation_status` (attendre le résultat d'une tâche déléguée) peut attendre longtemps en un seul appel et `ask_user_question` (une question pour vous) attend votre réponse ; passé le délai, l'agent considère l'appel comme échoué et continue, si bien que la question compte comme restée sans réponse.
- Cette version donne à ces outils un plafond par agent, inférieur à son délai : par exemple 20 secondes sur ZCode, 45 secondes sur OpenCode, 4 minutes sur Codex ; les agents sans limite n'ont pas de plafond, comme dans la version officielle. Plafond atteint sans résultat, l'appel revient et indique à l'agent comment continuer d'attendre.
- Questions : si vous n'avez pas encore répondu, la carte de la question reste en place et l'agent continue d'attendre avec un nouvel outil, `get_question_answer` ; une fois votre réponse donnée, elle s'affiche dans la carte d'origine.
- Tâches déléguées : un appel à `get_delegation_status` attend au plus jusqu'au plafond, puis renvoie l'état actuel des tâches. La génération d'images fonctionne de la même façon ; voir la section précédente.
- Pendant l'attente, l'agent reçoit un point d'avancement toutes les 10 secondes, ce qui permet aux agents qui prolongent leur délai selon l'avancement, comme OpenCode, d'attendre plus longtemps.

</details>

### Publication

|  | Cette version | Version officielle |
| --- | --- | --- |
| Téléchargements et mises à jour | [Releases](https://github.com/keh4l/codeg/releases) de ce dépôt, signées avec la clé propre à ce fork | Releases de [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) |
| Version | `<version d'origine>-<n>` : `0.33.0-2` est la 2ᵉ version basée sur la 0.33.0 d'origine | par ex. `0.33.0` |
| Notarisation macOS | Non ; à autoriser une fois au premier lancement (voir [Installation](#installation)) | Oui |
| Image Docker | Non | Oui |

Les mises à jour ne passent jamais d'un côté à l'autre : cette version ne se met jamais à jour vers une version officielle, et une version officielle jamais vers celle-ci. La branche `keh4l` correspond à la branche `main` du projet d'origine plus les changements ci-dessus.

## Installation

### Bureau

Téléchargez le dernier installateur depuis [Releases](https://github.com/keh4l/codeg/releases/latest) :

| Système | Installateur |
| --- | --- |
| macOS (Apple Silicon ou Intel) | `.dmg` |
| Windows (x64 ou ARM64) | `-setup.exe` |
| Linux | `.deb`, `.rpm` ou `.AppImage` |

Elle s'installe comme la même application que le Codeg officiel : elle le remplace et conserve vos conversations et réglages.

> [!NOTE]
> Sur macOS, si le premier lancement indique que l'application est endommagée ou ne peut pas être ouverte, exécutez une fois la commande ci-dessous, ou autorisez-la dans Réglages Système → Confidentialité et sécurité :
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### Serveur

Linux ou macOS :

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows (PowerShell) :

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

Les deux installent depuis les versions de ce dépôt, et l'outil de mise à jour intégré du serveur les utilise aussi.

### Revenir à la version officielle

> [!WARNING]
> Sauvegardez d'abord vos données Codeg. Cette version ajoute des migrations de base de données que la version officielle n'a pas (les tables de la traduction, entre autres), et une version officielle peut refuser de démarrer avec les mêmes données.

## Documentation

Pour les fonctionnalités, la configuration et l'utilisation, consultez le [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.fr.md) officiel et [docs.codeg.app](https://docs.codeg.app). Ils décrivent la version officielle ; les différences sont listées ci-dessus.

## Licence et remerciements

Apache-2.0, voir [LICENSE](../../LICENSE). Codeg est créé par [xintaofei](https://github.com/xintaofei) et ses contributeurs ; cette version ne fait qu'y ajouter. Codeg s'appuie sur [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) et [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills).
