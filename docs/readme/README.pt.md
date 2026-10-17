<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg, versão personalizada
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="Última versão" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="Projeto original" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="Licença" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.zh-TW.md">繁體中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.fr.md">Français</a> · <strong>Português</strong> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong><a href="https://github.com/spacering-net/codeg">Codeg</a>, o espaço de trabalho multiagente de xintaofei, personalizado por keh4l</strong><br/>
  Todos os seus agentes de programação com IA num só lugar, trabalhando juntos. Acompanha de perto o projeto original e acrescenta alguns recursos.
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>Baixar</ins></a> · <a href="#instalação"><ins>Instalação</ins></a> · <a href="https://docs.codeg.app"><ins>Documentação oficial</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="O espaço de trabalho do Codeg: uma conversa com um agente ao lado dos diffs ao vivo e dos arquivos do projeto" width="960" />
  </picture>
</p>

## Diferenças em relação à versão oficial

<table>
  <tr>
    <td width="50%" valign="top">🪟 <strong>Abas por janela</strong><br/>Com várias janelas no mesmo servidor, desative a sincronização de abas e cada janela mantém as suas; conversas e mensagens continuam sincronizadas.</td>
    <td width="50%" valign="top">💭 <strong>O Claude Code mostra o pensamento</strong><br/>Pede à API resumos do pensamento, então essa área não fica mais vazia.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>Respostas e mensagens traduzidas</strong><br/>Cada parte da resposta do agente é traduzida para o seu idioma assim que termina, incluindo o raciocínio e os cartões de pergunta, e uma mensagem vai para o inglês com uma tecla, com modelos de tradução da Alibaba Cloud ou da Tencent Cloud, em cerca de um segundo a cada 1.000 caracteres.</td>
    <td width="50%" valign="top">🧩 <strong>Sessões dos subagentes do Claude Code</strong><br/>Os cartões de subagente ganham "Ver a sessão do subagente", que abre a conversa completa dele como já acontece com o Codex; um subagente pode ser acompanhado enquanto trabalha.</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>Acompanha o original</strong><br/>O projeto original é mesclado regularmente; o que não está listado aqui funciona como na versão oficial. O Kiro CLI integrado, a primeira coisa que esta versão adicionou, faz parte da versão oficial desde a 0.36.0.</td>
  </tr>
</table>

<details>
<summary><strong>Abas por janela</strong>: detalhes</summary>
<br/>

- É a opção "Sincronizar abas de conversa entre janelas" em Configurações → Geral, ativada por padrão: todas as janelas e dispositivos do servidor (computador, tablet, celular) compartilham um único conjunto de abas abertas, como na versão oficial.
- Desativada, abrir, focar ou fechar uma aba de conversa em uma janela deixa as outras como estavam, e ao recarregar voltam as abas daquela janela.
- Conversas, mensagens e exclusões sempre chegam a todas as janelas, seja qual for a configuração.
- A opção fica salva no servidor: ao mudá-la em qualquer janela ou dispositivo, todas as janelas e dispositivos conectados a esse servidor mudam junto. (Até a 0.35.2-1 ela era salva por navegador e vinha desativada nos navegadores.)
- Solicitado ao projeto original em [spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547).

</details>

<details>
<summary><strong>O Claude Code mostra o pensamento</strong>: detalhes</summary>
<br/>

- Com os modelos recentes, a versão oficial recebe só uma assinatura criptografada para cada bloco de pensamento, então o pensamento do Claude fica vazio.
- Esta versão pede à API resumos do pensamento — o mesmo que o `claude` no terminal mostra com `showThinkingSummaries` ativado.
- Para desativar, adicione isto em `~/.claude/settings.json` (ou no `.claude/settings.json` de um projeto):

  ```json
  "showThinkingSummaries": false
  ```

- O pensamento de conversas anteriores nunca foi enviado, então não dá para recuperá-lo.

</details>

<details>
<summary><strong>Respostas e mensagens traduzidas</strong>: detalhes</summary>
<br/>

