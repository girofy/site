// Servidor MCP da hospedagem Girofy (Streamable HTTP, sem sessão e sem SSE).
// Autenticação: Authorization: Bearer gfy_... (token criado no painel, em Configurações).
// Cada ferramenta chama a mesma ação da API REST, então escopo, limites e registro
// de atividade são idênticos nos dois caminhos.

import { env } from "cloudflare:workers";
import { execute } from "../../../../lib/hosp/api";
import {
  SCOPE_RANK, authenticateToken, bearerFrom, type Actor, type Scope
} from "../../../../lib/hosp/auth";
import { HospError } from "../../../../lib/hosp/errors";

const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY_BYTES = 14 * 1024 * 1024;

type Tool = {
  name: string;
  action: string;
  scope: Scope;
  description: string;
  properties: Record<string, unknown>;
  required?: string[];
  readOnly?: boolean;
  destructive?: boolean;
};

const slugProp = { type: "string", description: "Endereço do projeto: letras minúsculas, números e hífens. O site fica em girofy.site/{slug}." };
const versionProp = { type: "string", description: "ID da versão (32 caracteres), como aparece em hosp_ver_projeto." };
const noteProp = { type: "string", maxLength: 200, description: "Mensagem curta que descreve a mudança. Fica salva na versão." };
const activateProp = { type: "boolean", description: "false publica sem ativar: o site continua igual e você revisa pela previewPath antes de ativar." };
const filesProp = {
  type: "array", maxItems: 40,
  description: "Arquivos da publicação. Cada um tem path e exatamente um de: text (texto) ou base64 (binário).",
  items: {
    type: "object",
    properties: {
      path: { type: "string", description: "Caminho relativo, por exemplo index.html ou assets/logo.png." },
      text: { type: "string" },
      base64: { type: "string" },
      contentType: { type: "string" }
    },
    required: ["path"], additionalProperties: false
  }
};

