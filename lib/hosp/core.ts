// Núcleo da hospedagem Girofy. Painel, API REST e MCP usam as mesmas funções.
// Estrutura no R2:
//   projects/{slug}/project.json            registro do projeto
//   projects/{slug}/active.json             versão ativa + configurações (lido a cada visita)
//   projects/{slug}/versions/{versão}/...   arquivos de cada versão
//   aliases/{apelido}.json                  endereço antigo que redireciona para um projeto
//   _system/tokens/{id}.json                tokens de API (só o hash)
//   _system/audit/{tempo}-{id}.json         registro de atividade

import { unzipSync } from "fflate";
import type { Actor } from "./auth";
import { HospError } from "./errors";
import {
  DEFAULT_SETTINGS, SettingsError, applySettingsPatch, normalizeSettings,
  type ProjectSettings
} from "./settings";

export const PREFIX = "projects/";
const ALIAS_PREFIX = "aliases/";
const AUDIT_PREFIX = "_system/audit/";
const INDEX_KEY = "_system/projects-index.json";

export const LIMITS = {
  maxFiles: 500,
  maxFileBytes: 10 * 1024 * 1024,
  maxProjectBytes: 50 * 1024 * 1024,
  maxProjects: 50,
  keepVersions: 12,
  maxPinned: 5,
  maxAliases: 10,
  // Cada arquivo é uma gravação no armazenamento dentro de uma única chamada, e uma publicação
  // gasta mais ~15 operações de controle. Mantemos o lote pequeno para caber no limite de
  // subrequisições de um Worker no plano grátis (50). Para sites maiores, envie em lotes
  // (begin → upload_files várias vezes → publish).
  maxBatchFiles: 30,
  maxBatchBytes: 8 * 1024 * 1024,
  maxNoteChars: 200,
  maxReadBytes: 200 * 1024
} as const;

export const RESERVED_SLUGS = new Set([
  "api", "hosp", "assets", "projects", "software-sob-medida", "sistemas-internos",
  "aplicativos-empresariais", "plataformas-digitais", "automacao-integracoes",
  "sites-para-empresas", "guia-escolher-software", "criacao-de-sites-para-empresas",
  "projeto", "favicon", "robots", "sitemap", "llms", "styles", "ads-landing",
  "app", "pages", "config", "brand-boot", "brand-loading", "functions", "docs",
  "node_modules", ".git", ".next", ".vercel", "wrangler", "callback",
  "signin-with-chatgpt", "signout-with-chatgpt", "aliases", "mcp"
]);

export type VersionSummary = {
  version: string;
  entry: string;
  publishedAt: string;
  fileCount: number;
  totalBytes: number;
  /** Mensagem curta que descreve a mudança. */
  note?: string;
  /** Quem publicou: "painel" ou "api:{nome do token}". */
  source?: string;
};

export type ProjectRecord = {
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeVersion: string | null;
  entry: string | null;
  versions: VersionSummary[];
  /** Quando a versão atual entrou no ar (publicação ou restauração). */
  activatedAt?: string;
  pinned?: string[];
  aliases?: string[];
  settings?: ProjectSettings;
};

type ActiveRecord = VersionSummary & { settings?: ProjectSettings };

type PendingVersion = {
  expectedFiles: number | null;
  expectedBytes: number | null;
  expiresAt: number;
};

export type IncomingFile = {
  path: string;
  text?: string;
  base64?: string;
  contentType?: string;
};

type DecodedFile = { path: string; bytes: Uint8Array; contentType: string };

// ---------- leitura ----------

export async function listProjects(bucket: R2Bucket): Promise<Array<Record<string, unknown>>> {
  const projects: Array<Record<string, unknown>> = [];
  for (const slug of await projectSlugs(bucket)) {
    const project = await readProject(bucket, slug);
    if (!project) continue;
    const active = project.versions?.find((item) => item.version === project.activeVersion) ?? null;
    projects.push({
      slug: project.slug,
      name: project.name,
      url: "/" + project.slug + "/",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      activeVersion: project.activeVersion,
      entry: project.entry,
      publishedAt: project.activatedAt ?? active?.publishedAt ?? null,
      fileCount: active?.fileCount ?? 0,
      totalBytes: active?.totalBytes ?? 0,
      note: active?.note ?? null,
      pinned: project.pinned ?? [],
      aliases: project.aliases ?? [],
      settings: normalizeSettings(project.settings),
      versions: project.versions ?? []
    });
  }
  projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return projects;
}

export async function getProject(bucket: R2Bucket, slugInput: string): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  const project = await requireProject(bucket, slug);
  const active = project.versions?.find((item) => item.version === project.activeVersion) ?? null;
  return {
    slug: project.slug,
    name: project.name,
    url: "/" + project.slug + "/",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    activeVersion: project.activeVersion,
    entry: project.entry,
    publishedAt: project.activatedAt ?? active?.publishedAt ?? null,
    fileCount: active?.fileCount ?? 0,
    totalBytes: active?.totalBytes ?? 0,
    pinned: project.pinned ?? [],
    aliases: project.aliases ?? [],
    settings: normalizeSettings(project.settings),
    versions: (project.versions ?? []).map((item) => ({
      ...item,
      active: item.version === project.activeVersion,
      pinned: (project.pinned ?? []).includes(item.version),
      previewPath: previewPath(slug, item.version)
    }))
  };
}

