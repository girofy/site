import handler from "vinext/server/fetch-handler";
import { serveHostedSite } from "../lib/hosp/serve";
import { hospStorage } from "../lib/hosp/storage";

type SiteEnv = Cloudflare.Env & {
  ASSETS?: Fetcher;
  BUCKET?: R2Bucket;
  HOSP_KV?: KVNamespace;
};

const reservedPaths = new Set([
  "api", "hosp", "assets", "projects", "software-sob-medida", "sistemas-internos",
  "aplicativos-empresariais", "plataformas-digitais",
  "automacao-integracoes", "sites-para-empresas", "guia-escolher-software",
  "criacao-de-sites-para-empresas", "projeto", "signin-with-chatgpt",
  "signout-with-chatgpt", "callback", "favicon.png", "robots.txt",
  "sitemap.xml", "llms.txt", "styles.css", "ads-landing.css", "app.js",
  "pages.js", "projeto.js", "config.js", "brand-boot.js", "brand-loading.js"
]);


export default {
  async fetch(request: Request, env: SiteEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.pathname === "/hosp" || url.pathname.startsWith("/hosp/") ||
      url.pathname === "/api/hosp" || url.pathname.startsWith("/api/hosp/")
    ) {
      const response = await handler.fetch(request, env, ctx);
      if (url.pathname === "/hosp" || url.pathname.startsWith("/hosp/")) {
        return withAdminHeaders(response);
      }
      return response;
    }

    const storage = hospStorage(env);
    if (storage && (request.method === "GET" || request.method === "HEAD")) {
      const hosted = await serveHostedSite(request, storage, reservedPaths);
      if (hosted) return hosted;
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return handler.fetch(request, env, ctx);
  }
};

function withAdminHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; " +
    "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
