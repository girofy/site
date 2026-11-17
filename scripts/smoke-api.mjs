// Teste de fumaça da API REST com token e do servidor MCP da hospedagem.
// Sobe o ambiente local, cria tokens pela sessão do painel e exercita as ferramentas.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { zipSync, strToU8 } from "fflate";

const base = "http://localhost:4174";
const devVarsPath = new URL("../.dev.vars", import.meta.url);
const hadDevVars = existsSync(devVarsPath);
const previousDevVars = hadDevVars ? readFileSync(devVarsPath, "utf8") : null;
writeFileSync(devVarsPath, "HOSP_ADMIN_PASSWORD=smoke-test-key\n");

const server = spawn(process.execPath, ["scripts/run-framework.mjs", "dev", "--port", "4174"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, HOSP_ADMIN_PASSWORD: "smoke-test-key" },
  stdio: "ignore"
});

const stamp = Date.now().toString(36);
const slug = "api-" + stamp;
const slugBatch = "lote-" + stamp;
const slugZip = "zip-" + stamp;
const aliasName = "old-" + stamp;
const created = [];
let cookie = "";
let failure;
let checks = 0;

const expect = (condition, message) => {
  checks += 1;
  if (!condition) throw new Error("FALHOU: " + message);
};

const request = (path, options = {}) =>
  fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(20000), ...options });