export async function listVersions(bucket: R2Bucket, slugInput: string): Promise<VersionSummary[]> {
  const slug = requireSlug(slugInput);
  return (await requireProject(bucket, slug)).versions ?? [];
}

export async function listFiles(
  bucket: R2Bucket,
  slugInput: string,
  versionInput?: string
): Promise<{ version: string; files: Array<{ path: string; size: number }>; truncated: boolean }> {
  const slug = requireSlug(slugInput);
  const project = await requireProject(bucket, slug);
  const version = versionInput || project.activeVersion || "";
  if (!validVersion(version)) throw new HospError(404, "Este projeto ainda não tem versão publicada.");
  const prefix = versionPrefix(slug, version);
  const files: Array<{ path: string; size: number }> = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, limit: 1000, cursor });
    for (const object of page.objects) {
      const path = object.key.slice(prefix.length);
      if (!path.startsWith("_girofy_")) files.push({ path, size: object.size });
    }
    cursor = page.truncated && files.length < LIMITS.maxFiles ? page.cursor : undefined;
  } while (cursor);
  return { version, files: files.slice(0, LIMITS.maxFiles), truncated: files.length > LIMITS.maxFiles };
}

export async function readFile(
  bucket: R2Bucket,
  slugInput: string,
  path: string,
  versionInput?: string
): Promise<{ path: string; size: number; contentType: string; content: string }> {
  const slug = requireSlug(slugInput);
  const project = await requireProject(bucket, slug);
  const version = versionInput || project.activeVersion || "";
  if (!validVersion(version)) throw new HospError(404, "Este projeto ainda não tem versão publicada.");
  if (!safeFilePath(path)) throw new HospError(400, "Caminho de arquivo inválido.");
  const object = await bucket.get(fileKey(slug, version, path));
  if (!object) throw new HospError(404, "Arquivo não encontrado.");
  const type = object.httpMetadata?.contentType || contentType(path, "");
  if (!isTextType(type)) {
    throw new HospError(415, "Só é possível ler arquivos de texto (HTML, CSS, JS, JSON, SVG, TXT).");
  }
  if (object.size > LIMITS.maxReadBytes) {
    throw new HospError(413, "Arquivo grande demais para leitura (limite de 200 KB).");
  }
  return { path, size: object.size, contentType: type, content: await object.text() };
}

export async function usage(bucket: R2Bucket): Promise<Record<string, unknown>> {
  const projects = await listProjects(bucket);
  let storedBytes = 0;
  let storedVersions = 0;
  const perProject = projects.map((project) => {
    const versions = (project.versions as VersionSummary[]) ?? [];
    const bytes = versions.reduce((sum, version) => sum + version.totalBytes, 0);
    storedBytes += bytes;
    storedVersions += versions.length;
    return {
      slug: project.slug, name: project.name, versions: versions.length,
      storedBytes: bytes, activeBytes: project.totalBytes
    };
  });
  return {
    projects: projects.length,
    projectsRemaining: Math.max(0, LIMITS.maxProjects - projects.length),
    storedVersions,
    storedBytes,
    limits: {
      maxProjects: LIMITS.maxProjects,
      maxFilesPerPublication: LIMITS.maxFiles,
      maxFileBytes: LIMITS.maxFileBytes,
      maxPublicationBytes: LIMITS.maxProjectBytes,
      versionsKept: LIMITS.keepVersions,
      pinnedVersionsPerProject: LIMITS.maxPinned,
      aliasesPerProject: LIMITS.maxAliases,
      filesPerBatchCall: LIMITS.maxBatchFiles,
      bytesPerBatchCall: LIMITS.maxBatchBytes
    },
    perProject,
    note: "storedBytes soma as versões guardadas de cada projeto. A cota real depende do plano do R2."
  };
}

// ---------- publicação ----------