const TOOLS: Tool[] = [
  {
    name: "hosp_listar_projetos", action: "list", scope: "read", readOnly: true,
    description: "Lista os projetos publicados, com versão ativa, tamanho, apelidos e configurações.",
    properties: {}
  },
  {
    name: "hosp_ver_projeto", action: "project", scope: "read", readOnly: true,
    description: "Mostra um projeto: versões (com nota, origem, se está ativa ou fixada e o caminho de prévia), apelidos e configurações.",
    properties: { slug: slugProp }, required: ["slug"]
  },
  {
    name: "hosp_listar_arquivos", action: "files", scope: "read", readOnly: true,
    description: "Lista os arquivos de uma versão (a ativa, se não informar outra).",
    properties: { slug: slugProp, version: versionProp }, required: ["slug"]
  },
  {
    name: "hosp_ler_arquivo", action: "file", scope: "read", readOnly: true,
    description: "Lê um arquivo de texto de uma versão (HTML, CSS, JS, JSON, SVG, TXT) com até 200 KB.",
    properties: { slug: slugProp, path: { type: "string" }, version: versionProp }, required: ["slug", "path"]
  },
  {
    name: "hosp_uso", action: "usage", scope: "read", readOnly: true,
    description: "Mostra projetos, versões e bytes guardados, e os limites que ainda restam.",
    properties: {}
  },
  {
    name: "hosp_atividade", action: "activity", scope: "read", readOnly: true,
    description: "Lista as últimas ações feitas na hospedagem (quem, o quê e quando).",
    properties: { limit: { type: "integer", minimum: 1, maximum: 100 } }
  },
  {
    name: "hosp_publicar_arquivos", action: "deploy", scope: "deploy",
    description: "Cria ou atualiza um projeto numa só chamada, com até 40 arquivos e 8 MB. Se o projeto já existe, cria uma nova versão e guarda a anterior para voltar depois. Sites maiores: use iniciar_envio, enviar_lote e concluir_envio.",
    properties: {
      slug: slugProp, name: { type: "string", maxLength: 60 },
      entry: { type: "string", description: "Página inicial (padrão: index.html)." },
      note: noteProp, activate: activateProp, files: filesProp
    },
    required: ["slug", "files"]
  },
  {
    name: "hosp_publicar_zip_url", action: "deploy_zip", scope: "deploy",
    description: "Baixa um ZIP de uma URL https pública e publica o conteúdo (até 40 arquivos por chamada). Remove a pasta raiz comum e ignora arquivos protegidos como .env.",
    properties: {
      slug: slugProp, zipUrl: { type: "string", description: "URL https pública do ZIP." },
      root: { type: "string", description: "Pasta dentro do ZIP a publicar, por exemplo dist." },
      name: { type: "string", maxLength: 60 }, entry: { type: "string" }, note: noteProp, activate: activateProp
    },
    required: ["slug", "zipUrl"]
  },
  {
    name: "hosp_iniciar_envio", action: "begin", scope: "deploy",
    description: "Começa um envio em lotes para sites maiores. Devolve a versão a usar em enviar_lote e concluir_envio. O envio expira em 1 hora.",
    properties: { slug: slugProp, name: { type: "string", maxLength: 60 }, entry: { type: "string" } },
    required: ["slug"]
  },
  {
    name: "hosp_enviar_lote", action: "upload_files", scope: "deploy",
    description: "Envia um lote de até 40 arquivos (8 MB) para um envio iniciado.",
    properties: { slug: slugProp, version: versionProp, files: filesProp }, required: ["slug", "version", "files"]
  },
  {
    name: "hosp_concluir_envio", action: "publish", scope: "deploy",
    description: "Publica o envio em lotes. Com activate=false a versão fica guardada para prévia, sem mudar o site.",
    properties: { slug: slugProp, version: versionProp, entry: { type: "string" }, name: { type: "string" }, note: noteProp, activate: activateProp },
    required: ["slug", "version"]
  },
  {
    name: "hosp_ativar_versao", action: "restore", scope: "deploy",
    description: "Coloca uma versão guardada no ar (promove uma prévia ou restaura uma antiga).",
    properties: { slug: slugProp, version: versionProp }, required: ["slug", "version"]
  },
  {
    name: "hosp_voltar_versao", action: "rollback", scope: "deploy",
    description: "Volta o site para a versão anterior à ativa, em um passo.",
    properties: { slug: slugProp }, required: ["slug"]
  },
  {
    name: "hosp_fixar_versao", action: "pin", scope: "deploy",
    description: "Fixa (ou solta) uma versão para que a rotação automática nunca a apague. Até 5 por projeto.",
    properties: { slug: slugProp, version: versionProp, pinned: { type: "boolean", description: "Padrão: true. Use false para soltar." } },
    required: ["slug", "version"]
  },
  {
    name: "hosp_configurar_projeto", action: "settings", scope: "deploy",
    description: "Muda configurações do projeto. Só os campos enviados mudam. Campos: spaFallback (boolean), noindex (boolean), cacheSeconds (0 a 31536000), notFound (caminho de um HTML, ou vazio), redirects (lista de {from, to, status}; from aceita /* no fim, to aceita :splat, status 301/302/307/308) e headers (objeto com cabeçalhos permitidos, como access-control-allow-origin).",
    properties: {
      slug: slugProp,
      settings: {
        type: "object",
        properties: {
          spaFallback: { type: "boolean" }, noindex: { type: "boolean" },
          cacheSeconds: { type: "integer", minimum: 0, maximum: 31536000 },
          notFound: { type: "string" },
          redirects: {
            type: "array", maxItems: 50,
            items: {
              type: "object",
              properties: {
                from: { type: "string" }, to: { type: "string" },
                status: { type: "integer", enum: [301, 302, 307, 308] }
              },
              required: ["from", "to"], additionalProperties: false
            }
          },
          headers: { type: "object", additionalProperties: { type: "string" } }
        },
        additionalProperties: false
      }
    },
    required: ["slug", "settings"]
  },
  {
    name: "hosp_adicionar_apelido", action: "alias_add", scope: "deploy",
    description: "Cria um endereço extra que redireciona (308) para o projeto. Serve para manter um endereço antigo funcionando.",
    properties: { slug: slugProp, alias: { type: "string", description: "Endereço extra: girofy.site/{alias}." } },
    required: ["slug", "alias"]
  },
  {
    name: "hosp_remover_apelido", action: "alias_remove", scope: "deploy",
    description: "Remove um apelido do projeto.",
    properties: { slug: slugProp, alias: { type: "string" } }, required: ["slug", "alias"]
  },
  {
    name: "hosp_renomear_projeto", action: "rename", scope: "deploy",
    description: "Muda o nome de exibição do projeto. O endereço não muda.",
    properties: { slug: slugProp, name: { type: "string", maxLength: 60 } }, required: ["slug", "name"]
  },
  {
    name: "hosp_apagar_projeto", action: "delete", scope: "admin", destructive: true,
    description: "Apaga o projeto e TODAS as versões. Não dá para desfazer. Exige confirm igual ao slug.",
    properties: { slug: slugProp, confirm: { type: "string", description: "Repita o slug para confirmar." } },
    required: ["slug", "confirm"]
  }
];

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return plain({ error: "Origem não permitida." }, 403);
  }
  const bucket = env.BUCKET;
  if (!bucket) return plain({ error: "O armazenamento ainda não está disponível." }, 503);

  const bearer = bearerFrom(request);
  const actor = bearer ? await authenticateToken(bucket, bearer) : null;
  if (!actor) {
    return plain(
      { error: "token_required", message: "Envie Authorization: Bearer gfy_... Crie o token no painel, em Configurações." },
      401,
      { "WWW-Authenticate": "Bearer realm=\"girofy-hospedagem\"" }
    );
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return plain(rpcError(null, -32600, "Corpo grande demais."), 413);
  }
  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return plain(rpcError(null, -32600, "Corpo grande demais."), 413);
    payload = JSON.parse(raw);
  } catch {
    return plain(rpcError(null, -32700, "Parse error"), 400);
  }

  if (Array.isArray(payload)) {
    const replies = (await Promise.all(payload.map((message) => handle(message, bucket, actor))))
      .filter((reply) => reply !== null);
    return replies.length ? plain(replies) : new Response(null, { status: 202 });
  }
  const reply = await handle(payload, bucket, actor);
  return reply === null ? new Response(null, { status: 202 }) : plain(reply);
}

