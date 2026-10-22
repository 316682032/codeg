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
    <td width="50%" valign="top">🌐 <strong>Respostas e mensagens traduzidas</strong><br/>Cada parte da resposta do agente é traduzida para o seu idioma assim que termina, incluindo o raciocínio, os cartões de pergunta e as listas de tarefas, e uma mensagem vai para o inglês com uma tecla, com modelos de tradução da Alibaba Cloud ou da Tencent Cloud, em cerca de um segundo a cada 1.000 caracteres.</td>
    <td width="50%" valign="top">🧩 <strong>Sessões dos subagentes do Claude Code</strong><br/>Os cartões de subagente ganham "Ver a sessão do subagente", que abre a conversa completa dele como já acontece com o Codex; um subagente pode ser acompanhado enquanto trabalha.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>Alternar entre conversas abertas no celular</strong><br/>No celular, toque no título da conversa para ver todas as conversas abertas e o andamento de cada uma, e toque em uma para ir até ela; o título avisa quando outra está esperando por você.</td>
    <td width="50%" valign="top">🎨 <strong>Os agentes geram imagens</strong><br/>Configure o endereço, a chave e os modelos da OpenAI, do Grok, do Gemini ou de um relay, e qualquer agente compatível com MCP cria e edita imagens e as salva onde indicar; a imagem aparece na conversa, e a chave nunca passa pelo agente.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">⏳ <strong>Resultados para agentes com tempo limite curto</strong><br/>Alguns agentes esperam só de 30 a 60 segundos por uma chamada de ferramenta. Esta versão limita cada espera por agente, responde a tempo e busca o resto na chamada seguinte, então uma resposta demorada a uma pergunta não conta mais como sem resposta.</td>
    <td width="50%" valign="top">🗂️ <strong>Só os agentes que você usa</strong><br/>As configurações listam só os agentes que você adicionou; o resto fica em “Adicionar agentes”, com busca e vários de uma vez. Uma instalação nova ativa só os que estão instalados aqui, e o seletor de nova conversa fica curto.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📋 <strong>Toque longo para selecionar texto no celular</strong><br/>Um toque longo no texto de uma resposta ou da caixa de mensagem mostra as alças de seleção e o menu de copiar do próprio celular, em vez do menu da conversa; ao selecionar uma resposta com o dedo, Copiar texto / Citar / Perguntar aparecem abaixo da caixa de mensagem, longe do menu do celular.</td>
    <td width="50%" valign="top">🔁 <strong>Reiniciar o servidor pela web</strong><br/>Configurações → Sistema ganha “Reiniciar o codeg”: o codeg implantado num servidor reinicia sem entrar no servidor, e a página se reconecta sozinha; restaurar um backup num servidor agora também reinicia para aplicá-lo.</td>
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
- Listas de tarefas: os passos da lista de tarefas do agente (o cartão de plano numa resposta, o plano flutuante sobre a conversa e o plano em Detalhes da sessão) aparecem traduzidos por padrão, a lista inteira numa só requisição (dá para desligar em "Traduzir listas de tarefas automaticamente" em Configurações → Tradução), e o botão no canto superior direito do cartão de plano alterna entre original e tradução; com a opção desligada, o mesmo botão traduz manualmente.
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

<details>
<summary><strong>Alternar entre conversas abertas no celular</strong>: detalhes</summary>
<br/>