export async function beginDeploy(
  bucket: R2Bucket,
  input: { slug: string; name?: string; entry?: string; fileCount?: unknown; totalBytes?: unknown }
): Promise<{ version: string; maxFileBytes: number; maxProjectBytes: number; maxBatchFiles: number }> {
  const slug = cleanSlug(input.slug);
  const entry = (input.entry ?? "").trim();
  if (!slug || RESERVED_SLUGS.has(slug)) throw new HospError(400, "Esse endereço está reservado ou é inválido.");
  if (entry && (!safeFilePath(entry) || !entry.toLowerCase().endsWith(".html"))) {
    throw new HospError(400, "O arquivo de entrada precisa ser uma página HTML válida.");
  }
  const hasCounts = input.fileCount !== undefined || input.totalBytes !== undefined;
  let expectedFiles: number | null = null;
  let expectedBytes: number | null = null;
  if (hasCounts) {
    expectedFiles = Number(input.fileCount);
    expectedBytes = Number(input.totalBytes);
    if (!Number.isInteger(expectedFiles) || expectedFiles < 1 || expectedFiles > LIMITS.maxFiles) {
      throw new HospError(400, "Envie de 1 a 500 arquivos por publicação.");
    }
    if (!Number.isFinite(expectedBytes) || expectedBytes < 0 || expectedBytes > LIMITS.maxProjectBytes) {
      throw new HospError(400, "Cada publicação pode ocupar até 50 MB.");
    }
  }

  let project = await readProject(bucket, slug);
  const name = cleanName(input.name ?? "") || project?.name || slug;
  if (!project) {
    if (await bucket.head(aliasKey(slug))) {
      throw new HospError(409, "Esse endereço é um apelido de outro projeto. Remova o apelido antes de usá-lo.");
    }
    const slugs = await projectSlugs(bucket);
    if (slugs.length >= LIMITS.maxProjects) {
      throw new HospError(400, "O limite deste painel é de 50 projetos.");
    }
    const now = new Date().toISOString();
    project = { slug, name, createdAt: now, updatedAt: now, activeVersion: null, entry: null, versions: [] };
    await writeProject(bucket, project);
    await writeIndex(bucket, [...slugs.filter((item) => item !== slug), slug]);
  }

  const version = crypto.randomUUID().replace(/-/g, "");
  const pending: PendingVersion = { expectedFiles, expectedBytes, expiresAt: Date.now() + 60 * 60 * 1000 };
  await bucket.put(versionStateKey(slug, version), JSON.stringify(pending), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  return {
    version,
    maxFileBytes: LIMITS.maxFileBytes,
    maxProjectBytes: LIMITS.maxProjectBytes,
    maxBatchFiles: LIMITS.maxBatchFiles
  };
}

/** Envio de um arquivo por multipart (painel e curl). */
export async function storeUploadedFile(
  bucket: R2Bucket,
  input: { slug: string; version: string; path: string; file: File }
): Promise<{ uploaded: true; bytes: number }> {
  const slug = cleanSlug(input.slug);
  if (!slug || !validVersion(input.version) || !safeFilePath(input.path) || isBlockedPath(input.path)) {
    throw new HospError(400, "O caminho do arquivo não é permitido.");
  }
  if (input.file.size > LIMITS.maxFileBytes) throw new HospError(413, "Cada arquivo pode ocupar até 10 MB.");
  await requirePending(bucket, slug, input.version);
  await bucket.put(fileKey(slug, input.version, input.path), input.file.stream(), {
    httpMetadata: { contentType: contentType(input.path, input.file.type) }
  });
  return { uploaded: true, bytes: input.file.size };
}

/** Envio de um lote de arquivos em JSON (texto ou base64), pensado para agentes. */
export async function uploadFiles(
  bucket: R2Bucket,
  input: { slug: string; version: string; files: unknown }
): Promise<{ uploaded: number; bytes: number }> {
  const slug = cleanSlug(input.slug);
  if (!slug || !validVersion(input.version)) throw new HospError(400, "Publicação inválida.");
  await requirePending(bucket, slug, input.version);
  const decoded = decodeFiles(input.files);
  for (const file of decoded) {
    await bucket.put(fileKey(slug, input.version, file.path), file.bytes, {
      httpMetadata: { contentType: file.contentType }
    });
  }
  return { uploaded: decoded.length, bytes: decoded.reduce((sum, file) => sum + file.bytes.byteLength, 0) };
}

export async function publishVersion(
  bucket: R2Bucket,
  input: { slug: string; version: string; entry?: string; name?: string; note?: string; activate?: boolean },
  actor: Actor
): Promise<Record<string, unknown>> {
  const slug = cleanSlug(input.slug);
  const version = input.version;
  if (!slug || !validVersion(version)) throw new HospError(400, "Publicação inválida.");
  const activate = input.activate !== false;
  const requestedEntry = (input.entry ?? "").trim();
  let project = await readProject(bucket, slug);
  const pending = await readPending(bucket, slug, version);
  if (!project || !pending || pending.expiresAt < Date.now()) {
    throw new HospError(409, "Esta publicação expirou. Inicie novamente.");
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

  if (files.length === 0 || files.length > LIMITS.maxFiles ||
    (pending.expectedFiles !== null && files.length !== pending.expectedFiles)) {
    throw new HospError(422, "Faltam arquivos ou há arquivos repetidos. Tente publicar novamente.");
  }
  if (pending.expectedBytes !== null && totalBytes !== pending.expectedBytes) {
    throw new HospError(422, "O tamanho dos arquivos mudou durante o envio. Tente publicar novamente.");
  }
  if (totalBytes > LIMITS.maxProjectBytes) {
    throw new HospError(413, "A publicação ultrapassou o limite de 50 MB.");
  }

  let entry = requestedEntry && safeFilePath(requestedEntry) ? requestedEntry : "";
  if (!entry || !files.some((file) => file.path === entry)) {
    entry = files.find((file) => file.path.toLowerCase() === "index.html")?.path ??
      files.find((file) => file.path.toLowerCase().endsWith(".html"))?.path ?? "";
  }
  if (!entry) {
    entry = "index.html";
    const generated = filesIndexPage(project.name, files);
    totalBytes += new TextEncoder().encode(generated).length;
    await bucket.put(fileKey(slug, version, entry), generated, {
      httpMetadata: { contentType: "text/html; charset=utf-8" }
    });
  }

  const hasEntry = await bucket.head(fileKey(slug, version, entry));
  if (!hasEntry || !entry.toLowerCase().endsWith(".html")) {
    throw new HospError(422, "Escolha uma página HTML que exista entre os arquivos enviados.");
  }

  const publishedAt = new Date().toISOString();
  const note = cleanNote(input.note ?? "");
  const summary: VersionSummary = {
    version, entry, publishedAt, fileCount: files.length, totalBytes,
    ...(note ? { note } : {}),
    source: sourceOf(actor)
  };
  const previous = project.versions ?? [];
  const versions = rotateVersions(
    [summary, ...previous.filter((item) => item.version !== version)],
    new Set(project.pinned ?? []),
    activate ? version : project.activeVersion
  );
  const name = cleanName(input.name ?? "") || project.name;
  project = {
    ...project,
    name,
    updatedAt: publishedAt,
    activeVersion: activate ? version : project.activeVersion,
    entry: activate ? entry : project.entry,
    activatedAt: activate ? publishedAt : project.activatedAt,
    versions
  };

  await bucket.put(prefix + "_girofy_manifest.json", JSON.stringify(summary), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  await writeProject(bucket, project);
  if (activate) await writeActive(bucket, slug, summary, project.settings);
  await bucket.delete(versionStateKey(slug, version));

  const dropped = previous.length + 1 > versions.length;
  const removed = dropped || previous.length >= LIMITS.keepVersions
    ? await collectOldVersions(bucket, slug, versions.map((item) => item.version))
    : [];
  if (removed.length) await deleteKeys(bucket, removed);

  return {
    ok: true,
    activated: activate,
    previewPath: previewPath(slug, version),
    project: publicProject(project, activate ? summary : null)
  };
}

/** Atalho para agentes: começa, envia e publica numa só chamada (até um lote de arquivos). */
export async function deployFiles(
  bucket: R2Bucket,
  input: {
    slug: string; name?: string; entry?: string; note?: string; activate?: boolean; files: unknown;
  },
  actor: Actor
): Promise<Record<string, unknown>> {
  return deployDecoded(bucket, input, decodeFiles(input.files), actor);
}

/** Publica o conteúdo de um ZIP vindo de uma URL https ou de base64. */
export async function deployZip(
  bucket: R2Bucket,
  input: {
    slug: string; name?: string; entry?: string; note?: string; activate?: boolean;
    zipUrl?: string; zipBase64?: string; root?: string;
  },
  actor: Actor
): Promise<Record<string, unknown>> {
  let bytes: Uint8Array;
  if (input.zipUrl) bytes = await fetchZip(input.zipUrl);
  else if (input.zipBase64) bytes = decodeBase64(input.zipBase64);
  else throw new HospError(400, "Informe zipUrl (https) ou zipBase64.");

  let acceptedBytes = 0;
  let acceptedCount = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter: (item) => {
        if (item.name.endsWith("/")) return false;
        if (item.originalSize > LIMITS.maxFileBytes) {
          throw new HospError(413, "O arquivo " + item.name + " passa de 10 MB.");
        }
        acceptedBytes += item.originalSize;
        acceptedCount += 1;
        if (acceptedBytes > LIMITS.maxProjectBytes) {
          throw new HospError(413, "O conteúdo do ZIP passa de 50 MB.");
        }
        if (acceptedCount > LIMITS.maxFiles) throw new HospError(413, "O ZIP tem arquivos demais.");
        return true;
      }
    });
  } catch (error) {
    if (error instanceof HospError) throw error;
    throw new HospError(400, "Não foi possível ler o ZIP. Confira se o arquivo está íntegro.");
  }

  let names = Object.keys(entries).map((name) => name.replace(/\\/g, "/"));
  const byName = new Map(Object.entries(entries).map(([name, data]) => [name.replace(/\\/g, "/"), data]));
  names = names.filter((name) => !name.startsWith("__MACOSX/") && !name.endsWith(".DS_Store"));

  const root = (input.root ?? "").replace(/^\/+|\/+$/g, "");
  let strip = "";
  if (root) {
    strip = root + "/";
    if (!names.some((name) => name.startsWith(strip))) {
      throw new HospError(400, "A pasta '" + root + "' não existe no ZIP.");
    }
  } else {
    const tops = new Set(names.map((name) => name.split("/")[0]));
    const single = tops.size === 1 ? [...tops][0] : "";
    if (single && names.every((name) => name.includes("/"))) strip = single + "/";
  }

  const decoded: DecodedFile[] = [];
  const skipped: string[] = [];
  for (const name of names) {
    if (strip && !name.startsWith(strip)) continue;
    const path = strip ? name.slice(strip.length) : name;
    if (!path) continue;
    if (!safeFilePath(path) || isBlockedPath(path)) {
      skipped.push(name);
      continue;
    }
    decoded.push({ path, bytes: byName.get(name) as Uint8Array, contentType: contentType(path, "") });
  }
  if (!decoded.length) throw new HospError(400, "O ZIP não tem arquivos publicáveis.");
  const result = await deployDecoded(bucket, input, decoded, actor);
  return skipped.length ? { ...result, skipped: skipped.slice(0, 50) } : result;
}

