import { env } from "cloudflare:workers";
import { execute } from "../../../lib/hosp/api";
import {
  SESSION_COOKIE, SESSION_MAX_AGE, authenticateToken, bearerFrom, constantTimeEqual,
  hasValidSession, requireScope, signSession, type Actor
} from "../../../lib/hosp/auth";
import { storeUploadedFile } from "../../../lib/hosp/core";
import { HospError } from "../../../lib/hosp/errors";
import { hospStorage } from "../../../lib/hosp/storage";

const SESSION_ACTOR: Actor = { kind: "session", name: "painel", scope: "admin" };
const READ_ONLY_ACTIONS = new Set([
  "list", "versions", "project", "files", "file", "usage", "activity", "tokens_list"
]);

export async function GET(request: Request): Promise<Response> {
  try {
    const bucket = hospStorage(env);
    const auth = await authenticate(request, bucket);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "list";
    // GET só lê. Ações que alteram algo precisam de POST (e, no painel, da checagem de origem).
    if (!READ_ONLY_ACTIONS.has(action)) {
      return json({ error: "Use POST para esta ação." }, 405, { Allow: "POST" });
    }
    const input = Object.fromEntries(url.searchParams);
    return json(await execute(bucket as R2Bucket, action, input, auth));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const bearer = bearerFrom(request);
    // Pedidos com token não carregam cookie do navegador, então não há o que proteger
    // com a checagem de origem. Pedidos do painel continuam exigindo a mesma origem.
    if (bearer === null) {
      const originError = checkSameOrigin(request);
      if (originError) return originError;
    }

    const isMultipart = (request.headers.get("content-type") ?? "").includes("multipart/form-data");
    const body = isMultipart ? null : await request.json<Record<string, unknown>>();
    if (body && bearer === null) {
      if (body.action === "login") return await login(body, request);
      if (body.action === "logout") return logout(request);
    }

    const bucket = hospStorage(env);
    const auth = await authenticate(request, bucket);
    if (auth instanceof Response) return auth;

    if (isMultipart) {
      requireScope(auth, "deploy");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "Arquivo ausente." }, 400);
      return json(await storeUploadedFile(bucket as R2Bucket, {
        slug: stringValue(form.get("slug")),
        version: stringValue(form.get("version")),
        path: stringValue(form.get("path")),
        file
      }));
    }
    const payload = body ?? {};
    return json(await execute(bucket as R2Bucket, stringValue(payload.action), payload, auth));
  } catch (error) {
    return failure(error);
  }
}

/** Sessão do painel (cookie) ou token de API (Authorization: Bearer). */
async function authenticate(request: Request, bucket: R2Bucket | undefined): Promise<Actor | Response> {
  const bearer = bearerFrom(request);
  if (bearer !== null) {
    if (!bucket) return json({ error: "O armazenamento ainda não está disponível." }, 503);
    const actor = bearer ? await authenticateToken(bucket, bearer) : null;
    if (!actor) {
      return json(
        { error: "token_invalid", message: "Token inválido, expirado ou revogado." },
        401,
        { "WWW-Authenticate": "Bearer realm=\"girofy-hospedagem\"" }
      );
    }
    return actor;
  }

  const secret = env.HOSP_ADMIN_PASSWORD;
  if (!secret) {
    return json({ error: "admin_key_not_configured", message: "A chave do painel ainda não foi configurada." }, 503);
  }
  if (!await hasValidSession(request, secret)) {
    return json({ error: "key_required", message: "Informe a chave de acesso do painel." }, 401);
  }
  if (!bucket) return json({ error: "O armazenamento ainda não está disponível." }, 503);
  return SESSION_ACTOR;
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

function failure(error: unknown): Response {
  if (error instanceof HospError) {
    return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
  }
  console.error("Hospedagem Girofy:", error);
  return json({ error: "Não foi possível concluir esta operação. Tente novamente." }, 500);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  });
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(body), { status, headers });
}
