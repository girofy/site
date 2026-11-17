// Worker enxuto da hospedagem Girofy: API REST, servidor MCP e os sites publicados, sem
// vinext, sem páginas institucionais e sem o painel visual (esse continua no Worker do Site).
// Serve para rodar a hospedagem num subdomínio da própria conta Cloudflare, por exemplo
// hosting.girofy.site, usando as mesmas funções de lib/hosp.

import * as rest from "../app/api/hosp/route";
import * as mcp from "../app/api/hosp/mcp/route";
import { serveHostedSite } from "../lib/hosp/serve";

type Handler = (request: Request) => Promise<Response>;
type Handlers = Partial<Record<"GET" | "POST" | "DELETE", Handler>>;

// Caminhos que nunca são tratados como endereço de projeto.
const reservedPaths = new Set(["api", "hosp", "assets", "projects", "favicon.png", "robots.txt"]);

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/hosp/mcp") return dispatch(mcp, request);
    if (url.pathname === "/api/hosp") return dispatch(rest, request);

    if (env.BUCKET && (request.method === "GET" || request.method === "HEAD")) {
      const hosted = await serveHostedSite(request, env.BUCKET, reservedPaths);
      if (hosted) return hosted;
    }

    if (url.pathname === "/" || url.pathname === "/hosp") return landing();
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
};

function dispatch(handlers: Handlers, request: Request): Promise<Response> | Response {
  const handler = handlers[request.method as keyof Handlers];
  if (handler) return handler(request);
  const allowed = (["GET", "POST", "DELETE"] as const).filter((method) => handlers[method]).join(", ");
  return new Response("Method not allowed", { status: 405, headers: { Allow: allowed } });
}

function landing(): Response {
  const page = "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex\">" +
    "<title>Girofy · Hospedagem</title><style>" +
    "body{font:16px/1.6 system-ui;margin:0;background:#090909;color:#fff;padding:clamp(24px,7vw,96px)}" +
    "main{max-width:760px;margin:auto}h1{font-size:clamp(34px,7vw,64px);letter-spacing:-.05em;margin:.2em 0}" +
    "p{color:#aaa}code{background:#1a1a1a;padding:2px 7px;border-radius:5px;color:#e8e8e8}" +
    ".tag{font-size:11px;letter-spacing:.16em;color:#888}</style><main>" +
    "<p class=\"tag\">GIROFY / HOSPEDAGEM</p><h1>Hospedagem para agentes.</h1>" +
    "<p>API REST em <code>/api/hosp</code> e servidor MCP em <code>/api/hosp/mcp</code>. " +
    "Use um token no cabeçalho <code>Authorization: Bearer</code>.</p>" +
    "<p>Os sites publicados ficam em <code>/{endereço}/</code>. Esta versão não inclui o painel visual.</p>" +
    "</main></html>";
  return new Response(page, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
    }
  });
}
