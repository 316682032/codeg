<h1 align="center">
  <img src="../../public/icon.svg" alt="Codeg logo" width="56" align="absmiddle" /> Codeg, versión personalizada
</h1>

<p align="center">
  <a href="https://github.com/keh4l/codeg/releases/latest"><img src="https://img.shields.io/github/v/release/keh4l/codeg?style=flat&color=e91e63" alt="Última versión" /></a>
  <a href="https://github.com/spacering-net/codeg"><img src="https://img.shields.io/badge/upstream-spacering--net%2Fcodeg-24292f?style=flat" alt="Proyecto original" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/keh4l/codeg?style=flat" alt="Licencia" /></a>
</p>

<p align="center">
  <sub><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.zh-TW.md">繁體中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <strong>Español</strong> · <a href="./README.de.md">Deutsch</a> · <a href="./README.fr.md">Français</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ar.md">العربية</a></sub>
</p>

<p align="center">
  <strong><a href="https://github.com/spacering-net/codeg">Codeg</a>, el espacio de trabajo multiagente de xintaofei, personalizado por keh4l</strong><br/>
  Todos tus agentes de programación con IA en un solo lugar, trabajando juntos. Sigue de cerca al proyecto original y añade algunas funciones.
</p>

<h3 align="center"><a href="https://github.com/keh4l/codeg/releases/latest"><ins>Descargar</ins></a> · <a href="#instalación"><ins>Instalación</ins></a> · <a href="https://docs.codeg.app"><ins>Documentación oficial</ins></a></h3>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../images/workspace-dark.png" />
    <img src="../images/workspace-light.png" alt="El espacio de trabajo de Codeg: una conversación con un agente junto a sus diffs en vivo y los archivos del proyecto" width="960" />
  </picture>
</p>

## Diferencias con la versión oficial

<table>
  <tr>
    <td width="50%" valign="top">🪟 <strong>Pestañas por ventana</strong><br/>Con varias ventanas sobre un mismo servidor, desactiva la sincronización de pestañas y cada ventana conserva las suyas; conversaciones y mensajes se siguen sincronizando.</td>
    <td width="50%" valign="top">💭 <strong>Claude Code muestra su pensamiento</strong><br/>Pide a la API resúmenes del pensamiento, así que esa sección ya no aparece vacía.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">🌐 <strong>Respuestas y mensajes traducidos</strong><br/>Cada parte de la respuesta del agente se traduce a tu idioma en cuanto termina, también el razonamiento, las tarjetas de pregunta y las listas de tareas, y un mensaje pasa al inglés con una tecla, con modelos de traducción de Alibaba Cloud o Tencent Cloud, en un segundo por cada 1.000 caracteres.</td>
    <td width="50%" valign="top">🧩 <strong>Sesiones de los subagentes de Claude Code</strong><br/>Las tarjetas de subagente tienen «Ver la sesión del subagente», que abre su conversación completa como ya pasa con Codex; un subagente se puede ver mientras trabaja.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">📱 <strong>Cambiar entre conversaciones abiertas en el móvil</strong><br/>En el móvil, toca el título de la conversación para ver todas las conversaciones abiertas y cómo va cada una, y toca una para cambiar a ella; el título avisa cuando otra te está esperando.</td>
    <td width="50%" valign="top">🎨 <strong>Los agentes generan imágenes</strong><br/>Configura la dirección, la clave y los modelos de OpenAI, Grok, Gemini o un intermediario, y cualquier agente compatible con MCP puede crear y editar imágenes y guardarlas donde indique; la imagen aparece en la conversación y la clave nunca pasa por el agente.</td>
  </tr>
  <tr>
    <td width="50%" valign="top">⏳ <strong>Resultados para agentes con tiempos de espera cortos</strong><br/>Algunos agentes esperan solo de 30 a 60 segundos por una llamada a una herramienta. Esta versión limita cada espera según el agente, responde a tiempo y recoge el resto en la siguiente llamada, así que una respuesta lenta a una pregunta ya no cuenta como sin respuesta.</td>
    <td width="50%" valign="top">🗂️ <strong>Solo los agentes que usas</strong><br/>Ajustes muestra solo los agentes que añadiste; el resto queda en «Añadir agentes», con búsqueda y para añadir varios a la vez. Una instalación nueva activa solo los que están instalados aquí, así que el selector de nueva conversación queda corto.</td>
  </tr>
  <tr>
    <td colspan="2" valign="top">🔄 <strong>Al día con el original</strong><br/>Los cambios del proyecto original se incorporan con regularidad; lo que no aparece aquí funciona igual que en la versión oficial. Kiro CLI integrado, lo primero que añadió esta versión, forma parte de la versión oficial desde la 0.36.0.</td>
  </tr>
