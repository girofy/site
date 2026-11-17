// Configurações por projeto. Este módulo é puro (sem env nem R2) porque é usado
// pela API de gerenciamento e pelo Worker que serve os sites publicados.

export type RedirectStatus = 301 | 302 | 307 | 308;

export type RedirectRule = { from: string; to: string; status: RedirectStatus };

export type ProjectSettings = {
  /** Páginas sem arquivo e sem extensão voltam para a página inicial (apps de página única). */
  spaFallback: boolean;
  /** Envia X-Robots-Tag: noindex, nofollow. */
  noindex: boolean;
  /** Cache dos arquivos que não são HTML, em segundos. */
  cacheSeconds: number;
  /** Caminho de uma página HTML própria para o erro 404. Vazio usa o texto padrão. */
  notFound: string;
  redirects: RedirectRule[];
  headers: Record<string, string>;
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  spaFallback: true,
  noindex: false,
  cacheSeconds: 300,
  notFound: "",
  redirects: [],
  headers: {}
};

export const MAX_REDIRECTS = 50;
export const MAX_CUSTOM_HEADERS = 10;
export const MAX_CACHE_SECONDS = 31536000;

// Cabeçalhos que o dono pode definir. CSP, Cache-Control e Content-Type ficam de fora
// de propósito: a CSP em sandbox protege o domínio e o cache tem campo próprio.
export const ALLOWED_HEADERS = [
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-max-age",
  "content-language",
  "cross-origin-resource-policy",
  "link",
  "x-robots-tag",
  "x-frame-options"
] as const;

const REDIRECT_STATUS = new Set([301, 302, 307, 308]);

export class SettingsError extends Error {}

/** Leitura tolerante, usada ao servir: ignora o que for inválido em vez de quebrar o site. */
export function normalizeSettings(input: unknown): ProjectSettings {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const redirects: RedirectRule[] = [];
  if (Array.isArray(source.redirects)) {
    for (const rule of source.redirects.slice(0, MAX_REDIRECTS)) {
      const parsed = parseRedirect(rule);
      if (parsed) redirects.push(parsed);
    }
  }
  const headers: Record<string, string> = {};
  if (source.headers && typeof source.headers === "object") {
    for (const [name, value] of Object.entries(source.headers as Record<string, unknown>)) {
      const key = name.toLowerCase();
      if (Object.keys(headers).length >= MAX_CUSTOM_HEADERS) break;
      if ((ALLOWED_HEADERS as readonly string[]).includes(key) && validHeaderValue(value)) {
        headers[key] = value as string;
      }
    }
  }
  const cache = Number(source.cacheSeconds);
  return {
    spaFallback: typeof source.spaFallback === "boolean" ? source.spaFallback : DEFAULT_SETTINGS.spaFallback,
    noindex: source.noindex === true,
    cacheSeconds: Number.isInteger(cache) && cache >= 0 && cache <= MAX_CACHE_SECONDS
      ? cache : DEFAULT_SETTINGS.cacheSeconds,
    notFound: typeof source.notFound === "string" && validProjectPath(source.notFound) ? source.notFound : "",
    redirects,
    headers
  };
}

