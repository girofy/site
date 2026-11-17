// Autenticação da hospedagem: sessão do painel (cookie HMAC) e tokens de API para agentes.
// Tokens são guardados só como hash SHA-256 no R2 e o valor completo aparece uma única vez.

import { HospError } from "./errors";

export type Scope = "read" | "deploy" | "admin";
export const SCOPE_RANK: Record<Scope, number> = { read: 1, deploy: 2, admin: 3 };
export const SCOPES = Object.keys(SCOPE_RANK) as Scope[];

/** Quem está agindo. A sessão do painel tem poder total; um token tem o escopo que recebeu. */
export type Actor = {
  kind: "session" | "token";
  name: string;
  scope: Scope;
  tokenId?: string;
};

export const SESSION_COOKIE = "girofy_hosp_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const TOKEN_PREFIX = "_system/tokens/";
const TOKEN_PATTERN = /^gfy_([a-f0-9]{12})_([A-Za-z0-9_-]{32})$/;
const MAX_TOKENS = 20;
const LAST_USED_REFRESH_MS = 10 * 60 * 1000;
const MAX_TOKEN_DAYS = 365;

type TokenRecord = {
  id: string;
  name: string;
  scope: Scope;
  hash: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
};

export type TokenInfo = Omit<TokenRecord, "hash"> & { expired: boolean };

export function requireScope(actor: Actor, needed: Scope): void {
  if (SCOPE_RANK[actor.scope] < SCOPE_RANK[needed]) {
    throw new HospError(
      403,
      "Este token tem escopo '" + actor.scope + "', mas a ação exige '" + needed + "'.",
      "insufficient_scope"
    );
  }
}

/** Criar e revogar tokens é exclusivo do painel: um token não consegue gerar outro. */
export function requireSession(actor: Actor): void {
  if (actor.kind !== "session") {
    throw new HospError(403, "Tokens de API só podem ser gerenciados pelo painel.", "session_required");
  }
}

// ---------- tokens ----------

export async function createToken(
  bucket: R2Bucket,
  input: { name: string; scope: string; expiresInDays?: number | null }
): Promise<{ token: string; info: TokenInfo }> {
  const name = input.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
  if (!name) throw new HospError(400, "Dê um nome ao token, por exemplo o nome do agente.");
  if (!SCOPES.includes(input.scope as Scope)) {
    throw new HospError(400, "O escopo precisa ser read, deploy ou admin.");
  }
  let expiresAt: string | null = null;
  if (input.expiresInDays !== undefined && input.expiresInDays !== null) {
    const days = Number(input.expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > MAX_TOKEN_DAYS) {
      throw new HospError(400, "A validade vai de 1 a " + MAX_TOKEN_DAYS + " dias.");
    }
    expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  }
  const existing = await bucket.list({ prefix: TOKEN_PREFIX, limit: MAX_TOKENS + 1 });
  if (existing.objects.length >= MAX_TOKENS) {
    throw new HospError(400, "O limite é de " + MAX_TOKENS + " tokens. Revogue um que não use mais.");
  }

  const id = toHex(crypto.getRandomValues(new Uint8Array(6)));
  const secret = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  const token = "gfy_" + id + "_" + secret;
  const record: TokenRecord = {
    id, name, scope: input.scope as Scope, hash: await sha256Hex(token),
    createdAt: new Date().toISOString(), expiresAt, lastUsedAt: null
  };
  await bucket.put(TOKEN_PREFIX + id + ".json", JSON.stringify(record), {
    httpMetadata: { contentType: "application/json; charset=utf-8" }
  });
  return { token, info: toInfo(record) };
}

export async function listTokens(bucket: R2Bucket): Promise<TokenInfo[]> {
  const page = await bucket.list({ prefix: TOKEN_PREFIX, limit: MAX_TOKENS + 5 });
  const tokens: TokenInfo[] = [];
  for (const object of page.objects) {
    const record = await readToken(bucket, object.key);
    if (record) tokens.push(toInfo(record));
  }
  return tokens.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeToken(bucket: R2Bucket, id: string): Promise<void> {
  if (!/^[a-f0-9]{12}$/.test(id)) throw new HospError(400, "Token inválido.");
  const key = TOKEN_PREFIX + id + ".json";
  if (!(await bucket.head(key))) throw new HospError(404, "Token não encontrado.");
  await bucket.delete(key);
}

export async function authenticateToken(bucket: R2Bucket, presented: string): Promise<Actor | null> {
  const match = TOKEN_PATTERN.exec(presented);
  if (!match) return null;
  const key = TOKEN_PREFIX + match[1] + ".json";
  const record = await readToken(bucket, key);
  if (!record) return null;
  // Compara o hash em tempo constante para não vazar nada por tempo de resposta.
  if (!constantTimeEqual(record.hash, await sha256Hex(presented))) return null;
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return null;

  const last = record.lastUsedAt ? Date.parse(record.lastUsedAt) : 0;
  if (Date.now() - last > LAST_USED_REFRESH_MS) {
    record.lastUsedAt = new Date().toISOString();
    await bucket.put(key, JSON.stringify(record), {
      httpMetadata: { contentType: "application/json; charset=utf-8" }
    });
  }
  return { kind: "token", name: record.name, scope: record.scope, tokenId: record.id };
}

export function bearerFrom(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : "";
}

async function readToken(bucket: R2Bucket, key: string): Promise<TokenRecord | null> {
  const object = await bucket.get(key);
  if (!object) return null;
  try {
    return await object.json<TokenRecord>();
  } catch {
    return null;
  }
}

function toInfo(record: TokenRecord): TokenInfo {
  const { hash: _hash, ...rest } = record;
  return { ...rest, expired: Boolean(record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) };
}

// ---------- sessão do painel ----------

export async function hasValidSession(request: Request, secret: string): Promise<boolean> {
  const cookie = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(SESSION_COOKIE + "="));
  if (!cookie) return false;
  const token = cookie.slice(SESSION_COOKIE.length + 1);
  const separator = token.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = Number(token.slice(0, separator));
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const signatureBytes = fromBase64Url(token.slice(separator + 1));
  if (!signatureBytes) return false;
  const signature = new Uint8Array(signatureBytes).buffer;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(sessionMessage(expiresAt)));
}

export async function signSession(secret: string, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(sessionMessage(expiresAt))
  );
  return toBase64Url(new Uint8Array(signature));
}

function sessionMessage(expiresAt: number): string {
  return "girofy-hosp-session:" + expiresAt;
}

// ---------- utilidades ----------

export function constantTimeEqual(expected: string, actual: string): boolean {
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}