</table>

<details>
<summary><strong>Pestañas por ventana</strong>: detalles</summary>
<br/>

- Es el interruptor «Sincronizar pestañas de conversación entre ventanas» en Ajustes → General, activado por defecto: todas las ventanas y dispositivos del servidor (ordenador, tableta, móvil) comparten un único conjunto de pestañas abiertas, como en la versión oficial.
- Desactivado, abrir, enfocar o cerrar una pestaña de conversación en una ventana deja las demás como estaban, y al recargar vuelven las pestañas de esa ventana.
- Las conversaciones, los mensajes y las eliminaciones llegan siempre a todas las ventanas, sea cual sea el ajuste.
- El ajuste se guarda en el servidor: al cambiarlo en cualquier ventana o dispositivo, cambian con él todas las ventanas y dispositivos conectados a ese servidor. (Hasta la 0.35.2-1 se guardaba por navegador y venía desactivado en los navegadores.)
- Solicitado al proyecto original en [spacering-net/codeg#547](https://github.com/spacering-net/codeg/issues/547).

</details>

<details>
<summary><strong>Claude Code muestra su pensamiento</strong>: detalles</summary>
<br/>

- Con los modelos recientes, la versión oficial solo recibe una firma cifrada por cada bloque de pensamiento, así que el pensamiento de Claude aparece vacío.
- Esta versión pide a la API resúmenes del pensamiento: lo mismo que muestra `claude` en la terminal con `showThinkingSummaries` activado.
- Para desactivarlo, añade esto a `~/.claude/settings.json` (o al `.claude/settings.json` de un proyecto):

  ```json
  "showThinkingSummaries": false
  ```

- El pensamiento de conversaciones anteriores nunca se llegó a enviar, así que no se puede recuperar.

</details>

<details>
<summary><strong>Respuestas y mensajes traducidos</strong>: detalles</summary>
<br/>

- Se activa en Ajustes → Traducción con una clave de API de [Alibaba Cloud Bailian](https://bailian.console.aliyun.com/) o [Tencent Cloud TokenHub](https://console.cloud.tencent.com/tokenhub/apikey); cada plataforma cobra su propio uso. Por defecto usa `qwen-mt-flash` de Bailian, que tardó unos 0,5 s por párrafo en las pruebas.
- Respuestas: con el interruptor "Traducción de respuestas" activado, cada parte de una respuesta se traduce en cuanto el agente la termina (al pasar a una herramienta o a pensar, o al acabar el turno), entera en una sola solicitud para que el modelo la vea completa, y se muestra en lugar del original; mientras el agente escribe ves el original. El botón de traducir bajo cada respuesta vuelve al original o, si la traducción automática está desactivada, traduce solo esa respuesta. El razonamiento se traduce al desplegarlo y sigue el mismo botón; no se traducen bloques de código ni llamadas a herramientas. El botón de copiar copia lo que se ve en pantalla.
- Nombres de sesión: con la traducción automática de respuestas activada, los nombres que el agente da a las sesiones también se muestran en tu idioma, en la barra lateral, las pestañas y la cabecera de la conversación. Un nombre que pusiste tú se queda como lo escribiste, y al pasar el puntero sobre una sesión de la barra lateral se ve el original.
- Tarjetas de pregunta: cuando un agente te pregunta algo, la pregunta y sus opciones se muestran traducidas por defecto (se desactiva en Ajustes → Traducción), y el botón de arriba a la derecha de la tarjeta alterna entre original y traducción; la respuesta sigue nombrando la opción del agente. Una respuesta escrita en "Otro" se traduce al idioma de destino con el botón de al lado o `⌘⇧L`, y el mismo botón la devuelve; con "Traducir al enviar" activado se traduce al enviarla. Las preguntas marcadas como secretas nunca se envían a traducir.
- Listas de tareas: los pasos de la lista de tareas del agente (la tarjeta de plan en una respuesta, el plan flotante sobre la conversación y el plan en Detalles de la sesión) se muestran traducidos por defecto, toda la lista en una sola petición (se desactiva con "Traducir listas de tareas automáticamente" en Ajustes → Traducción), y el botón de arriba a la derecha de la tarjeta de plan alterna entre original y traducción; con la opción desactivada, el mismo botón traduce a mano.
- Mensajes: el botón de traducir del cuadro de mensaje, `⌘⇧L` (`Ctrl+Shift+L` en Windows y Linux) o el menú contextual traducen el cuadro en su sitio al idioma de destino (inglés por defecto). Menciones, comandos de barra, rutas y código se quedan igual, y `⌘Z` recupera el original de una vez. Solo se traduce cuando lo pides, así que un borrador a medias nunca sale del equipo. "Traducir al enviar" lo hace en cada envío. Ya enviado, el botón de traducir junto al mensaje vuelve a lo que escribiste antes de traducir, y copiar sigue lo que se muestra.
- Ante un límite de solicitudes pasa a `qwen-mt-lite` o al otro motor; un glosario fija cómo se traducen términos concretos, y una entrada sin traducción mantiene el término tal cual.
- Las claves de API se guardan en el llavero del sistema (en un servidor, en `tokens.json` dentro del directorio de datos), nunca en la base de datos. Las solicitudes de traducción se conectan directamente, sin proxy, y solo usan el proxy cuando la red no permite otra salida.
- La traducción de las respuestas es solo para mostrarla: el historial de la conversación conserva el texto original del agente. Lo que escribiste antes de traducir un mensaje se guarda en la base de datos local, y vaciar la caché de traducción no lo borra.

</details>

<details>
<summary><strong>Sesiones de los subagentes de Claude Code</strong>: detalles</summary>
<br/>

- Claude Code guarda la conversación entera de cada subagente (herramienta Agent / Task) en un archivo propio, `~/.claude/projects/<proyecto>/<id de sesión>/subagents/agent-<id>.jsonl`. En la versión oficial la tarjeta solo muestra un resumen de su proceso y el resultado final (la de un subagente en segundo plano, ni el resumen), y ese archivo no se puede abrir.
- Esta versión añade junto al título de la tarjeta el botón «Ver la sesión del subagente», que abre ese registro en un panel lateral: la tarea que recibió, su razonamiento y sus respuestas, y cada llamada a herramienta con su entrada y su salida. Es el mismo botón que tienen las tarjetas de subagente de Codex y Grok.
- El botón aparece en cuanto arranca el subagente, en primer o en segundo plano. Si lo abres mientras sigue trabajando, el panel se actualiza cada 2 segundos y muestra como «En ejecución» la llamada a herramienta que se está ejecutando. Abierto después de recargar la conversación, muestra el registro tal como estaba entonces; ciérralo y vuelve a abrirlo para ver lo último.
- También funciona en conversaciones anteriores, mientras el archivo del subagente siga ahí.

</details>

<details>
<summary><strong>Cambiar entre conversaciones abiertas en el móvil</strong>: detalles</summary>
<br/>

- Con menos de 768 px de ancho (un móvil o una ventana del navegador muy estrecha), la versión oficial no muestra la barra de pestañas de conversación. Para llegar a otra conversación abierta hay que buscarla en el historial completo de la barra lateral, y una conversación completada, que la barra lateral oculta por defecto, no se puede alcanzar.
- Esta versión convierte el título de la conversación en un botón: tras el título aparecen ⌄ y el número de conversaciones abiertas, con un punto ámbar sobre el número mientras otra conversación espera tu aprobación o respuesta. Al tocarlo se abre desde abajo «Conversaciones abiertas»: todas las conversaciones abiertas en el orden de las pestañas, cada una con su estado (Te necesita, En progreso, Revisión, Completado, Cancelado, Sin enviar). Toca una para cambiar a ella y × para cerrarla; también puedes empezar una conversación nueva o abrir la barra lateral con «Todas las conversaciones (con historial)». Se cierra tocando fuera, arrastrándola hacia abajo o con el gesto de volver.
- «Te necesita» solo se sabe mientras este dispositivo está conectado a esa conversación: aparece en las conversaciones abiertas al menos una vez en este dispositivo, y las demás muestran su estado guardado.
- Con «Sincronizar pestañas de conversación entre ventanas» activado (por defecto), una conversación cerrada en el móvil también se cierra en el ordenador, igual que al cerrar allí su pestaña.
- Con 768 px o más de ancho (ordenadores, tabletas) no cambia nada: sigue la barra de pestañas.
- Una conversación abierta desde la barra lateral empieza como vista previa (como en el escritorio) que la siguiente que abras reemplaza; aquí su título va en cursiva y el 📌 junto a ella la mantiene. Tocarla dos veces en la barra lateral también la mantiene, como un doble clic en el escritorio: en el móvil la barra lateral ahora espera un momento antes de cerrarse, para que el segundo toque caiga en la misma fila.
- Solicitado en [keh4l/codeg#10](https://github.com/keh4l/codeg/issues/10), [#12](https://github.com/keh4l/codeg/issues/12).

</details>

<details>
<summary><strong>Los agentes generan imágenes</strong>: detalles</summary>
<br/>

- En Configuración → Generación de imágenes, añade un servicio: elige API de OpenAI (la propia OpenAI, Grok y la mayoría de los intermediarios) o API de Gemini (la propia Google o un intermediario), deja la dirección vacía para usar la oficial y añade la clave y los nombres de modelo, como `gpt-image-2`, `grok-imagine-image-2.0` o `gemini-3-pro-image`. Puedes añadir varios. Probar genera una imagen pequeña de baja calidad para comprobar que funciona; la cobra el servicio.
- Con el interruptor de arriba de la página activado (el mismo que «Generar imágenes» en Configuración → Colaboración → Herramientas en la conversación; desactivado por defecto) y al menos un servicio con clave y modelo, los agentes que se inicien a partir de entonces tienen dos herramientas, `image_generate` e `image_get_result`. El agente puede elegir el modelo, la relación de aspecto, la resolución y un fondo transparente, y pasar imágenes de referencia para editar una existente; si no elige modelo, se usa el predeterminado de la configuración.
- El agente decide dónde se guarda la imagen; una ruta relativa se resuelve desde la carpeta de trabajo de la conversación. Sin ruta, las imágenes van a `~/.codeg/generated-images/<fecha>/`, carpeta que puedes cambiar en la configuración.
- Cada imagen tiene su tarjeta en la conversación: mientras se genera, los segundos transcurridos; después, la imagen, dónde se guardó (clic para abrirla), el servicio y el modelo, el tamaño y lo que tardó. La imagen se lee del archivo, así que al volver a cargar la conversación se sigue viendo mientras el archivo exista.
- Por defecto el agente recibe además una copia de unos 512 píxeles de ancho, para ver el resultado antes de decidir si lo cambia; esto consume parte de su contexto. Desactívalo en la configuración si el modelo del agente no puede leer imágenes.
- Una imagen suele tardar entre decenas de segundos y dos minutos. Cuando eso supera lo que el agente puede esperar por una llamada, primero recibe un id de trabajo y recoge la imagen con `image_get_result`; consulta la sección siguiente.
- La llamada la hace Codeg; el agente solo recibe el archivo de imagen. Las claves de API se guardan en el llavero del sistema (en la versión de servidor, en `tokens.json` dentro de la carpeta de datos), no en la base de datos, y no forman parte de la sincronización de configuración.

</details>

<details>
<summary><strong>Resultados para agentes con tiempos de espera cortos</strong>: detalles</summary>
<br/>

- Cuánto espera un agente por una llamada a una herramienta MCP varía: ZCode, 30 segundos; Cursor, Kimi, DeepSeek y OpenCode, 60 segundos; Codex, 5 minutos; Claude Code, Qoder, CodeBuddy y Grok, prácticamente sin límite. En la versión oficial, `get_delegation_status` (esperar el resultado de una tarea delegada) puede esperar mucho en una sola llamada y `ask_user_question` (una pregunta para ti) espera hasta que respondas; pasado el plazo, el agente da la llamada por fallida y sigue, así que la pregunta cuenta como sin responder.
- Esta versión da a estas herramientas un límite por agente, por debajo de su plazo: por ejemplo 20 segundos en ZCode, 45 en OpenCode y 4 minutos en Codex; los agentes sin límite no tienen tope, como en la versión oficial. Si se llega al tope sin resultado, la llamada vuelve y le dice al agente cómo seguir esperando.
- Preguntas: si para entonces no has respondido, la tarjeta de la pregunta sigue donde está y el agente sigue esperando con una herramienta nueva, `get_question_answer`; cuando respondes, la respuesta aparece en la tarjeta original.
- Tareas delegadas: cada llamada a `get_delegation_status` espera como mucho hasta el tope y devuelve el estado actual de las tareas. La generación de imágenes funciona igual; consulta la sección anterior.
- Mientras espera, el agente recibe un aviso de progreso cada 10 segundos, con lo que los agentes que alargan su plazo con el progreso, como OpenCode, pueden esperar más.

</details>

<details>
<summary><strong>Solo los agentes que usas</strong>: detalles</summary>
<br/>

- Hay cerca de 20 agentes integrados y la versión oficial los activa todos, estén instalados o no: una lista de ajustes larga, un selector de nueva conversación lleno de agentes sin instalar (la página de conversación nunca instala uno, así que elegirlo no sirve de nada) y una comprobación de cada uno cada vez que se abre la página de ajustes.
- En esta versión, Ajustes → Agentes muestra solo «Mis agentes», que se pueden seguir reordenando arrastrando. «Añadir» en su barra de título y la fila bajo la lista abren «Añadir agentes»: busca por nombre o descripción, filtra por instalados / no instalados, encuentra primero los ya instalados en este equipo y añade varios a la vez. Uno que no esté instalado se instala desde sus detalles una vez añadido.
- El interruptor de los detalles de un agente es «Mis agentes»: apágalo para quitar el agente de la lista, con opción de deshacer. Es el ajuste «activado» de la versión oficial, así que el selector de nueva conversación, la delegación y todo lo demás lo siguen.
- Al abrir la página de ajustes solo se comprueban «Mis agentes»; cualquier otro agente se comprueba cuando lo abres.
- Cuando codeg aún no tiene ajustes para un agente (una instalación nueva, o un agente integrado que añade una versión posterior), lo activa solo si detecta que está instalado aquí. Codeg considera instalado un agente cuando el adaptador ACP o la CLI que ejecuta están listos, así que una instalación nueva a menudo no tiene ninguno y la lista empieza vacía: elige en «Añadir agentes». Un agente que instales después no se añade solo, y los ajustes existentes nunca cambian.
- Al actualizar desde una versión anterior con agentes en «Mis agentes» que no están instalados, un aviso arriba de la lista ofrece una vez «Quedarme solo con los instalados» o dejarlo así (la elección se recuerda por dispositivo).
- El selector de nueva conversación termina su fila con un «+» que abre «Añadir agentes»; cuando no caben todos los agentes, está al final del menú «más». Sin ningún agente activado, el botón del selector también abre «Añadir agentes».

</details>

### Publicación

|  | Esta versión | Versión oficial |
| --- | --- | --- |
| Descargas y actualizaciones | [Releases](https://github.com/keh4l/codeg/releases) de este repositorio, firmadas con la clave propia de este fork | Releases de [spacering-net/codeg](https://github.com/spacering-net/codeg/releases) |
| Versión | `<versión original>-<n>`: `0.33.0-2` es la 2.ª versión basada en la 0.33.0 original | p. ej. `0.33.0` |
| Notarización en macOS | No; hay que permitirla una vez al abrirla por primera vez (ver [Instalación](#instalación)) | Sí |
| Imagen de Docker | No | Sí |

Las actualizaciones no se cruzan: esta versión nunca se actualiza a una versión oficial, ni una versión oficial a esta. La rama `keh4l` es la rama `main` del proyecto original más los cambios de arriba.

## Instalación

### Escritorio

Descarga el instalador más reciente desde [Releases](https://github.com/keh4l/codeg/releases/latest):

| Sistema | Instalador |
| --- | --- |
| macOS (Apple Silicon o Intel) | `.dmg` |
| Windows (x64 o ARM64) | `-setup.exe` |
| Linux | `.deb`, `.rpm` o `.AppImage` |

Se instala como la misma aplicación que el Codeg oficial: lo sustituye y conserva tus conversaciones y ajustes.

> [!NOTE]
> En macOS, si al abrirla por primera vez dice que la app está dañada o que no se puede abrir, ejecuta esto una vez, o permítela en Ajustes del Sistema → Privacidad y seguridad:
>
> ```bash
> xattr -cr /Applications/codeg.app
> ```

### Servidor

Linux o macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.sh | bash
CODEG_STATIC_DIR=/usr/local/share/codeg/web codeg-server
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/keh4l/codeg/keh4l/install.ps1 | iex
$env:CODEG_STATIC_DIR="$env:LOCALAPPDATA\codeg\web"; codeg-server
```

Ambos instalan desde las versiones de este repositorio, y el actualizador integrado del servidor también las usa.

### Volver a la versión oficial

> [!WARNING]
> Haz primero una copia de seguridad de tus datos de Codeg. Esta versión añade migraciones de base de datos que la oficial no tiene (las tablas de la traducción, entre otras), y una versión oficial puede negarse a arrancar con esos mismos datos.

## Documentación

Para funciones, configuración y uso, consulta el [README](https://github.com/spacering-net/codeg/blob/main/docs/readme/README.es.md) oficial y [docs.codeg.app](https://docs.codeg.app). Describen la versión oficial; las diferencias están arriba.

## Licencia y agradecimientos

Apache-2.0, consulta [LICENSE](../../LICENSE). Codeg lo crean [xintaofei](https://github.com/xintaofei) y sus colaboradores; esta versión solo le añade cosas. Codeg se apoya en [Agent Client Protocol](https://agentclientprotocol.com), [Superpowers](https://github.com/obra/superpowers), [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) y [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills).
