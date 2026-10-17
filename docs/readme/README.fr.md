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
    <td width="50%" valign="top">🌐 <strong>Réponses et messages traduits</strong><br/>Chaque partie d'une réponse de l'agent est traduite dans votre langue dès qu'elle est terminée, raisonnement et cartes de question compris, et un message passe en anglais d'une touche, grâce aux modèles de traduction d'Alibaba Cloud ou de Tencent Cloud, en une seconde environ pour 1 000 caractères.</td>
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
- Messages : le bouton de traduction de la zone de saisie, `⌘⇧L` (`Ctrl+Maj+L` sous Windows et Linux) ou le menu contextuel traduisent la zone sur place dans la langue cible (l'anglais par défaut). Mentions, commandes slash, chemins et code restent tels quels, et `⌘Z` rétablit l'original en une fois. Rien n'est envoyé à la traduction avant que vous la demandiez : un brouillon inachevé ne quitte jamais la machine. « Traduire à l'envoi » le fait à chaque envoi. Une fois envoyé, le bouton de traduction à côté du message réaffiche ce que vous avez écrit avant de traduire, et la copie suit ce qui est affiché.
- En cas de limite de requêtes, il bascule sur `qwen-mt-lite` ou sur l'autre moteur ; un glossaire fixe la traduction de certains termes, et une entrée sans traduction garde son terme tel quel.
- Les clés d'API sont conservées dans le trousseau du système (sur un serveur, dans `tokens.json` du répertoire de données), jamais dans la base de données. Les requêtes de traduction se connectent directement, sans proxy, et ne passent par le proxy que si le réseau n'autorise rien d'autre.
- La traduction des réponses ne sert qu'à l'affichage : l'historique de la conversation garde le texte original de l'agent. Ce que vous avez écrit avant de traduire un message est gardé dans la base de données locale, et vider le cache de traduction ne l'efface pas.

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