async function deployDecoded(
  bucket: R2Bucket,
  input: { slug: string; name?: string; entry?: string; note?: string; activate?: boolean },
  decoded: DecodedFile[],
  actor: Actor
): Promise<Record<string, unknown>> {
  if (decoded.length > LIMITS.maxBatchFiles) {
    throw new HospError(
      413,
      "Esta chamada aceita até " + LIMITS.maxBatchFiles + " arquivos. Para sites maiores, use " +
      "begin, upload_files em lotes e publish."
    );
  }
  const totalBytes = decoded.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  const begun = await beginDeploy(bucket, {
    slug: input.slug, name: input.name, entry: input.entry,
    fileCount: decoded.length, totalBytes
  });
  const slug = cleanSlug(input.slug);
  for (const file of decoded) {
    await bucket.put(fileKey(slug, begun.version, file.path), file.bytes, {
      httpMetadata: { contentType: file.contentType }
    });
  }
  return publishVersion(bucket, {
    slug, version: begun.version, entry: input.entry, name: input.name,
    note: input.note, activate: input.activate
  }, actor);
}

// ---------- versões ----------

export async function activateVersion(
  bucket: R2Bucket,
  slugInput: string,
  version: string
): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  if (!validVersion(version)) throw new HospError(400, "Versão inválida.");
  const project = await requireProject(bucket, slug);
  const selected = project.versions?.find((item) => item.version === version);
  if (!selected || !(await bucket.head(fileKey(slug, version, selected.entry)))) {
    throw new HospError(404, "Essa versão não está mais disponível.");
  }
  const publishedAt = new Date().toISOString();
  const active: VersionSummary = { ...selected, publishedAt };
  project.activeVersion = version;
  project.entry = selected.entry;
  project.updatedAt = publishedAt;
  project.activatedAt = publishedAt;
  project.versions = [
    selected,
    ...(project.versions ?? []).filter((item) => item.version !== version)
  ];
  await writeProject(bucket, project);
  await writeActive(bucket, slug, active, project.settings);
  return { ok: true, active };
}