async function session(action, payload = {}) {
  const response = await request("/api/hosp", {
    method: "POST",
    headers: { Cookie: cookie, Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function rest(token, action, payload = {}) {
  const response = await request("/api/hosp", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function mcp(token, method, params, id = 1) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const response = await request("/api/hosp/mcp", {
    method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function tool(token, name, args) {
  const { body } = await mcp(token, "tools/call", { name, arguments: args });
  const text = body.result?.content?.[0]?.text ?? "";
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { isError: body.result?.isError === true, data, text };
}

const page = (path, headers = {}) => request(path, { headers: { Accept: "text/html", ...headers } });
const html = (title, body) =>
  "<!doctype html><html><head><title>" + title + "</title><link rel=\"stylesheet\" href=\"/app.css\"></head><body>" +
  body + "</body></html>";

async function newToken(name, scope) {
  const result = await session("token_create", { name, scope });
  expect(result.status === 200 && result.body.token?.startsWith("gfy_"), "criar token " + scope);
  created.push(result.body.info.id);
  return result.body.token;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error("O servidor local encerrou antes de ficar pronto.");
    try { if ((await request("/")).ok) { ready = true; break; } } catch {}
    await delay(500);
  }
  if (!ready) throw new Error("O servidor local não iniciou em " + base);

  // ---- entrada pelo painel e criação de tokens ----
  const login = await request("/api/hosp", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", key: "smoke-test-key" })
  });
  cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  expect(login.ok && cookie, "login do painel");

  const readToken = await newToken("agente-leitura", "read");
  const deployToken = await newToken("agente-deploy", "deploy");
  const adminToken = await newToken("agente-admin", "admin");

  const listed = await session("tokens_list");
  expect(listed.body.tokens.length >= 3 && listed.body.tokens.every((item) => !("hash" in item)),
    "listar tokens sem expor o hash");
  expect(!(await session("token_create", { name: "x", scope: "superuser" })).body.ok, "escopo inválido recusado");

  // GET só lê: mesmo autenticado, uma ação que altera precisa de POST.
  const getDelete = await request("/api/hosp?action=delete&slug=" + slug, { headers: { Cookie: cookie } });
  expect(getDelete.status === 405, "GET não executa ação que altera");
  const getTokens = await request("/api/hosp?action=tokens_list", { headers: { Cookie: cookie } });
  expect(getTokens.status === 200, "GET lê a lista de tokens");

  // ---- autenticação ----
  const invalid = await rest("gfy_000000000000_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "list");
  expect(invalid.status === 401 && invalid.body.error === "token_invalid", "token inválido recusado (REST)");
  const noAuthMcp = await mcp(null, "initialize", {});
  expect(noAuthMcp.status === 401, "MCP sem token recusado");
  const selfMint = await rest(deployToken, "token_create", { name: "copia", scope: "admin" });
  expect(selfMint.status === 403 && selfMint.body.code === "session_required", "token não cria outro token");

  // ---- MCP: handshake e escopos ----
  const init = await mcp(deployToken, "initialize", { protocolVersion: "2025-06-18" });
  expect(init.body.result?.serverInfo?.name === "girofy-hospedagem", "MCP initialize");
  const readTools = (await mcp(readToken, "tools/list")).body.result.tools.map((item) => item.name);
  const deployTools = (await mcp(deployToken, "tools/list")).body.result.tools.map((item) => item.name);
  const adminTools = (await mcp(adminToken, "tools/list")).body.result.tools.map((item) => item.name);
  expect(readTools.includes("hosp_listar_projetos") && !readTools.includes("hosp_publicar_arquivos"),
    "token de leitura só vê ferramentas de leitura");
  expect(deployTools.includes("hosp_publicar_arquivos") && !deployTools.includes("hosp_apagar_projeto"),
    "token de deploy não vê apagar");
  expect(adminTools.includes("hosp_apagar_projeto") && adminTools.length >= 19, "token admin vê tudo");
  const blocked = await tool(readToken, "hosp_publicar_arquivos", { slug, files: [{ path: "index.html", text: "x" }] });
  expect(blocked.isError && /escopo/.test(blocked.text), "ler não consegue publicar mesmo chamando pelo nome");

  // ---- publicar e atualizar ----
  const first = await tool(deployToken, "hosp_publicar_arquivos", {
    slug, name: "Teste API", note: "primeira versão",
    files: [
      { path: "index.html", text: html("um", "pagina um") },
      { path: "app.css", text: "body{color:#111}" },
      { path: "sobre/index.html", text: html("sobre", "pagina sobre") },
      { path: "contato.html", text: html("contato", "pagina contato") },
      { path: "404.html", text: html("404", "pagina 404 custom") }
    ]
  });
  expect(!first.isError && first.data.activated === true, "primeiro deploy via MCP: " + first.text);
  const v1 = first.data.project.activeVersion;
  expect((await (await page("/" + slug + "/")).text()).includes("pagina um"), "site no ar com versão 1");
  expect((await (await page("/" + slug + "/sobre/")).text()).includes("pagina sobre"), "pasta com index.html resolve");
  expect((await (await page("/" + slug + "/contato")).text()).includes("pagina contato"), "URL sem .html resolve");

  const second = await tool(deployToken, "hosp_publicar_arquivos", {
    slug, note: "versão em revisão", activate: false,
    files: [
      { path: "index.html", text: html("dois", "pagina dois") },
      { path: "app.css", text: "body{color:#222}" }
    ]
  });
  expect(!second.isError && second.data.activated === false, "publicar sem ativar");
  const v2 = second.data.project.versions.find((item) => item.note === "versão em revisão").version;
  expect((await (await page("/" + slug + "/")).text()).includes("pagina um"), "site continua na versão 1");
  const preview = await page(second.data.previewPath);
  expect((await preview.text()).includes("pagina dois"), "prévia mostra a versão nova");
  expect(preview.headers.get("x-robots-tag")?.includes("noindex"), "prévia vem com noindex");

  expect(!(await tool(deployToken, "hosp_ativar_versao", { slug, version: v2 })).isError, "ativar a prévia");
  expect((await (await page("/" + slug + "/")).text()).includes("pagina dois"), "versão 2 no ar");
  const back = await tool(deployToken, "hosp_voltar_versao", { slug });
  expect(!back.isError && back.data.rolledBackTo === v1, "voltar para a versão anterior");
  expect((await (await page("/" + slug + "/")).text()).includes("pagina um"), "versão 1 de volta ao ar");

  const detail = await tool(deployToken, "hosp_ver_projeto", { slug });
  const firstInfo = detail.data.versions.find((item) => item.version === v1);
  expect(firstInfo.note === "primeira versão" && firstInfo.source === "api:agente-deploy",
    "versão guarda nota e origem");

  // ---- fixar versão sobrevive à rotação ----
  expect(!(await tool(deployToken, "hosp_fixar_versao", { slug, version: v1 })).isError, "fixar versão 1");
  for (let index = 0; index < 13; index += 1) {
    const step = await tool(deployToken, "hosp_publicar_arquivos", {
      slug, note: "rotação " + index, files: [{ path: "index.html", text: html("r" + index, "rotacao " + index) }]
    });
    expect(!step.isError, "publicação de rotação " + index + ": " + step.text);
  }
  const rotated = await tool(deployToken, "hosp_ver_projeto", { slug });
  const versionIds = rotated.data.versions.map((item) => item.version);
  expect(versionIds.includes(v1), "a versão fixada sobreviveu à rotação");
  expect(!versionIds.includes(v2), "versão antiga sem fixar foi apagada pela rotação");
  expect(rotated.data.versions.length === 13, "12 versões livres + 1 fixada (" + rotated.data.versions.length + ")");
  expect((await page("/_preview/" + slug + "/" + v1 + "/")).status === 200, "arquivos da versão fixada seguem no ar");
  expect((await page("/_preview/" + slug + "/" + v2 + "/")).status === 404, "arquivos da versão apagada sumiram");

  // ---- configurações ----
  const badHeader = await tool(deployToken, "hosp_configurar_projeto", {
    slug, settings: { headers: { "content-security-policy": "default-src *" } }
  });
  expect(badHeader.isError, "cabeçalho proibido recusado");
  const badRedirect = await tool(deployToken, "hosp_configurar_projeto", {
    slug, settings: { redirects: [{ from: "/x", to: "//evil.example" }] }
  });
  expect(badRedirect.isError, "redirecionamento para //host recusado");

  // Os arquivos de 404 e sobre vieram da primeira versão fixada; republicamos o conjunto completo.
  const full = await tool(deployToken, "hosp_publicar_arquivos", {
    slug, note: "site completo", files: [
      { path: "index.html", text: html("home", "home final") },
      { path: "app.css", text: "body{color:#333}" },
      { path: "sobre/index.html", text: html("sobre", "sobre final") },
      { path: "404.html", text: html("404", "pagina 404 custom") }
    ]
  });
  expect(!full.isError, "publicar conjunto completo");
  const configured = await tool(deployToken, "hosp_configurar_projeto", {
    slug, settings: {
      noindex: true, cacheSeconds: 60, notFound: "404.html", spaFallback: false,
      headers: { "Access-Control-Allow-Origin": "*" },
      redirects: [
        { from: "/antigo", to: "/sobre/", status: 301 },
        { from: "/blog/*", to: "/artigos/:splat", status: 302 }
      ]
    }
  });
  expect(!configured.isError && !configured.data.warnings, "configurações salvas: " + configured.text);
  const moved = await page("/" + slug + "/antigo");
  expect(moved.status === 301 && moved.headers.get("location") === "/" + slug + "/sobre/", "redirecionamento exato");
  const splat = await page("/" + slug + "/blog/a/b");
  expect(splat.status === 302 && splat.headers.get("location") === "/" + slug + "/artigos/a/b", "redirecionamento com :splat");
  const css = await request("/" + slug + "/app.css");
  expect(css.headers.get("access-control-allow-origin") === "*", "cabeçalho personalizado aplicado");
  expect(css.headers.get("x-robots-tag")?.includes("noindex"), "noindex aplicado");
  expect(css.headers.get("cache-control") === "public, max-age=60", "cache configurado");
  const missing = await page("/" + slug + "/nao-existe");
  expect(missing.status === 404 && (await missing.text()).includes("pagina 404 custom"), "página 404 própria");
  const missingImage = await request("/" + slug + "/nao-existe.png");
  expect(missingImage.status === 404, "arquivo inexistente dá 404");
  const homeStill = await page("/" + slug + "/");
  expect((await homeStill.text()).includes("home final"), "raiz continua servindo a página inicial");
  const loose = await tool(deployToken, "hosp_configurar_projeto", { slug, settings: { notFound: "nao-tem.html" } });
  expect(!loose.isError && loose.data.warnings?.length === 1, "aviso quando o 404 não existe");
  await tool(deployToken, "hosp_configurar_projeto", { slug, settings: { notFound: "404.html", spaFallback: true } });

  // ---- apelidos ----
  expect(!(await tool(deployToken, "hosp_adicionar_apelido", { slug, alias: aliasName })).isError, "criar apelido");
  const aliased = await request("/" + aliasName + "/sobre/");
  expect(aliased.status === 308 && aliased.headers.get("location") === "/" + slug + "/sobre/", "apelido redireciona");
  expect((await tool(deployToken, "hosp_adicionar_apelido", { slug, alias: "hosp" })).isError, "apelido reservado recusado");
  expect((await tool(deployToken, "hosp_adicionar_apelido", { slug, alias: slug })).isError, "apelido igual ao projeto recusado");
  expect(!(await tool(deployToken, "hosp_remover_apelido", { slug, alias: aliasName })).isError, "remover apelido");
  const afterAlias = await request("/" + aliasName + "/sobre/");
  expect(!(afterAlias.headers.get("location") ?? "").includes(slug), "apelido removido deixa de apontar para o projeto");

  // ---- leitura ----
  const files = await tool(readToken, "hosp_listar_arquivos", { slug });
  expect(files.data.files.some((item) => item.path === "sobre/index.html"), "listar arquivos");
  const read = await tool(readToken, "hosp_ler_arquivo", { slug, path: "index.html" });
  expect(read.data.content.includes("home final"), "ler arquivo de texto");
  expect((await tool(readToken, "hosp_ler_arquivo", { slug, path: "../x" })).isError, "caminho com .. recusado");
  const usage = await tool(readToken, "hosp_uso", {});
  expect(usage.data.projects >= 1 && usage.data.limits.maxProjects === 50, "uso e limites");

  // ---- envio em lotes ----
  const begun = await tool(deployToken, "hosp_iniciar_envio", { slug: slugBatch });
  expect(!begun.isError && /^[a-f0-9]{32}$/.test(begun.data.version), "iniciar envio em lotes");
  const batchOne = await tool(deployToken, "hosp_enviar_lote", {
    slug: slugBatch, version: begun.data.version, files: [{ path: "index.html", text: html("lote", "lote ok") }]
  });
  const batchTwo = await tool(deployToken, "hosp_enviar_lote", {
    slug: slugBatch, version: begun.data.version, files: [{ path: "img.bin", base64: btoa("binario") }]
  });
  expect(!batchOne.isError && !batchTwo.isError, "enviar lotes");
  expect(!(await tool(deployToken, "hosp_concluir_envio", {
    slug: slugBatch, version: begun.data.version, note: "em lotes"
  })).isError, "concluir envio");
  expect((await (await page("/" + slugBatch + "/")).text()).includes("lote ok"), "site enviado em lotes no ar");
  expect((await request("/" + slugBatch + "/img.bin")).status === 200, "arquivo base64 servido");
  expect((await tool(deployToken, "hosp_publicar_arquivos", {
    slug: slugBatch, files: [{ path: ".env", text: "SEGREDO=1" }]
  })).isError, "arquivo .env recusado");
  expect((await tool(deployToken, "hosp_publicar_arquivos", {
    slug: slugBatch, files: Array.from({ length: 41 }, (_, index) => ({ path: "f" + index + ".txt", text: "x" }))
  })).isError, "mais de 40 arquivos numa chamada recusado");

  // ---- ZIP (base64 pela REST; a URL usa o mesmo caminho depois do download) ----
  const zip = zipSync({
    "site/index.html": strToU8(html("zip", "de dentro do zip")),
    "site/app.css": strToU8("body{}"),
    "site/.env": strToU8("SEGREDO=1"),
    "__MACOSX/site/._index.html": strToU8("lixo")
  });
  const deployedZip = await rest(deployToken, "deploy_zip", {
    slug: slugZip, name: "Zip", note: "via zip", zipBase64: Buffer.from(zip).toString("base64")
  });
  expect(deployedZip.status === 200, "deploy de ZIP: " + JSON.stringify(deployedZip.body));
  expect(deployedZip.body.skipped?.some((name) => name.endsWith(".env")), ".env do ZIP foi ignorado");
  expect((await (await page("/" + slugZip + "/")).text()).includes("de dentro do zip"), "pasta raiz do ZIP removida");
  const badZipUrl = await rest(deployToken, "deploy_zip", { slug: slugZip, zipUrl: "http://exemplo.com/a.zip" });
  expect(badZipUrl.status === 400, "URL http recusada");
  const privateZipUrl = await rest(deployToken, "deploy_zip", { slug: slugZip, zipUrl: "https://127.0.0.1/a.zip" });
  expect(privateZipUrl.status === 400, "IP numérico recusado");

  // ---- atividade ----
  const activity = await tool(readToken, "hosp_atividade", { limit: 50 });
  expect(activity.data.events.some((item) => item.by === "api:agente-deploy" && item.action === "deploy"),
    "atividade registra quem publicou");

  // ---- apagar exige escopo e confirmação ----
  const denied = await rest(deployToken, "delete", { slug, confirm: slug });
  expect(denied.status === 403, "deploy não apaga");
  const unconfirmed = await tool(adminToken, "hosp_apagar_projeto", { slug, confirm: "outro" });
  expect(unconfirmed.isError, "apagar sem confirmação correta recusado");
  expect(!(await tool(adminToken, "hosp_apagar_projeto", { slug, confirm: slug })).isError, "apagar com confirmação");
  expect((await fetch(base + "/" + slug + "/", { signal: AbortSignal.timeout(20000) })).status === 404,
    "projeto apagado sai do ar");

  // ---- revogar ----
  expect((await session("token_revoke", { id: created[0] })).status === 200, "revogar token");
  expect((await rest(readToken, "list")).status === 401, "token revogado deixa de funcionar");

  console.log("Smoke API passou: " + checks + " verificações (tokens, escopos, MCP, versões, prévia, fixar, configurações, apelidos, lotes, ZIP, apagar).");
} catch (error) {
  failure = error;
} finally {
  for (const name of [slug, slugBatch, slugZip]) {
    try { await session("delete", { slug: name }); } catch {}
  }
  for (const id of created) {
    try { await session("token_revoke", { id }); } catch {}
  }
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(3000)]);
  if (hadDevVars) writeFileSync(devVarsPath, previousDevVars);
  else rmSync(devVarsPath, { force: true });
}

if (failure) {
  console.error(failure instanceof Error ? failure.message : failure);
  process.exitCode = 1;
}
