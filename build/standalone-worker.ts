// Worker enxuto da hospedagem Girofy: painel visual, API REST, servidor MCP e os sites
// publicados, sem vinext e sem as páginas institucionais. Serve para rodar a hospedagem num
// subdomínio da própria conta Cloudflare, por exemplo hosting.girofy.site, usando as mesmas
// funções de lib/hosp. Guarda os arquivos em R2 (BUCKET) ou, sem cartão, em KV (HOSP_KV).

import { panelCss, panelJs, panelVersion } from "panel-assets:bundle";
import * as rest from "../app/api/hosp/route";
import * as mcp from "../app/api/hosp/mcp/route";
import { serveHostedSite } from "../lib/hosp/serve";
import { hospStorage } from "../lib/hosp/storage";

type Handler = (request: Request) => Promise<Response>;
type Handlers = Partial<Record<"GET" | "POST" | "DELETE", Handler>>;

// Caminhos que nunca são tratados como endereço de projeto.
const reservedPaths = new Set(["api", "hosp", "hosp-assets", "assets", "projects", "favicon.png", "robots.txt"]);

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/hosp/mcp") return dispatch(mcp, request);
    if (url.pathname === "/api/hosp") return dispatch(rest, request);

    if (url.pathname === "/") return Response.redirect(new URL("/hosp", url.origin), 302);
    if (url.pathname === "/hosp" || url.pathname === "/hosp/") return panelShell();
    if (url.pathname === "/hosp-assets/panel.js") return panelAsset(panelJs, "text/javascript; charset=utf-8");
    if (url.pathname === "/hosp-assets/panel.css") return panelAsset(panelCss, "text/css; charset=utf-8");

    const storage = hospStorage(env);
    if (storage && (request.method === "GET" || request.method === "HEAD")) {
      const hosted = await serveHostedSite(request, storage, reservedPaths);
      if (hosted) return hosted;
    }
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
};

function dispatch(handlers: Handlers, request: Request): Promise<Response> | Response {
  const handler = handlers[request.method as keyof Handlers];
  if (handler) return handler(request);
  const allowed = (["GET", "POST", "DELETE"] as const).filter((method) => handlers[method]).join(", ");
  return new Response("Method not allowed", { status: 405, headers: { Allow: allowed } });
}

/** Painel empacotado dentro do Worker. A URL leva a versão, então o cache longo é seguro. */
function panelAsset(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

/** Página que carrega o painel (código e estilos embutidos no Worker). */
function panelShell(): Response {
  const page = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">" +
    "<meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"color-scheme\" content=\"dark\">" +
    "<title>Hospedagem | Girofy</title>" +
    "<link rel=\"stylesheet\" href=\"/hosp-assets/panel.css?v=" + panelVersion + "\"></head>" +
    "<body><div id=\"root\"></div><script src=\"/hosp-assets/panel.js?v=" + panelVersion + "\"></script></body></html>";
  return new Response(page, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; " +
        "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    }
  });
}