export async function rollback(bucket: R2Bucket, slugInput: string): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  const project = await requireProject(bucket, slug);
  const previous = (project.versions ?? []).find((item) => item.version !== project.activeVersion);
  if (!previous) throw new HospError(409, "Não há versão anterior para voltar.");
  const result = await activateVersion(bucket, slug, previous.version);
  return { ...result, rolledBackTo: previous.version };
}

export async function pinVersion(
  bucket: R2Bucket,
  slugInput: string,
  version: string,
  pinned: boolean
): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  if (!validVersion(version)) throw new HospError(400, "Versão inválida.");
  const project = await requireProject(bucket, slug);
  if (!project.versions?.some((item) => item.version === version)) {
    throw new HospError(404, "Essa versão não existe neste projeto.");
  }
  const set = new Set(project.pinned ?? []);
  if (pinned) {
    if (!set.has(version) && set.size >= LIMITS.maxPinned) {
      throw new HospError(400, "Cada projeto pode fixar até " + LIMITS.maxPinned + " versões.");
    }
    set.add(version);
  } else {
    set.delete(version);
  }
  project.pinned = [...set];
  await writeProject(bucket, project);
  return { ok: true, pinned: project.pinned };
}

// ---------- configurações e apelidos ----------

export async function updateSettings(
  bucket: R2Bucket,
  slugInput: string,
  patch: unknown
): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new HospError(400, "Envie um objeto com as configurações que quer mudar.");
  }
  const project = await requireProject(bucket, slug);
  let settings: ProjectSettings;
  try {
    settings = applySettingsPatch(normalizeSettings(project.settings), patch as Record<string, unknown>);
  } catch (error) {
    if (error instanceof SettingsError) throw new HospError(400, error.message);
    throw error;
  }
  project.settings = settings;
  project.updatedAt = new Date().toISOString();
  await writeProject(bucket, project);

  const warnings: string[] = [];
  if (project.activeVersion) {
    const active = await readActive(bucket, slug);
    if (active) await writeActive(bucket, slug, active, settings);
    if (settings.notFound && !(await bucket.head(fileKey(slug, project.activeVersion, settings.notFound)))) {
      warnings.push("O arquivo '" + settings.notFound + "' não existe na versão ativa.");
    }
  }
  return { ok: true, settings, ...(warnings.length ? { warnings } : {}) };
}

