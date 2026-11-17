# API e MCP da hospedagem Girofy

Esta é a hospedagem estática do painel `/hosp`, aberta para agentes de IA e scripts. Tudo que o painel faz passa pelas mesmas funções (`lib/hosp/`), então tela, API REST e MCP seguem as mesmas regras de escopo, limites e registro de atividade.

Estado: implementado e testado em ambiente local (`npm run smoke` e `npm run smoke:api`). Não está em produção: o `girofy.site` ainda é servido pelo ChatGPT Sites, e esta versão só chega ao ar quando o projeto for publicado numa hospedagem que o proprietário controla. Até lá, nada aqui muda o site atual.

## Como conectar um agente

1. No painel, abra **Configurações → Agentes e API**.
2. Crie um token (nome do agente, permissão e validade opcional). O valor aparece **uma única vez**.
3. Use o token em `Authorization: Bearer gfy_...`.

Claude Code:

```bash
claude mcp add --transport http girofy-hosp https://girofy.site/api/hosp/mcp \
  --header "Authorization: Bearer gfy_SEU_TOKEN"
```

Outros clientes MCP (Cursor, Claude Desktop e similares):

```json
{
  "mcpServers": {
    "girofy-hosp": {
      "type": "http",
      "url": "https://girofy.site/api/hosp/mcp",
      "headers": { "Authorization": "Bearer gfy_SEU_TOKEN" }
    }
  }
}
```

## Permissões dos tokens

| Escopo | O que permite |
| --- | --- |
| `read` | Listar projetos, versões, arquivos, ler arquivos de texto, uso e atividade. |
| `deploy` | Tudo do `read`, mais publicar, atualizar, ativar/voltar versões, fixar, configurar, apelidos e renomear. |
| `admin` | Tudo do `deploy`, mais apagar projetos. |

Regras de segurança:

- O token é guardado só como hash SHA-256 no R2 (`_system/tokens/`). Ninguém, nem o painel, consegue ver o valor depois.
- **Um token não cria nem revoga tokens.** Isso é exclusivo do painel (sessão com a chave).
- Um agente só apaga se enviar `confirm` igual ao `slug`.
- Pedidos com token não usam cookie, então a checagem de origem do painel não se aplica a eles. Sem cabeçalhos CORS, navegadores de terceiros não conseguem chamar a API.
- Revogar um token vale na hora. Há no máximo 20 tokens.
- Todo site publicado é público. Não envie conteúdo privado.

## API REST

Mesmo endereço do painel: `POST https://girofy.site/api/hosp` com JSON `{ "action": "...", ... }`. `GET` aceita só ações de leitura (`?action=list`, `project&slug=`, `files`, `file`, `usage`, `activity`).

Atualizar um site (cria nova versão e guarda a anterior):

```bash
curl -X POST https://girofy.site/api/hosp \
  -H "Authorization: Bearer gfy_SEU_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"deploy","slug":"meu-site","note":"novo hero","files":[
        {"path":"index.html","text":"<!doctype html>..."},
        {"path":"logo.png","base64":"iVBORw0..."}]}'
```

Sites maiores, com arquivos binários, pelo terminal (mesmo fluxo do painel):

```bash
V=$(curl -s -X POST https://girofy.site/api/hosp -H "Authorization: Bearer $T" \
  -H "Content-Type: application/json" -d '{"action":"begin","slug":"meu-site"}' | jq -r .version)
curl -X POST https://girofy.site/api/hosp -H "Authorization: Bearer $T" \
  -F slug=meu-site -F version=$V -F path=index.html -F file=@index.html
curl -X POST https://girofy.site/api/hosp -H "Authorization: Bearer $T" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"publish\",\"slug\":\"meu-site\",\"version\":\"$V\",\"note\":\"v2\"}"
```

## Ações

| Ação | Escopo | O que faz |
| --- | --- | --- |
| `list`, `project`, `versions` | read | Projetos, detalhe (versões com nota, origem, fixada, prévia) e histórico. |
| `files`, `file` | read | Lista os arquivos de uma versão e lê um arquivo de texto (até 200 KB). |
| `usage` | read | Projetos, versões, bytes guardados e limites restantes. |
| `activity` | read | Últimas ações: quem, o quê, quando. |
| `deploy` | deploy | Cria/atualiza em uma chamada (até 40 arquivos e 8 MB). |
| `deploy_zip` | deploy | Publica um ZIP vindo de `zipUrl` (https público) ou `zipBase64`. Remove a pasta raiz comum e ignora `.env`, chaves e `__MACOSX`. |
| `begin`, `upload_files`, `publish` | deploy | Envio em lotes para sites maiores. `publish` aceita `note` e `activate`. |
| `restore` | deploy | Coloca uma versão guardada no ar (também promove uma prévia). |
| `rollback` | deploy | Volta para a versão anterior, em um passo. |
| `pin` | deploy | Fixa ou solta uma versão. Fixadas (até 5) nunca são apagadas pela rotação. |
| `settings` | deploy | Configurações do projeto (abaixo). |
| `alias_add`, `alias_remove` | deploy | Endereços extras que redirecionam (308) para o projeto. |
| `rename` | deploy | Muda o nome de exibição. |
| `delete` | admin | Apaga o projeto e todas as versões. Exige `confirm` para tokens. |
| `tokens_list`, `token_create`, `token_revoke` | só painel | Gerenciamento de tokens. |

## Configurações por projeto

Enviadas em `{"action":"settings","slug":"...","settings":{...}}`. Só os campos enviados mudam.

