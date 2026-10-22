import { env } from "cloudflare:workers";

const PREFIX = "projects/";
const SESSION_COOKIE = "girofy_hosp_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const MAX_FILES = 500;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PROJECT_BYTES = 50 * 1024 * 1024;
const MAX_PROJECTS = 50;
const KEEP_VERSIONS = 12;

const RESERVED_SLUGS = new Set([
  "api", "hosp", "assets", "projects", "software-sob-medida", "sistemas-internos",
  "aplicativos-empresariais", "plataformas-digitais", "automacao-integracoes",
  "sites-para-empresas", "guia-escolher-software", "criacao-de-sites-para-empresas",
  "projeto", "favicon", "robots", "sitemap", "llms", "styles", "ads-landing",
  "app", "pages", "config", "brand-boot", "brand-loading", "functions", "docs",
  "node_modules", ".git", ".next", ".vercel", "wrangler", "callback",
  "signin-with-chatgpt", "signout-with-chatgpt"
]);

type VersionSummary = {
  version: string;
  entry: string;
  publishedAt: string;
  fileCount: number;
  totalBytes: number;
};

type ProjectRecord = {
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeVersion: string | null;
  entry: string | null;
  versions: VersionSummary[];
};

type PendingVersion = {
  expectedFiles: number;
  expectedBytes: number;
  expiresAt: number;
};

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const bucket = env.BUCKET;
  if (!bucket) return json({ error: "O armazenamento ainda não está disponível." }, 503);

  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "list";
  if (action === "versions") {
    const slug = cleanSlug(url.searchParams.get("slug") ?? "");
    if (!slug) return json({ error: "Projeto inválido." }, 400);
    const project = await readProject(bucket, slug);
    if (!project) return json({ error: "Projeto não encontrado." }, 404);
    return json({ versions: project.versions ?? [] });
  }

  if (action !== "list") return json({ error: "Ação desconhecida." }, 400);
  const result = await bucket.list({ prefix: PREFIX, delimiter: "/", limit: 1000 });
  const projects: Array<Record<string, unknown>> = [];
  for (const projectPrefix of result.delimitedPrefixes) {
    const slug = projectPrefix.slice(PREFIX.length).replace(/\/$/, "");
    const project = await readProject(bucket, slug);
    if (!project) continue;
    const active = project.activeVersion ? await readActive(bucket, slug) : null;
    projects.push({
      slug: project.slug,
      name: project.name,
      url: "/" + project.slug + "/",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      activeVersion: project.activeVersion,
      entry: project.entry,
      publishedAt: active?.publishedAt ?? null,
      fileCount: active?.fileCount ?? 0,
      totalBytes: active?.totalBytes ?? 0,
      versions: project.versions ?? []
    });
  }
  projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return json({ projects });
}

export async function POST(request: Request): Promise<Response> {
  const originError = checkSameOrigin(request);
  if (originError) return originError;
  try {
    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const denied = await requireAdmin(request);
      if (denied) return denied;
      const bucket = env.BUCKET;
      if (!bucket) return json({ error: "O armazenamento ainda não está disponível." }, 503);
      return await uploadFile(request, bucket);
    }
    const body = await request.json<Record<string, unknown>>();
    if (body.action === "login") return await login(body, request);
    if (body.action === "logout") return logout(request);

    const denied = await requireAdmin(request);
    if (denied) return denied;
    const bucket = env.BUCKET;
    if (!bucket) return json({ error: "O armazenamento ainda não está disponível." }, 503);
    switch (body.action) {
      case "begin": return await beginUpload(body, bucket);
      case "publish": return await publishVersion(body, bucket);
      case "rename": return await renameProject(body, bucket);
      case "restore": return await restoreVersion(body, bucket);
      case "delete": return await deleteProject(body, bucket);
      default: return json({ error: "Ação desconhecida." }, 400);
    }
  } catch (error) {
    console.error("Hospedagem Girofy:", error);
    return json({ error: "Não foi possível concluir esta operação. Tente novamente." }, 500);
  }
}

async function requireAdmin(request: Request): Promise<Response | null> {
  const secret = env.HOSP_ADMIN_PASSWORD;
  if (!secret) {
    return json({ error: "admin_key_not_configured", message: "A chave do painel ainda não foi configurada." }, 503);
  }
  if (!await hasValidSession(request, secret)) {
    return json({ error: "key_required", message: "Informe a chave de acesso do painel." }, 401);
  }
  return null;
}

function checkSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Pedido recusado." }, 403);
  }
  return null;
}

async function login(body: Record<string, unknown>, request: Request): Promise<Response> {
  const secret = env.HOSP_ADMIN_PASSWORD;
  if (!secret) {
    return json({ error: "admin_key_not_configured", message: "A chave do painel ainda não foi configurada." }, 503);
  }
  const submitted = typeof body.key === "string" ? body.key : "";
  if (submitted.length > 256 || !constantTimeEqual(secret, submitted)) {
    return json({ error: "key_invalid", message: "A chave está incorreta." }, 401);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const signature = await signSession(secret, expiresAt);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return json({ ok: true }, 200, {
    "Set-Cookie": `${SESSION_COOKIE}=${expiresAt}.${signature}; Path=/api/hosp; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}${secure}`
  });
}

function logout(request: Request): Response {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return json({ ok: true }, 200, {
    "Set-Cookie": `${SESSION_COOKIE}=; Path=/api/hosp; HttpOnly; SameSite=Strict; Max-Age=0${secure}`
  });
}

async function hasValidSession(request: Request, secret: string): Promise<boolean> {
  const cookie = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(SESSION_COOKIE + "="));
  if (!cookie) return false;
  const token = cookie.slice(SESSION_COOKIE.length + 1);
  const separator = token.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = Number(token.slice(0, separator));
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const signatureBytes = decodeBase64Url(token.slice(separator + 1));
  if (!signatureBytes) return false;
  const signature = new Uint8Array(signatureBytes).buffer;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(sessionMessage(expiresAt)));
}

async function signSession(secret: string, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(sessionMessage(expiresAt))
  );
  return encodeBase64Url(new Uint8Array(signature));
}