export async function addAlias(bucket: R2Bucket, slugInput: string, aliasInput: string): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  const alias = cleanSlug(aliasInput);
  if (!alias || RESERVED_SLUGS.has(alias)) throw new HospError(400, "Esse apelido está reservado ou é inválido.");
  if (alias === slug) throw new HospError(400, "O apelido precisa ser diferente do endereço do projeto.");
  const project = await requireProject(bucket, slug);
  if ((project.aliases ?? []).length >= LIMITS.maxAliases) {
    throw new HospError(400, "Cada projeto pode ter até " + LIMITS.maxAliases + " apelidos.");
  }
  if (await bucket.head(PREFIX + alias + "/project.json")) {
    throw new HospError(409, "Já existe um projeto com esse endereço.");
  }
  if (await bucket.head(aliasKey(alias))) throw new HospError(409, "Esse apelido já está em uso.");
  await bucket.put(aliasKey(alias), JSON.stringify({ slug, createdAt: new Date().toISOString() }), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  project.aliases = [...(project.aliases ?? []), alias];
  await writeProject(bucket, project);
  return { ok: true, aliases: project.aliases };
}

export async function removeAlias(bucket: R2Bucket, slugInput: string, aliasInput: string): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  const alias = cleanSlug(aliasInput);
  const project = await requireProject(bucket, slug);
  if (!alias || !(project.aliases ?? []).includes(alias)) {
    throw new HospError(404, "Esse apelido não pertence a este projeto.");
  }
  await bucket.delete(aliasKey(alias));
  project.aliases = (project.aliases ?? []).filter((item) => item !== alias);
  await writeProject(bucket, project);
  return { ok: true, aliases: project.aliases };
}

export async function renameProject(bucket: R2Bucket, slugInput: string, nameInput: string): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  const name = cleanName(nameInput);
  if (!name) throw new HospError(400, "Nome inválido.");
  const project = await requireProject(bucket, slug);
  project.name = name;
  project.updatedAt = new Date().toISOString();
  await writeProject(bucket, project);
  return { ok: true, name };
}

export async function deleteProject(bucket: R2Bucket, slugInput: string): Promise<Record<string, unknown>> {
  const slug = requireSlug(slugInput);
  const project = await readProject(bucket, slug);
  const keys = await listKeys(bucket, PREFIX + slug + "/");
  if (!project && !keys.length) throw new HospError(404, "Projeto não encontrado.");
  for (const alias of project?.aliases ?? []) keys.push(aliasKey(alias));
  await deleteKeys(bucket, keys);
  const slugs = await projectSlugs(bucket);
  if (slugs.includes(slug)) await writeIndex(bucket, slugs.filter((item) => item !== slug));
  return { ok: true };
}

// ---------- registro de atividade ----------

export async function logActivity(
  bucket: R2Bucket,
  actor: Actor,
  action: string,
  slug?: string,
  detail?: string
): Promise<void> {
  try {
    const stamp = String(Date.now()).padStart(13, "0");
    const id = crypto.randomUUID().slice(0, 8);
    await bucket.put(AUDIT_PREFIX + stamp + "-" + id + ".json", JSON.stringify({
      at: new Date().toISOString(), by: sourceOf(actor), action,
      ...(slug ? { slug } : {}), ...(detail ? { detail: detail.slice(0, 200) } : {})
    }), { httpMetadata: { contentType: "application/json; charset=utf-8" } });
  } catch (error) {
    // O registro nunca deve derrubar a operação principal.
    console.error("Hospedagem Girofy: falha ao registrar atividade:", error);
  }
}

export async function listActivity(bucket: R2Bucket, limit = 30): Promise<Array<Record<string, unknown>>> {
  const size = Math.min(Math.max(Math.floor(limit) || 30, 1), 100);
  const page = await bucket.list({ prefix: AUDIT_PREFIX, limit: 1000 });
  const keys = page.objects.map((object) => object.key);
  // Mantém o histórico enxuto: passou de 500 registros, apaga os mais antigos.
  if (keys.length > 500) await bucket.delete(keys.slice(0, keys.length - 400));
  const recent = keys.slice(-size).reverse();
  const events: Array<Record<string, unknown>> = [];
  for (const key of recent) {
    const object = await bucket.get(key);
    if (!object) continue;
    try {
      events.push(await object.json<Record<string, unknown>>());
    } catch {
      // registro ilegível: ignora
    }
  }
  return events;
}

// ---------- auxiliares de armazenamento ----------

/**
 * Guarda as versões fixadas (fora da conta) e as 12 mais recentes. A versão ativa nunca
 * é apagada, mesmo que já não esteja entre as 12 mais recentes (caso de publicar sem ativar).
 */