export async function GET(): Promise<Response> {
  return plain({ error: "Use POST com JSON-RPC. Este servidor não abre fluxo SSE." }, 405, { Allow: "POST" });
}

export async function DELETE(): Promise<Response> {
  return plain({ error: "Este servidor não usa sessões." }, 405, { Allow: "POST" });
}

async function handle(message: unknown, bucket: R2Bucket, actor: Actor): Promise<Record<string, unknown> | null> {
  const body = (message && typeof message === "object" ? message : {}) as Record<string, unknown>;
  const id = body.id as string | number | undefined;
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(id ?? null, -32600, "Invalid Request");
  }
  // Notificações e respostas do cliente não pedem retorno.
  if (id === undefined || body.method.startsWith("notifications/")) return null;

  const params = (body.params && typeof body.params === "object" ? body.params : {}) as Record<string, unknown>;
  switch (body.method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return {
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "girofy-hospedagem", version: "1.0.0" },
          instructions: "Hospedagem estática da Girofy. Para atualizar um site, use hosp_publicar_arquivos " +
            "com o mesmo slug: a versão anterior fica guardada. Use activate=false para revisar antes de ativar. " +
            "Os sites publicados são públicos."
        }
      };
    }
    case "ping": return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0", id,
        result: {
          tools: TOOLS.filter((tool) => SCOPE_RANK[actor.scope] >= SCOPE_RANK[tool.scope]).map(describe)
        }
      };
    case "tools/call": {
      const tool = TOOLS.find((item) => item.name === params.name);
      if (!tool) return rpcError(id, -32602, "Ferramenta desconhecida: " + String(params.name ?? ""));
      const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
      try {
        const result = await execute(bucket, tool.action, args, actor);
        return { jsonrpc: "2.0", id, result: toolResult(JSON.stringify(result, null, 2)) };
      } catch (error) {
        if (error instanceof HospError) return { jsonrpc: "2.0", id, result: toolResult(error.message, true) };
        console.error("Hospedagem Girofy (MCP):", error);
        return { jsonrpc: "2.0", id, result: toolResult("Não foi possível concluir esta operação.", true) };
      }
    }
    default:
      return rpcError(id, -32601, "Método não encontrado: " + body.method);
  }
}

function describe(tool: Tool): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description + " [escopo: " + tool.scope + "]",
    inputSchema: {
      type: "object", properties: tool.properties,
      ...(tool.required ? { required: tool.required } : {}), additionalProperties: false
    },
    annotations: {
      readOnlyHint: tool.readOnly === true,
      destructiveHint: tool.destructive === true,
      idempotentHint: tool.readOnly === true,
      openWorldHint: tool.action === "deploy_zip"
    }
  };
}

function toolResult(text: string, isError = false): Record<string, unknown> {
  return { content: [{ type: "text", text }], isError };
}

function rpcError(id: string | number | null, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function plain(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  });
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(body), { status, headers });
}