- É ativado em Configurações → Tradução com uma chave de API da [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) ou da [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey); cada plataforma cobra o próprio uso. O padrão é o `qwen-mt-flash` da Bailian, que levou cerca de 0,5 s por parágrafo nos testes.
- Respostas: com a chave "Tradução das respostas" ativada, cada parte de uma resposta é traduzida assim que o agente a termina (ao passar para uma ferramenta ou para o raciocínio, ou ao fim do turno), inteira em uma única solicitação para que o modelo a veja completa, e aparece no lugar do original; enquanto o agente escreve, você vê o original. O botão de tradução abaixo de cada resposta volta ao original ou, com a tradução automática desativada, traduz só aquela resposta. O raciocínio é traduzido quando você o expande e segue o mesmo botão; blocos de código e chamadas de ferramentas não são traduzidos. O botão de copiar copia o que está na tela.
- Nomes de sessão: com a tradução automática de respostas ativada, os nomes que o agente dá às sessões também aparecem no seu idioma, na barra lateral, nas abas e no cabeçalho da conversa. Um nome que você mesmo deu fica como está, e passar o ponteiro sobre uma sessão na barra lateral mostra o original.
- Cartões de pergunta: quando um agente pergunta algo, a pergunta e as opções aparecem traduzidas por padrão (dá para desligar em Configurações → Tradução), e o botão no canto superior direito do cartão alterna entre original e tradução; a resposta continua indicando a opção do agente. Uma resposta digitada em "Outro" é traduzida para o idioma de destino pelo botão ao lado ou por `⌘⇧L`, e o mesmo botão a restaura; com "Traduzir ao enviar" ativado, ela é traduzida ao enviar. Perguntas marcadas como secretas nunca são enviadas para tradução.
- Mensagens: o botão de tradução da caixa de mensagem, `⌘⇧L` (`Ctrl+Shift+L` no Windows e no Linux) ou o menu de contexto traduzem a caixa no lugar para o idioma de destino (inglês por padrão). Menções, comandos de barra, caminhos e código ficam como estão, e `⌘Z` traz o original de volta de uma vez. Só é traduzida quando você pede, então um rascunho pela metade nunca sai da máquina. "Traduzir ao enviar" faz isso a cada envio. Depois de enviada, o botão de tradução ao lado da mensagem volta ao que você escreveu antes de traduzir, e copiar segue o que é exibido.
- Ao atingir um limite de solicitações, passa para o `qwen-mt-lite` ou para o outro mecanismo; um glossário fixa como certos termos são traduzidos, e uma entrada sem tradução mantém o termo como está.
- As chaves de API ficam no chaveiro do sistema (num servidor, em `tokens.json` no diretório de dados), nunca no banco de dados. As solicitações de tradução se conectam diretamente, sem proxy, e só usam o proxy quando a rede não permite outra saída.
- A tradução das respostas serve só para exibição: o histórico da conversa mantém o texto original do agente. O que você escreveu antes de traduzir uma mensagem fica guardado no banco de dados local, e limpar o cache de tradução não o apaga.

</details>

<details>
<summary><strong>Sessões dos subagentes do Claude Code</strong>: detalhes</summary>
<br/>

- O Claude Code guarda a conversa inteira de cada subagente (ferramenta Agent / Task) em um arquivo próprio, `~/.claude/projects/<projeto>/<id da sessão>/subagents/agent-<id>.jsonl`. Na versão oficial o cartão mostra só um resumo do processo e o resultado final (o de um subagente em segundo plano, nem o resumo), e esse arquivo não pode ser aberto.
- Esta versão adiciona ao lado do título do cartão o botão "Ver a sessão do subagente", que abre esse registro em um painel lateral: a tarefa recebida, o raciocínio e as respostas, e cada chamada de ferramenta com entrada e saída. É o mesmo botão dos cartões de subagente do Codex e do Grok.
- O botão aparece assim que o subagente começa, em primeiro ou em segundo plano. Aberto enquanto ele ainda trabalha, o painel se atualiza a cada 2 segundos e mostra como "Em execução" a chamada de ferramenta que está rodando. Aberto depois de recarregar a conversa, mostra o registro como estava naquele momento; feche e abra de novo para ver o mais recente.
- Conversas anteriores também funcionam, desde que o arquivo do subagente ainda exista.

</details>

### Publicação

|  | Esta versão | Versão oficial |
| --- | --- | --- |
| Downloads e atualizações | [Releases](https://github.com/keh4l/codeg/releases) deste repositório, assinadas com a chave própria deste fork | Releases de [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) |
| Versão | `<versão original>-<n>`: `0.33.0-2` é a 2ª versão baseada na 0.33.0 original | ex.: `0.33.0` |
| Notarização no macOS | Não; é preciso permitir uma vez na primeira abertura (veja [Instalação](#instalação)) | Sim |
| Imagem Docker | Não | Sim |

As atualizações nunca se cruzam: esta versão nunca atualiza para uma versão oficial, nem uma versão oficial para esta. O branch `keh4l` é o `main` do projeto original mais as mudanças acima.

## Instalação

### Desktop

Baixe o instalador mais recente em [Releases](https://github.com/keh4l/codeg/releases/latest):

| Sistema | Instalador |
| --- | --- |
| macOS (Apple Silicon ou Intel) | `.dmg` |
| Windows (x64 ou ARM64) | `-setup.exe` |
| Linux | `.deb`, `.rpm` ou `.AppImage` |

Ele é instalado como o mesmo app do Codeg oficial: substitui o oficial e mantém suas conversas e configurações.

> [!NOTE]
> No macOS, se na primeira abertura aparecer que o app está danificado ou não pode ser aberto, execute o comando abaixo uma vez, ou permita-o em Ajustes do Sistema → Privacidade e Segurança:
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### Servidor

Linux ou macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

Ambos instalam a partir das versões deste repositório, e o atualizador embutido do servidor também as usa.

### Voltar para a versão oficial

> [!WARNING]
> Faça antes um backup dos seus dados do Codeg. Esta versão adiciona migrações de banco de dados que a versão oficial não tem (as tabelas da tradução, entre outras), e uma versão oficial pode se recusar a iniciar com os mesmos dados.

## Documentação

Para recursos, configuração e uso, veja o [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.pt.md) oficial e [docs.codeg.app](https://docs.codeg.app). Eles descrevem a versão oficial; as diferenças estão acima.

## Licença e agradecimentos

Apache-2.0, veja [LICENSE](../../LICENSE). O Codeg é criado por [xintaofei](https://github.com/xintaofei) e seus colaboradores; esta versão apenas acrescenta a ele. O Codeg se apoia no [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) e [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills).