function sessionMessage(expiresAt: number): string {
  return "girofy-hosp-session:" + expiresAt;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function constantTimeEqual(expected: string, actual: string): boolean {
  const encoder = new TextEncoder();
  const expectedBytes = encoder.encode(expected);
  const actualBytes = encoder.encode(actual);
  let difference = expectedBytes.length ^ actualBytes.length;
  const length = Math.max(expectedBytes.length, actualBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (expectedBytes[index] ?? 0) ^ (actualBytes[index] ?? 0);
  }
  return difference === 0;
}

async function beginUpload(
  body: Record<string, unknown>,
  bucket: R2Bucket
): Promise<Response> {
  const slug = cleanSlug(stringValue(body.slug));
  const name = cleanName(stringValue(body.name));
  const entry = stringValue(body.entry).trim();
  const expectedFiles = Number(body.fileCount);
  const expectedBytes = Number(body.totalBytes);
  if (!slug || RESERVED_SLUGS.has(slug)) return json({ error: "Esse endereço está reservado ou é inválido." }, 400);
  if (!name) return json({ error: "Dê um nome ao projeto." }, 400);
  if (entry && (!safeFilePath(entry) || !entry.toLowerCase().endsWith(".html"))) {
    return json({ error: "O arquivo de entrada precisa ser uma página HTML válida." }, 400);
  }
  if (!Number.isInteger(expectedFiles) || expectedFiles < 1 || expectedFiles > MAX_FILES) {
    return json({ error: "Envie de 1 a 500 arquivos por publicação." }, 400);
  }
  if (!Number.isFinite(expectedBytes) || expectedBytes < 0 || expectedBytes > MAX_PROJECT_BYTES) {
    return json({ error: "Cada publicação pode ocupar até 50 MB." }, 400);
  }

  let project = await readProject(bucket, slug);
  if (!project) {
    const listing = await bucket.list({ prefix: PREFIX, delimiter: "/", limit: MAX_PROJECTS + 1 });
    if (listing.delimitedPrefixes.length >= MAX_PROJECTS) {
      return json({ error: "O limite deste painel é de 50 projetos." }, 400);
    }
    const now = new Date().toISOString();
    project = {
      slug, name, createdAt: now, updatedAt: now,
      activeVersion: null, entry: null, versions: []
    };
  }

  const version = crypto.randomUUID().replace(/-/g, "");
  const pending: PendingVersion = {
    expectedFiles, expectedBytes, expiresAt: Date.now() + 60 * 60 * 1000
  };
  await bucket.put(versionStateKey(slug, version), JSON.stringify(pending), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  await writeProject(bucket, project);
  return json({ version, maxFileBytes: MAX_FILE_BYTES, maxProjectBytes: MAX_PROJECT_BYTES });
}

async function uploadFile(request: Request, bucket: R2Bucket): Promise<Response> {
  const form = await request.formData();
  const slug = cleanSlug(stringValue(form.get("slug")));
  const version = stringValue(form.get("version"));
  const path = stringValue(form.get("path"));
  const file = form.get("file");
  if (!slug || !validVersion(version) || !safeFilePath(path) || isBlockedPath(path)) {
    return json({ error: "O caminho do arquivo não é permitido." }, 400);
  }
  if (!(file instanceof File)) return json({ error: "Arquivo ausente." }, 400);
  if (file.size > MAX_FILE_BYTES) return json({ error: "Cada arquivo pode ocupar até 10 MB." }, 413);
  const pending = await readPending(bucket, slug, version);
  if (!pending || pending.expiresAt < Date.now()) {
    return json({ error: "Esta publicação expirou. Inicie novamente." }, 409);
  }
  await bucket.put(fileKey(slug, version, path), file.stream(), {
    httpMetadata: { contentType: contentType(path, file.type) }
  });
  return json({ uploaded: true, bytes: file.size });
}

async function publishVersion(
  body: Record<string, unknown>,
  bucket: R2Bucket
): Promise<Response> {
  const slug = cleanSlug(stringValue(body.slug));
  const version = stringValue(body.version);
  const requestedEntry = stringValue(body.entry).trim();
  if (!slug || !validVersion(version)) return json({ error: "Publicação inválida." }, 400);
  let project = await readProject(bucket, slug);
  const pending = await readPending(bucket, slug, version);
  if (!project || !pending || pending.expiresAt < Date.now()) {
    return json({ error: "Esta publicação expirou. Inicie novamente." }, 409);
  }

  const prefix = versionPrefix(slug, version);
  const files: Array<{ path: string; size: number }> = [];
  let cursor: string | undefined;
  let totalBytes = 0;
  do {
    const page = await bucket.list({ prefix, limit: 1000, cursor });
    for (const object of page.objects) {
      const path = object.key.slice(prefix.length);
      if (!path.startsWith("_girofy_")) {
        files.push({ path, size: object.size });
        totalBytes += object.size;
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  if (files.length !== pending.expectedFiles || files.length > MAX_FILES) {
    return json({ error: "Faltam arquivos ou há arquivos repetidos. Tente publicar novamente." }, 422);
  }
  if (totalBytes !== pending.expectedBytes) {
    return json({ error: "O tamanho dos arquivos mudou durante o envio. Tente publicar novamente." }, 422);
  }
  if (totalBytes > MAX_PROJECT_BYTES) {
    return json({ error: "A publicação ultrapassou o limite de 50 MB." }, 413);
  }

  let entry = requestedEntry && safeFilePath(requestedEntry) ? requestedEntry : "";
  if (!entry || !files.some((file) => file.path === entry)) {
    entry = files.find((file) => file.path.toLowerCase() === "index.html")?.path ??
      files.find((file) => file.path.toLowerCase().endsWith(".html"))?.path ?? "";
  }
  if (!entry) {
    entry = "index.html";
    const links = files
      .map((file) => {
        const href = file.path.split("/").map(encodeURIComponent).join("/");
        return "<li><a href=\"" + href + "\">" + escapeHtml(file.path) + "</a><span>" +
          formatBytes(file.size) + "</span></li>";
      })
      .join("");
    const generated = "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" + escapeHtml(project.name) + "</title><style>" +
      "body{font:16px system-ui;margin:0;background:#090909;color:#fff;padding:clamp(24px,7vw,96px)}" +
      "main{max-width:900px;margin:auto}h1{font-size:clamp(36px,8vw,80px);letter-spacing:-.06em}" +
      "li{display:flex;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid #333}" +
      "a{color:#fff}span{color:#999}</style><main><p>GIROFY / ARQUIVOS PUBLICADOS</p><h1>" +
      escapeHtml(project.name) + "</h1><p>Arquivos disponíveis neste projeto:</p><ul>" +
      links + "</ul></main></html>";
    totalBytes += new TextEncoder().encode(generated).length;
    await bucket.put(fileKey(slug, version, entry), generated, {
      httpMetadata: { contentType: "text/html; charset=utf-8" }
    });
  }

  const hasEntry = await bucket.head(fileKey(slug, version, entry));
  if (!hasEntry || !entry.toLowerCase().endsWith(".html")) {
    return json({ error: "Escolha uma página HTML que exista entre os arquivos enviados." }, 422);
  }
  const publishedAt = new Date().toISOString();
  const summary: VersionSummary = {
    version, entry, publishedAt, fileCount: files.length, totalBytes
  };
  const versions = [
    summary,
    ...(project.versions ?? []).filter((item) => item.version !== version)
  ].slice(0, KEEP_VERSIONS);
  project = {
    ...project,
    name: cleanName(stringValue(body.name)) || project.name,
    updatedAt: publishedAt,
    activeVersion: version,
    entry,
    versions
  };

  await bucket.put(prefix + "_girofy_manifest.json", JSON.stringify(summary), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  await writeProject(bucket, project);
  await bucket.put(activeKey(slug), JSON.stringify(summary), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  await bucket.delete(versionStateKey(slug, version));

  const removed = (project.versions ?? []).length >= KEEP_VERSIONS
    ? await collectOldVersions(bucket, slug, versions.map((item) => item.version))
    : [];
  if (removed.length) await deleteKeys(bucket, removed);
  return json({ ok: true, project: publicProject(project, summary) });
}

async function renameProject(body: Record<string, unknown>, bucket: R2Bucket): Promise<Response> {
  const slug = cleanSlug(stringValue(body.slug));
  const name = cleanName(stringValue(body.name));
  if (!slug || !name) return json({ error: "Nome inválido." }, 400);
  const project = await readProject(bucket, slug);
  if (!project) return json({ error: "Projeto não encontrado." }, 404);
  project.name = name;
  project.updatedAt = new Date().toISOString();
  await writeProject(bucket, project);
  return json({ ok: true, name });
}

async function restoreVersion(body: Record<string, unknown>, bucket: R2Bucket): Promise<Response> {
  const slug = cleanSlug(stringValue(body.slug));
  const version = stringValue(body.version);
  if (!slug || !validVersion(version)) return json({ error: "Versão inválida." }, 400);
  const project = await readProject(bucket, slug);
  const selected = project?.versions?.find((item) => item.version === version);
  if (!project || !selected || !(await bucket.head(fileKey(slug, version, selected.entry)))) {
    return json({ error: "Essa versão não está mais disponível." }, 404);
  }
  const publishedAt = new Date().toISOString();
  const active: VersionSummary = { ...selected, publishedAt };
  project.activeVersion = version;
  project.entry = selected.entry;
  project.updatedAt = publishedAt;
  project.versions = [
    selected,
    ...(project.versions ?? []).filter((item) => item.version !== version)
  ].slice(0, KEEP_VERSIONS);
  await writeProject(bucket, project);
  await bucket.put(activeKey(slug), JSON.stringify(active), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  return json({ ok: true, active });
}

async function deleteProject(body: Record<string, unknown>, bucket: R2Bucket): Promise<Response> {
  const slug = cleanSlug(stringValue(body.slug));
  if (!slug) return json({ error: "Projeto inválido." }, 400);
  const keys = await listKeys(bucket, PREFIX + slug + "/");
  await deleteKeys(bucket, keys);
  return json({ ok: true });
}

async function collectOldVersions(
  bucket: R2Bucket,
  slug: string,
  retainedVersions: string[]
): Promise<string[]> {
  const retained = new Set(retainedVersions);
  const versionsPrefix = projectPrefix(slug) + "versions/";
  const all = await listKeys(bucket, versionsPrefix);
  const old = new Set<string>();
  for (const key of all) {
    const rest = key.slice(versionsPrefix.length);
    const version = rest.split("/")[0];
    if (version && !retained.has(version)) old.add(version);
  }
  const keys: string[] = [];
  for (const version of old) keys.push(...await listKeys(bucket, versionPrefix(slug, version)));
  return keys;
}

async function listKeys(bucket: R2Bucket, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, limit: 1000, cursor });
    keys.push(...page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

async function deleteKeys(bucket: R2Bucket, keys: string[]): Promise<void> {
  for (let start = 0; start < keys.length; start += 1000) {
    await bucket.delete(keys.slice(start, start + 1000));
  }
}

async function readProject(bucket: R2Bucket, slug: string): Promise<ProjectRecord | null> {
  const object = await bucket.get(PREFIX + slug + "/project.json");
  if (!object) return null;
  try {
    return await object.json<ProjectRecord>();
  } catch {
    return null;
  }
}

async function readActive(bucket: R2Bucket, slug: string): Promise<VersionSummary | null> {
  const object = await bucket.get(activeKey(slug));
  if (!object) return null;
  try {
    return await object.json<VersionSummary>();
  } catch {
    return null;
  }
}

async function readPending(
  bucket: R2Bucket,
  slug: string,
  version: string
): Promise<PendingVersion | null> {
  const object = await bucket.get(versionStateKey(slug, version));
  if (!object) return null;
  try {
    return await object.json<PendingVersion>();
  } catch {
    return null;
  }
}

async function writeProject(bucket: R2Bucket, project: ProjectRecord): Promise<void> {
  await bucket.put(PREFIX + project.slug + "/project.json", JSON.stringify(project), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
}

function publicProject(project: ProjectRecord, active: VersionSummary): Record<string, unknown> {
  return {
    slug: project.slug, name: project.name, url: "/" + project.slug + "/",
    activeVersion: active.version, entry: active.entry, publishedAt: active.publishedAt,
    fileCount: active.fileCount, totalBytes: active.totalBytes, versions: project.versions
  };
}

function cleanSlug(value: string): string {
  const slug = value.toLowerCase().trim();
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) ? slug : "";
}

function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
}

function safeFilePath(value: string): boolean {
  if (!value || value.length > 1024 || value.startsWith("/") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return false;
  }
  return value.split("/").every((part) =>
    Boolean(part) && part !== "." && part !== ".." && !part.includes(":") &&
    !part.startsWith("_girofy_")
  );
}

function isBlockedPath(path: string): boolean {
  const parts = path.toLowerCase().split("/");
  const file = parts.at(-1) ?? "";
  return parts.some((part) => part.startsWith(".") || part.startsWith("_girofy_") ||
    part === ".git" || part === ".next" || part === "node_modules" ||
    part === ".vercel" || part === ".wrangler" || part === ".ssh"
  ) || file === ".npmrc" || file === ".netrc" || file === ".env" ||
    file.startsWith(".env.") || file.endsWith(".pem") || file.endsWith(".key") ||
    file.endsWith(".p12") || file.endsWith(".pfx");
}

function contentType(path: string, supplied: string): string {
  if (supplied && supplied !== "application/octet-stream") return supplied;
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  const known: Record<string, string> = {
    ".avif": "image/avif", ".css": "text/css; charset=utf-8", ".gif": "image/gif",
    ".html": "text/html; charset=utf-8", ".ico": "image/x-icon", ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".m4a": "audio/mp4", ".mp3": "audio/mpeg",
    ".mp4": "video/mp4", ".ogg": "audio/ogg", ".otf": "font/otf",
    ".pdf": "application/pdf", ".png": "image/png", ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8", ".wasm": "application/wasm",
    ".ttf": "font/ttf", ".wav": "audio/wav", ".webmanifest": "application/manifest+json",
    ".webm": "video/webm", ".webp": "image/webp", ".woff": "font/woff",
    ".woff2": "font/woff2", ".xml": "application/xml; charset=utf-8"
  };
  return known[extension] ?? "application/octet-stream";
}

function validVersion(value: string): boolean {
  return /^[a-f0-9]{32}$/i.test(value);
}

function projectPrefix(slug: string): string { return PREFIX + slug + "/"; }
function versionPrefix(slug: string, version: string): string {
  return projectPrefix(slug) + "versions/" + version + "/";
}
function fileKey(slug: string, version: string, path: string): string {
  return versionPrefix(slug, version) + path;
}
function activeKey(slug: string): string { return projectPrefix(slug) + "active.json"; }
function versionStateKey(slug: string, version: string): string {
  return versionPrefix(slug, version) + "_girofy_pending.json";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatBytes(value: number): string {
  return value < 1024 * 1024 ? Math.max(1, Math.round(value / 1024)) + " KB" :
    (value / (1024 * 1024)).toFixed(1) + " MB";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
  })[character] ?? character);
}

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  });
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}