function rotateVersions(
  list: VersionSummary[],
  pinned: Set<string>,
  activeVersion: string | null
): VersionSummary[] {
  const kept: VersionSummary[] = [];
  let free = 0;
  for (const item of list) {
    if (pinned.has(item.version)) kept.push(item);
    else if (free < LIMITS.keepVersions || item.version === activeVersion) { kept.push(item); free += 1; }
  }
  return kept;
}

async function collectOldVersions(bucket: R2Bucket, slug: string, retainedVersions: string[]): Promise<string[]> {
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

/**
 * Lista de endereços dos projetos. Evita varrer todas as chaves (o que o KV não faz bem). Se o
 * índice não existir, como num armazenamento criado por uma versão anterior, reconstrói pelos
 * prefixos e grava.
 */
async function projectSlugs(bucket: R2Bucket): Promise<string[]> {
  const object = await bucket.get(INDEX_KEY);
  if (object) {
    try {
      const list = await object.json<unknown>();
      if (Array.isArray(list)) return list.filter((item): item is string => typeof item === "string");
    } catch {
      // índice ilegível: reconstrói abaixo
    }
  }
  const result = await bucket.list({ prefix: PREFIX, delimiter: "/", limit: 1000 });
  const slugs = result.delimitedPrefixes
    .map((prefix) => prefix.slice(PREFIX.length).replace(/\/$/, ""))
    .filter(Boolean);
  if (slugs.length) await writeIndex(bucket, slugs);
  return slugs;
}

async function writeIndex(bucket: R2Bucket, slugs: string[]): Promise<void> {
  await bucket.put(INDEX_KEY, JSON.stringify(slugs), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
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

async function requireProject(bucket: R2Bucket, slug: string): Promise<ProjectRecord> {
  const project = await readProject(bucket, slug);
  if (!project) throw new HospError(404, "Projeto não encontrado.");
  return project;
}

async function readActive(bucket: R2Bucket, slug: string): Promise<ActiveRecord | null> {
  const object = await bucket.get(activeKey(slug));
  if (!object) return null;
  try {
    return await object.json<ActiveRecord>();
  } catch {
    return null;
  }
}

async function writeActive(
  bucket: R2Bucket,
  slug: string,
  summary: VersionSummary,
  settings: ProjectSettings | undefined
): Promise<void> {
  const record: ActiveRecord = { ...summary, ...(settings ? { settings } : {}) };
  await bucket.put(activeKey(slug), JSON.stringify(record), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
}

async function readPending(bucket: R2Bucket, slug: string, version: string): Promise<PendingVersion | null> {
  const object = await bucket.get(versionStateKey(slug, version));
  if (!object) return null;
  try {
    return await object.json<PendingVersion>();
  } catch {
    return null;
  }
}

async function requirePending(bucket: R2Bucket, slug: string, version: string): Promise<PendingVersion> {
  const pending = await readPending(bucket, slug, version);
  if (!pending || pending.expiresAt < Date.now()) {
    throw new HospError(409, "Esta publicação expirou. Inicie novamente.");
  }
  return pending;
}

async function writeProject(bucket: R2Bucket, project: ProjectRecord): Promise<void> {
  await bucket.put(PREFIX + project.slug + "/project.json", JSON.stringify(project), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
}

function publicProject(project: ProjectRecord, active: VersionSummary | null): Record<string, unknown> {
  const current = active ?? project.versions?.find((item) => item.version === project.activeVersion) ?? null;
  return {
    slug: project.slug, name: project.name, url: "/" + project.slug + "/",
    activeVersion: project.activeVersion, entry: project.entry,
    publishedAt: project.activatedAt ?? current?.publishedAt ?? null,
    fileCount: current?.fileCount ?? 0, totalBytes: current?.totalBytes ?? 0,
    pinned: project.pinned ?? [], aliases: project.aliases ?? [],
    settings: normalizeSettings(project.settings), versions: project.versions
  };
}

function filesIndexPage(projectName: string, files: Array<{ path: string; size: number }>): string {
  const links = files
    .map((file) => {
      const href = file.path.split("/").map(encodeURIComponent).join("/");
      return "<li><a href=\"" + href + "\">" + escapeHtml(file.path) + "</a><span>" +
        formatBytes(file.size) + "</span></li>";
    })
    .join("");
  return "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>" + escapeHtml(projectName) + "</title><style>" +
    "body{font:16px system-ui;margin:0;background:#090909;color:#fff;padding:clamp(24px,7vw,96px)}" +
    "main{max-width:900px;margin:auto}h1{font-size:clamp(36px,8vw,80px);letter-spacing:-.06em}" +
    "li{display:flex;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid #333}" +
    "a{color:#fff}span{color:#999}</style><main><p>GIROFY / ARQUIVOS PUBLICADOS</p><h1>" +
    escapeHtml(projectName) + "</h1><p>Arquivos disponíveis neste projeto:</p><ul>" +
    links + "</ul></main></html>";
}

// ---------- ZIP por URL ----------

async function fetchZip(rawUrl: string): Promise<Uint8Array> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HospError(400, "zipUrl não é uma URL válida.");
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new HospError(400, "Use uma URL https pública, sem usuário, senha ou porta.");
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
    /^[\d.]+$/.test(host) || host.includes(":") || !host.includes(".")) {
    throw new HospError(400, "Use um endereço público com nome de domínio.");
  }
  let response: Response;
  try {
    response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(25_000) });
  } catch {
    throw new HospError(502, "Não consegui baixar o ZIP dessa URL.");
  }
  if (!response.ok || !response.body) throw new HospError(502, "A URL respondeu " + response.status + ".");
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > LIMITS.maxProjectBytes) throw new HospError(413, "O ZIP passa de 50 MB.");

  const chunks: Uint8Array[] = [];
  let received = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > LIMITS.maxProjectBytes) {
      await reader.cancel();
      throw new HospError(413, "O ZIP passa de 50 MB.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

// ---------- entrada de arquivos em JSON ----------

function decodeFiles(input: unknown): DecodedFile[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new HospError(400, "Envie uma lista files com pelo menos um arquivo.");
  }
  if (input.length > LIMITS.maxBatchFiles) {
    throw new HospError(
      413,
      "Cada chamada aceita até " + LIMITS.maxBatchFiles + " arquivos. Divida em lotes com upload_files."
    );
  }
  const seen = new Set<string>();
  const decoded: DecodedFile[] = [];
  let total = 0;
  for (const raw of input) {
    const item = (raw && typeof raw === "object" ? raw : {}) as IncomingFile;
    const path = typeof item.path === "string" ? item.path : "";
    if (!safeFilePath(path) || isBlockedPath(path)) {
      throw new HospError(400, "Caminho não permitido: " + (path || "(vazio)") + ".");
    }
    if (seen.has(path)) throw new HospError(400, "Arquivo repetido: " + path + ".");
    seen.add(path);
    const hasText = typeof item.text === "string";
    const hasBase64 = typeof item.base64 === "string";
    if (hasText === hasBase64) {
      throw new HospError(400, "Em " + path + ", envie text ou base64 (apenas um dos dois).");
    }
    const bytes = hasText ? new TextEncoder().encode(item.text) : decodeBase64(item.base64 as string);
    if (bytes.byteLength > LIMITS.maxFileBytes) {
      throw new HospError(413, "O arquivo " + path + " passa de 10 MB.");
    }
    total += bytes.byteLength;
    if (total > LIMITS.maxBatchBytes) {
      throw new HospError(413, "Esta chamada aceita até 8 MB no total. Divida em lotes menores.");
    }
    decoded.push({
      path, bytes,
      contentType: contentType(path, typeof item.contentType === "string" ? item.contentType : "")
    });
  }
  return decoded;
}

function decodeBase64(value: string): Uint8Array {
  try {
    const binary = atob(value.replace(/\s+/g, ""));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new HospError(400, "Conteúdo base64 inválido.");
  }
}

// ---------- validação e nomes ----------

export function cleanSlug(value: string): string {
  const slug = (value ?? "").toLowerCase().trim();
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) ? slug : "";
}