| Campo | Padrão | Efeito |
| --- | --- | --- |
| `spaFallback` | `true` | Rotas sem arquivo e sem extensão abrem a página inicial (apps de página única). Com `false`, dão 404. |
| `noindex` | `false` | Envia `X-Robots-Tag: noindex, nofollow`. |
| `cacheSeconds` | `300` | Cache dos arquivos que não são HTML. `0` desliga. |
| `notFound` | vazio | Arquivo HTML do projeto usado no erro 404, por exemplo `404.html`. |
| `redirects` | vazio | Até 50 regras `{from, to, status}`. `from` aceita `/*` no fim; `to` aceita `:splat`, caminho interno (`/novo`) ou `https://`. Status 301, 302, 307 ou 308. |
| `headers` | vazio | Até 10 cabeçalhos entre: `access-control-allow-origin`, `access-control-allow-methods`, `access-control-allow-headers`, `access-control-max-age`, `content-language`, `cross-origin-resource-policy`, `link`, `x-robots-tag`, `x-frame-options`. CSP e Cache-Control ficam de fora de propósito. |

## Prévia antes de ativar

`publish`/`deploy` com `"activate": false` guarda a versão sem mudar o site. A resposta traz `previewPath`, por exemplo `/_preview/meu-site/{versão}/`. O ID de 32 caracteres é o segredo do link: quem tem o link vê a prévia, que sai com `noindex`. Quando estiver certo, `restore` com essa versão coloca no ar.

## Ferramentas MCP

`POST /api/hosp/mcp` (JSON-RPC, sem sessão e sem SSE). `tools/list` mostra só o que o escopo do token permite.

Leitura: `hosp_listar_projetos`, `hosp_ver_projeto`, `hosp_listar_arquivos`, `hosp_ler_arquivo`, `hosp_uso`, `hosp_atividade`.
Publicação: `hosp_publicar_arquivos`, `hosp_publicar_zip_url`, `hosp_iniciar_envio`, `hosp_enviar_lote`, `hosp_concluir_envio`, `hosp_ativar_versao`, `hosp_voltar_versao`, `hosp_fixar_versao`, `hosp_configurar_projeto`, `hosp_adicionar_apelido`, `hosp_remover_apelido`, `hosp_renomear_projeto`.
Administração: `hosp_apagar_projeto`.

Este MCP é diferente de `functions/mcp.js`, que é o endpoint público de leitura sobre os serviços da Girofy e continua sem ser declarado ativo.

## Limites e cuidados

- Mantidos: 50 MB e 500 arquivos por publicação, 10 MB por arquivo, 50 projetos, 12 versões livres por projeto (fixadas ficam fora dessa conta, até 5).
- Cada chamada de lote aceita 40 arquivos e 8 MB (`LIMITS.maxBatchFiles` e `maxBatchBytes` em `lib/hosp/core.ts`). O número de 40 é uma escolha conservadora para o limite de subrequisições de um Worker. Não foi medido no ambiente de produção real e pode ser ajustado depois de medir.
- Um MCP recebe argumentos escritos pelo modelo, então envio de binários grandes por `base64` não é prático. Para isso use `hosp_publicar_zip_url` (o agente publica o ZIP em uma URL pública) ou a API REST com `multipart`.
- `deploy_zip` por URL só aceita https público com nome de domínio, sem usuário, senha ou porta. O download e a leitura do ZIP têm limite de tamanho e de arquivos. A busca real em uma URL pública não foi exercitada nos testes locais, só as recusas.
- URLs limpas: `/projeto/sobre` abre `sobre.html` ou `sobre/index.html`, e `/projeto/sobre/` abre `sobre/index.html`. Antes essas rotas caíam na página inicial.
- A leitura de `active.json` agora inclui as configurações, então servir um site continua exigindo uma leitura do R2. Apelidos e prévias adicionam uma leitura só quando o endereço não é um projeto ativo.

## Worker enxuto em `hosting.girofy.site`

Além do Worker do Site (vinext, painel visual e páginas institucionais), existe um Worker só da hospedagem: `build/standalone-worker.ts`. Ele tem a API REST, o MCP e serve os sites publicados, sem painel visual. Reaproveita `lib/hosp/` e `lib/hosp/serve.ts`, então o comportamento é o mesmo (`npm run smoke:standalone` repete as 90 verificações nele).

Estado em 17/11/2026, na conta Cloudflare que tem a zona `girofy.site`:

- Worker `girofy-hosting` publicado (59.458 bytes, checksum conferido contra o build local) e rota `hosting.girofy.site/*`. Também responde em `girofy-hosting.jlzin2603.workers.dev`.
- **Falta o R2 e a chave.** Sem o binding `BUCKET` a API responde 503 ("armazenamento ainda não está disponível"), e sem `HOSP_ADMIN_PASSWORD` responde `admin_key_not_configured`. O R2 estava desligado na conta (erro 10042) e só o dono da conta consegue ligar.
- Nenhum registro DNS foi criado ou alterado. O `*.girofy.site` já é um CNAME proxied e cobre o subdomínio. Nenhuma rota existente foi tocada.
- O nome `host.girofy.site` **não foi usado de propósito**: o `girofy-subdomain-router` manda esse endereço para o painel atual em `girofy.site/hosp`.

Para concluir depois que o R2 estiver ligado:

1. Criar o bucket `girofy-hosting` no R2.
2. Adicionar o binding `BUCKET` ao Worker `girofy-hosting`.
3. Definir o segredo `HOSP_ADMIN_PASSWORD`.
4. Entrar por `POST /api/hosp` com `{"action":"login","key":"..."}` (com cabeçalho `Origin` igual ao do endereço) e criar o primeiro token com `token_create`.

Para publicar de novo a partir do repositório: `npm run build:standalone` e `npx wrangler deploy -c wrangler.standalone.jsonc` (exige `CLOUDFLARE_API_TOKEN` e `HOSP_ADMIN_PASSWORD` já definido no Worker). O painel visual continua no Worker do Site.