- Com menos de 768 px de largura (um celular ou uma janela de navegador bem estreita), a versão oficial não mostra a barra de abas de conversa. Para chegar a outra conversa aberta é preciso procurá-la em todo o histórico da barra lateral, e uma conversa concluída, que a barra lateral oculta por padrão, não tem como ser alcançada.
- Esta versão transforma o título da conversa em um botão: depois do título vêm ⌄ e o número de conversas abertas, com um ponto laranja sobre o número enquanto outra conversa espera sua aprovação ou resposta. Ao tocar, abre-se de baixo "Conversas abertas": todas as conversas abertas na ordem das abas, cada uma com seu estado (Precisa de você, Em andamento, Revisão, Concluído, Cancelado, Não enviado). Toque em uma para ir até ela e em × para fechá-la; também dá para começar uma conversa nova ou abrir a barra lateral em "Todas as conversas (com histórico)". Fecha tocando fora, arrastando para baixo ou com o gesto de voltar.
- "Precisa de você" só é conhecido enquanto este dispositivo está conectado à conversa: aparece nas conversas abertas pelo menos uma vez neste dispositivo, e as outras mostram o estado salvo.
- Com "Sincronizar abas de conversa entre janelas" ativada (padrão), uma conversa fechada no celular também fecha no computador, como fechar a aba dela lá.
- Com 768 px de largura ou mais (computadores, tablets) nada muda: a barra de abas continua.
- Uma conversa aberta pela barra lateral começa como prévia (como no desktop), que a próxima aberta substitui; aqui o título dela fica em itálico, e o 📌 ao lado a mantém aberta. Tocar duas vezes nela na barra lateral também a mantém, como um clique duplo no desktop: no celular a barra lateral agora espera um instante antes de fechar, para o segundo toque cair na mesma linha.
- Solicitado em [keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10), [#12](https://github.com/keh4l/codeg/issues/12).

</details>

<details>
<summary><strong>Os agentes geram imagens</strong>: detalhes</summary>
<br/>

- Em Configurações → Geração de imagens, adicione um serviço: escolha API da OpenAI (a própria OpenAI, o Grok e a maioria dos relays) ou API do Gemini (o próprio Google ou um relay), deixe o endereço vazio para usar o oficial e adicione a chave e nomes de modelo como `gpt-image-2`, `grok-imagine-image-2.0` ou `gemini-3-pro-image`. Dá para adicionar vários. Testar gera uma imagem pequena de baixa qualidade para conferir se funciona; ela é cobrada pelo serviço.
- Com o interruptor do topo da página ligado (o mesmo de "Gerar imagens" em Configurações → Colaboração → Ferramentas na conversa, desligado por padrão) e pelo menos um serviço com chave e modelo, os agentes iniciados a partir daí ganham duas ferramentas, `image_generate` e `image_get_result`. O agente pode escolher o modelo, a proporção, a resolução e um fundo transparente, e passar imagens de referência para editar uma imagem existente; sem modelo, vale o padrão das configurações.
- O agente decide onde a imagem é salva; um caminho relativo parte da pasta de trabalho da conversa. Sem caminho, as imagens vão para `~/.codeg/generated-images/<data>/`, pasta que pode ser trocada nas configurações.
- Cada imagem ganha um cartão na conversa: enquanto é gerada, os segundos até agora; depois, a imagem, onde foi salva (clique para abrir), o serviço e o modelo, o tamanho e o tempo que levou. A imagem é lida do arquivo, então depois de recarregar a conversa ela continua visível enquanto o arquivo existir.
- Por padrão o agente também recebe uma cópia com cerca de 512 pixels de largura, para ver o resultado antes de decidir se muda algo; isso ocupa parte do contexto dele. Desative nas configurações se o modelo do agente não consegue ler imagens.
- Uma imagem costuma levar de dezenas de segundos a dois minutos. Quando isso passa do que o agente consegue esperar por uma chamada de ferramenta, ele recebe primeiro um id de tarefa e busca a imagem com `image_get_result`; veja a próxima seção.
- Quem faz a chamada é o próprio Codeg; o agente recebe só o arquivo de imagem. As chaves de API ficam no chaveiro do sistema (na versão de servidor, em `tokens.json` na pasta de dados), não no banco de dados, e não fazem parte da sincronização de configurações.

</details>

<details>
<summary><strong>Resultados para agentes com tempo limite curto</strong>: detalhes</summary>
<br/>

- Quanto um agente espera por uma chamada de ferramenta MCP varia: ZCode, 30 segundos; Cursor, Kimi, DeepSeek e OpenCode, 60 segundos; Codex, 5 minutos; Claude Code, Qoder, CodeBuddy e Grok, praticamente sem limite. Na versão oficial, `get_delegation_status` (esperar o resultado de uma tarefa delegada) pode esperar muito numa só chamada e `ask_user_question` (uma pergunta para você) espera até você responder; passado o prazo, o agente trata a chamada como falha e segue em frente, então a pergunta conta como sem resposta.
- Esta versão dá a essas ferramentas um teto por agente, abaixo do prazo dele: por exemplo 20 segundos no ZCode, 45 segundos no OpenCode, 4 minutos no Codex; agentes sem limite ficam sem teto, como na versão oficial. Ao chegar ao teto sem resultado, a chamada volta e diz ao agente como continuar esperando.
- Perguntas: se você ainda não respondeu, o cartão da pergunta continua onde está e o agente segue esperando com uma ferramenta nova, `get_question_answer`; quando você responde, a resposta aparece no cartão original.
- Tarefas delegadas: cada chamada a `get_delegation_status` espera no máximo até o teto e devolve o estado atual das tarefas. A geração de imagens funciona do mesmo jeito; veja a seção anterior.
- Enquanto espera, o agente recebe um aviso de progresso a cada 10 segundos, o que permite aos agentes que estendem o prazo com o progresso, como o OpenCode, esperar mais.

</details>

<details>
<summary><strong>Só os agentes que você usa</strong>: detalhes</summary>
<br/>

- São quase 20 agentes integrados, e a versão oficial ativa todos, instalados ou não: uma lista longa nas configurações, um seletor de nova conversa cheio de agentes não instalados (a página de conversa nunca instala nenhum, então escolher um não leva a nada) e uma verificação de cada um sempre que a página de configurações abre.
- Nesta versão, Configurações → Agentes lista só “Meus agentes”, que ainda podem ser reordenados arrastando. “Adicionar” na barra de título e a linha abaixo da lista abrem “Adicionar agentes”: busque por nome ou descrição, filtre por instalados / não instalados, encontre primeiro os já instalados nesta máquina e adicione vários de uma vez. Um não instalado é instalado pelos detalhes depois de adicionado.
- O interruptor nos detalhes de um agente é “Meus agentes”: desligue para tirar o agente da lista, com desfazer. É a configuração “ativado” da versão oficial, então o seletor de nova conversa, a delegação e todo o resto seguem ele.
- Ao abrir a página de configurações, só “Meus agentes” são verificados; qualquer outro agente é verificado quando você o abre.
- Quando o codeg ainda não tem configurações para um agente (uma instalação nova, ou um agente integrado adicionado por uma versão posterior), ele o ativa só se o detectar como instalado aqui. Para o codeg, um agente está instalado quando o adaptador ACP ou a CLI que ele executa está pronto; uma instalação nova muitas vezes não tem nenhum e a lista começa vazia: escolha em “Adicionar agentes”. Um agente que você instalar depois não é adicionado sozinho, e as configurações existentes nunca mudam.
- Ao atualizar de uma versão anterior com agentes não instalados em “Meus agentes”, um aviso no topo da lista oferece uma vez “Manter só os instalados” ou deixar como está (a escolha é lembrada por dispositivo).
- O seletor de nova conversa termina a linha com um “+” que abre “Adicionar agentes”; quando nem todos os agentes cabem, ele fica no fim do menu “mais”. Sem nenhum agente ativado, o botão do seletor também abre “Adicionar agentes”.

</details>

<details>
<summary><strong>Toque longo para selecionar texto no celular</strong>: detalhes</summary>
<br/>

- Na versão oficial, toda a área da conversa e a caixa de mensagem têm menus próprios, e um toque longo com o dedo também os abre: ao segurar uma resposta por cerca de 0,7 s aparece o menu da conversa (Nova conversa, Exportar conversa…); no Android, o evento que o toque longo envia também é cancelado, e com ele a seleção de palavras do próprio celular. Em HTTPS, um toque longo na caixa de mensagem abre o menu próprio dela, Cortar / Copiar / Selecionar tudo. As alças de seleção e o menu de copiar do celular nunca aparecem, então copiar texto das respostas e da caixa de mensagem fica difícil.
- Esta versão deixa o toque longo com o dedo ou a caneta para o celular: selecionar, arrastar as alças, copiar e colar são os do próprio celular. O clique direito com o mouse continua abrindo os dois menus, também em um computador com tela sensível ao toque.
- Na versão oficial, a bolha Copiar texto / Citar / Perguntar de uma resposta selecionada fica ao lado da seleção, e o menu do celular também, acima ou abaixo conforme o celular decide; a página não consegue ler a posição dele nem movê-lo, então os dois muitas vezes se sobrepõem. Nesta versão, uma seleção feita com o dedo coloca esses botões e o número de caracteres selecionados abaixo da caixa de mensagem, no lugar da linha de pasta e branch até a seleção sumir; o menu do celular não passa da caixa de mensagem. Perguntar recebe a pergunta nessa mesma linha. Numa seleção feita com o mouse, a bolha continua aparecendo acima.
- As Mensagens rápidas do menu da caixa de mensagem também ficam no “+” no canto inferior esquerdo da caixa; traduzir uma mensagem tem um botão próprio.
- No iOS, o menu do sistema para o texto comum de uma página web não tem Selecionar tudo (só os campos de texto têm); para copiar uma resposta inteira, use o botão de copiar abaixo dela.

</details>

<details>
<summary><strong>Reiniciar o servidor pela web</strong>: detalhes</summary>
<br/>

- Implantada num servidor, a versão oficial não oferece como reiniciar o codeg pela página web: depois de mudar uma configuração que precisa de reinício (aparência, idioma, lista de provedores, proxy do navegador…), ou quando o serviço apresenta problemas, é preciso entrar no servidor e reiniciá-lo lá. Restaurar um backup num servidor é igual: a restauração só vale depois de reiniciar, mas o reinício que ela chama só aceita uma atualização preparada, então sempre termina com “não foi possível reiniciar o serviço, reinicie manualmente”.
- Esta versão adiciona “Reiniciar o codeg” sob “Atualização de software” em Configurações → Sistema. “Reiniciar” pede confirmação, e a caixa de diálogo diz quantas conversas estão em andamento e serão interrompidas; depois faz uma contagem regressiva, espera o serviço voltar e recarrega a página. As outras janelas abertas também mostram “Reiniciando” na barra de status.
- Reinicia do mesmo jeito que uma atualização no local: com Docker ou o supervisor (`--supervise`), o supervisor o inicia de novo após `CODEG_RESTART_DELAY_MS`; rodando sozinho, o processo reinicia no mesmo lugar (systemd e afins continuam vendo o mesmo processo). Um reinício comum não entra no período de teste da atualização nem dispara a reversão automática dela. Não é possível reiniciar enquanto uma atualização está sendo baixada ou instalada.
- Depois de restaurar um backup num servidor, “Reiniciar agora” no painel de resultado usa o mesmo reinício, então a restauração passa a valer sozinha.
- Só nas versões de servidor: não aparece no app de desktop nem num navegador conectado ao serviço web integrado de um desktop; como a atualização no local, ainda não em servidores Windows.

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