function requireSlug(value: string): string {
  const slug = cleanSlug(value);
  if (!slug) throw new HospError(400, "Projeto inválido.");
  return slug;
}

function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
}

function cleanNote(value: string): string {
  return value.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, LIMITS.maxNoteChars);
}

function sourceOf(actor: Actor): string {
  return actor.kind === "token" ? "api:" + actor.name : "painel";
}

export function safeFilePath(value: string): boolean {
  if (!value || value.length > 1024 || value.startsWith("/") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return false;
  }
  return value.split("/").every((part) =>
    Boolean(part) && part !== "." && part !== ".." && !part.includes(":") &&
    !part.startsWith("_girofy_")
  );
}

export function isBlockedPath(path: string): boolean {
  const parts = path.toLowerCase().split("/");
  const file = parts.at(-1) ?? "";
  return parts.some((part) => part.startsWith(".") || part.startsWith("_girofy_") ||
    part === ".git" || part === ".next" || part === "node_modules" ||
    part === ".vercel" || part === ".wrangler" || part === ".ssh"
  ) || file === ".npmrc" || file === ".netrc" || file === ".env" ||
    file.startsWith(".env.") || file.endsWith(".pem") || file.endsWith(".key") ||
    file.endsWith(".p12") || file.endsWith(".pfx");
}

function isTextType(type: string): boolean {
  return /^text\//i.test(type) || /(json|javascript|xml|svg)/i.test(type);
}

export function contentType(path: string, supplied: string): string {
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

export function validVersion(value: string): boolean {
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
function aliasKey(alias: string): string { return ALIAS_PREFIX + alias + ".json"; }
function versionStateKey(slug: string, version: string): string {
  return versionPrefix(slug, version) + "_girofy_pending.json";
}
export function previewPath(slug: string, version: string): string {
  return "/_preview/" + slug + "/" + version + "/";
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

export { DEFAULT_SETTINGS };
