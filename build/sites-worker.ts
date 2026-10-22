import handler from "vinext/server/fetch-handler";

type SiteEnv = Cloudflare.Env & {
  ASSETS?: Fetcher;
  BUCKET?: R2Bucket;
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

const mimeTypes: Record<string, string> = {
  ".avif": "image/avif", ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8", ".gif": "image/gif",
  ".html": "text/html; charset=utf-8", ".ico": "image/x-icon",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".otf": "font/otf",
  ".json": "application/json; charset=utf-8", ".map": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".m4a": "audio/mp4",
  ".ogg": "audio/ogg", ".pdf": "application/pdf",
  ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8",
  ".ttf": "font/ttf", ".wasm": "application/wasm", ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json", ".webm": "video/webm", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".xml": "application/xml; charset=utf-8"
};

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

    if (env.BUCKET && request.method === "GET" && request.headers.get("range")) {
      const hosted = await serveHostedSite(request, env.BUCKET);
      if (hosted) return hosted;
    } else if (env.BUCKET && (request.method === "GET" || request.method === "HEAD")) {
      const hosted = await serveHostedSite(request, env.BUCKET);
      if (hosted) return hosted;
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return handler.fetch(request, env, ctx);
  }
};

async function serveHostedSite(request: Request, bucket: R2Bucket): Promise<Response | null> {
  const url = new URL(request.url);
  let parts: string[];
  try {
    parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return new Response("Bad path", { status: 400 });
  }
  const slug = (parts[0] ?? "").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) || reservedPaths.has(slug)) {
    return null;
  }

  const activeObject = await bucket.get("projects/" + slug + "/active.json");
  if (!activeObject) return null;
  const active = await activeObject.json<ActiveVersion>();
  if (!active || !/^[a-f0-9-]{12,64}$/i.test(active.version) || !safePath(active.entry)) {
    return new Response("Project unavailable", { status: 503 });
  }

  if (parts.length === 1 && !url.pathname.endsWith("/")) {
    return Response.redirect(new URL(url.pathname + "/" + url.search, url.origin), 308);
  }

  let filePath = parts.slice(1).join("/");
  if (!filePath || filePath.endsWith("/")) filePath += "index.html";
  if (!safePath(filePath)) return new Response("Not found", { status: 404 });

  const versionPrefix = "projects/" + slug + "/versions/" + active.version + "/";
  let object = await bucket.get(versionPrefix + filePath);
  const isSiteRoot = parts.length === 1;
  if (!object && (isSiteRoot || (!hasFileExtension(filePath) && acceptsHtml(request)))) {
    filePath = active.entry;
    object = await bucket.get(versionPrefix + filePath);
  }
  if (!object) return new Response("Not found", { status: 404 });

  const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const contentType = object.httpMetadata?.contentType || mimeTypes[extension] || "application/octet-stream";
  const headers = new Headers({
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
    "Cache-Control": contentType.startsWith("text/html") ? "no-store" : "public, max-age=300"
  });
  if (contentType.startsWith("text/html") || contentType === "image/svg+xml") {
    headers.set(
      "Content-Security-Policy",
      "sandbox allow-scripts allow-forms allow-popups allow-downloads allow-modals; " +
      "default-src * data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; " +
      "style-src * 'unsafe-inline' blob:; img-src * data: blob:; font-src * data: blob:; " +
      "media-src * blob:; connect-src *; object-src 'none'; base-uri *; form-action *; frame-ancestors 'none'"
    );
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (contentType.startsWith("text/html")) {
      if (request.method === "HEAD") return new Response(null, { headers });
      const html = await object.text();
      return new Response(scopeRootPaths(html, slug), { headers });
    }
  }
  if (request.method === "HEAD") return new Response(null, { headers });
  if (contentType.startsWith("text/css") || extension === ".css") {
    return new Response(scopeCssPaths(await object.text(), slug), { headers });
  }
  if (contentType.includes("javascript") || extension === ".js" || extension === ".mjs") {
    return new Response(scopeJavascriptAssetPaths(await object.text(), slug), { headers });
  }
  return new Response(object.body, { headers });
}

type ActiveVersion = {
  version: string;
  entry: string;
  publishedAt: string;
  fileCount: number;
  totalBytes: number;
};

function safePath(value: string): boolean {
  if (!value || value.length > 1024 || value.startsWith("/") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return false;
  }
  return value.split("/").every((part) =>
    part !== "" && part !== "." && part !== ".." && !part.startsWith("_girofy_")
  );
}

function hasFileExtension(path: string): boolean {
  return /\.[a-z0-9]{1,12}$/i.test(path.split("/").pop() ?? "");
}

function acceptsHtml(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

function scopeRootPaths(html: string, slug: string): string {
  const prefix = "/" + slug + "/";
  let output = html.replace(
    /(\b(?:srcset|imagesrcset)\s*=\s*)(["'])(.*?)\2/gi,
    (_match, attribute: string, quote: string, value: string) =>
      attribute + quote + scopeSrcset(value, prefix) + quote
  );
  output = output.replace(
    /(\b(?:href|src|action|poster|background|data-src|data-lazy-src)\s*=\s*["'])\/(?!\/)/gi,
    "$1" + prefix
  );
  output = scopeCssPaths(output, slug);
  if (!/<base\b/i.test(output)) {
    output = output.replace(/<head\b[^>]*>/i, (head) => head + '<base href="' + prefix + '">');
  }
  return output;
}

function scopeSrcset(value: string, prefix: string): string {
  return value.replace(/(^|[\s,])\/(?!\/)/g, (_match, before: string) => before + prefix);
}

function scopeCssPaths(css: string, slug: string): string {
  const prefix = "/" + slug + "/";
  let output = css.replace(
    /(url\(\s*["']?)\/(?!\/)/gi,
    "$1" + prefix
  );
  output = output.replace(
    /(@import\s+(?:url\(\s*)?["']?)\/(?!\/)/gi,
    "$1" + prefix
  );
  return output;
}

function scopeJavascriptAssetPaths(source: string, slug: string): string {
  const prefix = "/" + slug + "/";
  return source.replace(
    /(["'`])(\/(?:_next\/static|assets|images|img|fonts|media|static)\/[^"'`\r\n]*)\1/g,
    (_match, quote: string, path: string) => quote + prefix + path.slice(1) + quote
  );
}

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