/** Leitura estrita, usada ao salvar: diz exatamente o que está errado. */
export function applySettingsPatch(
  current: ProjectSettings,
  patch: Record<string, unknown>
): ProjectSettings {
  const next: ProjectSettings = {
    ...current, redirects: [...current.redirects], headers: { ...current.headers }
  };
  const known = ["spaFallback", "noindex", "cacheSeconds", "notFound", "redirects", "headers"];
  for (const key of Object.keys(patch)) {
    if (!known.includes(key)) throw new SettingsError("Configuração desconhecida: " + key + ".");
  }
  if ("spaFallback" in patch) {
    if (typeof patch.spaFallback !== "boolean") throw new SettingsError("spaFallback precisa ser verdadeiro ou falso.");
    next.spaFallback = patch.spaFallback;
  }
  if ("noindex" in patch) {
    if (typeof patch.noindex !== "boolean") throw new SettingsError("noindex precisa ser verdadeiro ou falso.");
    next.noindex = patch.noindex;
  }
  if ("cacheSeconds" in patch) {
    const value = Number(patch.cacheSeconds);
    if (!Number.isInteger(value) || value < 0 || value > MAX_CACHE_SECONDS) {
      throw new SettingsError("cacheSeconds precisa ser um número inteiro de 0 a 31536000.");
    }
    next.cacheSeconds = value;
  }
  if ("notFound" in patch) {
    const value = patch.notFound;
    if (typeof value !== "string" || (value !== "" && (!validProjectPath(value) || !/\.html?$/i.test(value)))) {
      throw new SettingsError("notFound precisa ser o caminho de um arquivo HTML do projeto, ou vazio.");
    }
    next.notFound = value;
  }
  if ("redirects" in patch) {
    if (!Array.isArray(patch.redirects) || patch.redirects.length > MAX_REDIRECTS) {
      throw new SettingsError("Use uma lista de até " + MAX_REDIRECTS + " redirecionamentos.");
    }
    next.redirects = patch.redirects.map((rule, index) => {
      const parsed = parseRedirect(rule);
      if (!parsed) {
        throw new SettingsError(
          "Redirecionamento " + (index + 1) + " inválido. Use from começando com /, to começando com / " +
          "ou https://, e status 301, 302, 307 ou 308."
        );
      }
      if (parsed.from === parsed.to) {
        throw new SettingsError("Redirecionamento " + (index + 1) + " aponta para si mesmo.");
      }
      return parsed;
    });
  }
  if ("headers" in patch) {
    const headers = patch.headers;
    if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
      throw new SettingsError("headers precisa ser um objeto nome → valor.");
    }
    const entries = Object.entries(headers as Record<string, unknown>);
    if (entries.length > MAX_CUSTOM_HEADERS) {
      throw new SettingsError("Use no máximo " + MAX_CUSTOM_HEADERS + " cabeçalhos.");
    }
    const clean: Record<string, string> = {};
    for (const [name, value] of entries) {
      const key = name.toLowerCase();
      if (!(ALLOWED_HEADERS as readonly string[]).includes(key)) {
        throw new SettingsError("Cabeçalho não permitido: " + name + ". Permitidos: " + ALLOWED_HEADERS.join(", ") + ".");
      }
      if (!validHeaderValue(value)) {
        throw new SettingsError("Valor inválido para " + name + ": use texto simples de até 512 caracteres.");
      }
      clean[key] = value as string;
    }
    next.headers = clean;
  }
  return next;
}

function parseRedirect(rule: unknown): RedirectRule | null {
  if (!rule || typeof rule !== "object") return null;
  const { from, to, status } = rule as Record<string, unknown>;
  const code = status === undefined ? 301 : Number(status);
  if (typeof from !== "string" || typeof to !== "string" || !REDIRECT_STATUS.has(code)) return null;
  if (!validFrom(from) || !validTo(to)) return null;
  return { from, to, status: code as RedirectStatus };
}

function validFrom(value: string): boolean {
  if (value.length < 1 || value.length > 200 || !value.startsWith("/") || value.startsWith("//")) return false;
  if (/[^\x21-\x7e]|[?#]/.test(value)) return false;
  const star = value.indexOf("*");
  return star === -1 || (star === value.length - 1 && value.endsWith("/*"));
}

function validTo(value: string): boolean {
  // Só ASCII visível: o destino vai direto para o cabeçalho Location.
  if (value.length < 1 || value.length > 500 || /[^\x21-\x7e]/.test(value)) return false;
  if (value.startsWith("//")) return false;
  return value.startsWith("/") || /^https:\/\/[^/\s]+/i.test(value);
}

function validHeaderValue(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 512 && /^[\x20-\x7e]+$/.test(value);
}

function validProjectPath(value: string): boolean {
  if (!value || value.length > 1024 || value.startsWith("/") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return false;
  }
  return value.split("/").every((part) => part && part !== "." && part !== ".." && !part.startsWith("_girofy_"));
}

/**
 * Procura o primeiro redirecionamento que combina com o caminho (relativo à raiz do
 * projeto, começando em "/"). Aceita caminho exato e prefixo com "/*" e :splat.
 */
export function matchRedirect(
  rules: RedirectRule[],
  path: string
): { location: string; status: RedirectStatus } | null {
  const trim = (value: string) => (value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value);
  const clean = trim(path);
  for (const rule of rules) {
    if (rule.from.endsWith("/*")) {
      const base = rule.from.slice(0, -2);
      if (clean === base || clean.startsWith(base + "/")) {
        const splat = clean.slice(base.length).replace(/^\//, "");
        return { location: tidy(rule.to.replace(":splat", () => splat)), status: rule.status };
      }
    } else if (trim(rule.from) === clean) {
      return { location: tidy(rule.to), status: rule.status };
    }
  }
  return null;
}

// Evita que um :splat que comece com "/" vire "//host" (redirecionamento aberto).
function tidy(location: string): string {
  return location.startsWith("/") ? location.replace(/^\/+/, "/") : location;
}
