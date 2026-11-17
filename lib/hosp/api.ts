// Ações da hospedagem. A API REST (/api/hosp) e o servidor MCP (/api/hosp/mcp) chamam
// execute() e herdam as mesmas regras de escopo, confirmação e registro de atividade.

import {
  createToken, listTokens, requireScope, requireSession, revokeToken, type Actor, type Scope
} from "./auth";
import * as core from "./core";
import { HospError } from "./errors";

type ActionRule = { scope: Scope | "session"; log?: boolean };

export const ACTIONS: Record<string, ActionRule> = {
  // leitura
  list: { scope: "read" },
  versions: { scope: "read" },
  project: { scope: "read" },
  files: { scope: "read" },
  file: { scope: "read" },
  usage: { scope: "read" },
  activity: { scope: "read" },
  // publicação e gerenciamento
  begin: { scope: "deploy" },
  upload_files: { scope: "deploy" },
  publish: { scope: "deploy", log: true },
  deploy: { scope: "deploy", log: true },
  deploy_zip: { scope: "deploy", log: true },
  restore: { scope: "deploy", log: true },
  rollback: { scope: "deploy", log: true },
  pin: { scope: "deploy", log: true },
  settings: { scope: "deploy", log: true },
  alias_add: { scope: "deploy", log: true },
  alias_remove: { scope: "deploy", log: true },
  rename: { scope: "deploy", log: true },
  // destrutivo
  delete: { scope: "admin", log: true },
  // só o painel
  tokens_list: { scope: "session" },
  token_create: { scope: "session", log: true },
  token_revoke: { scope: "session", log: true }
};

export async function execute(
  bucket: R2Bucket,
  action: string,
  input: Record<string, unknown>,
  actor: Actor
): Promise<unknown> {
  const rule = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined;
  if (!rule) throw new HospError(400, "Ação desconhecida.");
  if (rule.scope === "session") requireSession(actor);
  else requireScope(actor, rule.scope);

  const slug = text(input.slug);
  const result = await run(bucket, action, input, actor, slug);
  if (rule.log) {
    const detail = text(input.note) || text(input.name) || text(input.version) || text(input.alias);
    await core.logActivity(bucket, actor, action, slug || undefined, detail || undefined);
  }
  return result;
}

async function run(
  bucket: R2Bucket,
  action: string,
  input: Record<string, unknown>,
  actor: Actor,
  slug: string
): Promise<unknown> {
  switch (action) {
    case "list": return { projects: await core.listProjects(bucket) };
    case "versions": return { versions: await core.listVersions(bucket, slug) };
    case "project": return core.getProject(bucket, slug);
    case "files": return core.listFiles(bucket, slug, text(input.version) || undefined);
    case "file": return core.readFile(bucket, slug, text(input.path), text(input.version) || undefined);
    case "usage": return core.usage(bucket);
    case "activity": return { events: await core.listActivity(bucket, Number(input.limit) || 30) };

    case "begin":
      return core.beginDeploy(bucket, {
        slug, name: text(input.name), entry: text(input.entry),
        fileCount: input.fileCount, totalBytes: input.totalBytes
      });
    case "upload_files":
      return core.uploadFiles(bucket, { slug, version: text(input.version), files: input.files });
    case "publish":
      return core.publishVersion(bucket, {
        slug, version: text(input.version), entry: text(input.entry), name: text(input.name),
        note: text(input.note), activate: input.activate === false ? false : true
      }, actor);
    case "deploy":
      return core.deployFiles(bucket, {
        slug, name: text(input.name), entry: text(input.entry), note: text(input.note),
        activate: input.activate === false ? false : true, files: input.files
      }, actor);
    case "deploy_zip":
      return core.deployZip(bucket, {
        slug, name: text(input.name), entry: text(input.entry), note: text(input.note),
        activate: input.activate === false ? false : true,
        zipUrl: text(input.zipUrl) || undefined, zipBase64: text(input.zipBase64) || undefined,
        root: text(input.root) || undefined
      }, actor);
    case "restore": return core.activateVersion(bucket, slug, text(input.version));
    case "rollback": return core.rollback(bucket, slug);
    case "pin": return core.pinVersion(bucket, slug, text(input.version), input.pinned !== false);
    case "settings": return core.updateSettings(bucket, slug, input.settings);
    case "alias_add": return core.addAlias(bucket, slug, text(input.alias));
    case "alias_remove": return core.removeAlias(bucket, slug, text(input.alias));
    case "rename": return core.renameProject(bucket, slug, text(input.name));

    case "delete":
      // Um agente precisa repetir o endereço para apagar. O painel já confirma na tela.
      if (actor.kind === "token" && text(input.confirm) !== slug) {
        throw new HospError(
          400,
          "Para apagar, envie confirm com o mesmo valor de slug. Isso apaga o projeto e todas as versões.",
          "confirmation_required"
        );
      }
      return core.deleteProject(bucket, slug);

    case "tokens_list": return { tokens: await listTokens(bucket) };
    case "token_create": {
      const created = await createToken(bucket, {
        name: text(input.name), scope: text(input.scope) || "deploy",
        expiresInDays: input.expiresInDays === undefined || input.expiresInDays === null
          ? null : Number(input.expiresInDays)
      });
      return { ok: true, token: created.token, info: created.info,
        note: "Guarde o token agora. Ele não será mostrado de novo." };
    }
    case "token_revoke":
      await revokeToken(bucket, text(input.id));
      return { ok: true };
    default:
      throw new HospError(400, "Ação desconhecida.");
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
