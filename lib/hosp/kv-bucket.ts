// Armazenamento alternativo ao R2, em Workers KV (grátis, sem cartão).
// Imita só o trecho da API do R2 que a hospedagem usa: get, head, put, delete e list.
//
// Diferenças que importam:
// - KV é eventualmente consistente entre regiões: uma versão nova pode levar até ~1 minuto
//   para aparecer em todos os lugares.
// - Chaves têm no máximo 512 bytes, então caminhos de arquivo muito longos são recusados.
// - Plano grátis: 1.000 gravações por dia (apagar também conta) e 1 gravação por segundo na
//   mesma chave. O put aqui tenta de novo quando o KV recusa por esse limite.
// - A listagem com delimitador varre as chaves. A hospedagem evita isso com um índice de projetos.

import { HospError } from "./errors";

type Meta = { ct?: string; sz?: number };

const MAX_KEY_BYTES = 512;
const MAX_VALUE_BYTES = 25 * 1024 * 1024;
const DELETE_PARALLEL = 6;
const MAX_SCAN_PAGES = 20;

export function createKvBucket(kv: KVNamespace): R2Bucket {
  const bucket = {
    async get(key: string) {
      const found = await kv.getWithMetadata<Meta>(key, { type: "arrayBuffer" });
      if (!found.value) return null;
      return objectBody(key, found.value, found.metadata);
    },

    async head(key: string) {
      const found = await kv.getWithMetadata<Meta>(key, { type: "stream" });
      if (!found.value) return null;
      await found.value.cancel().catch(() => undefined);
      return {
        key, size: found.metadata?.sz ?? 0,
        httpMetadata: { contentType: found.metadata?.ct }
      };
    },

    async put(key: string, value: unknown, options?: { httpMetadata?: { contentType?: string } }) {
      assertKey(key);
      const { data, size } = await toStorable(value);
      if (size > MAX_VALUE_BYTES) {
        throw new HospError(413, "Arquivo grande demais para este armazenamento (limite de 25 MB).");
      }
      const metadata: Meta = { sz: size };
      if (options?.httpMetadata?.contentType) metadata.ct = options.httpMetadata.contentType;
      await putWithRetry(kv, key, data, metadata);
      return null;
    },

    async delete(keys: string | string[]) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (let start = 0; start < list.length; start += DELETE_PARALLEL) {
        await Promise.all(list.slice(start, start + DELETE_PARALLEL).map((key) => kv.delete(key)));
      }
    },

    async list(options: { prefix?: string; limit?: number; cursor?: string; delimiter?: string } = {}) {
      const prefix = options.prefix ?? "";
      if (options.delimiter) return listWithDelimiter(kv, prefix, options.delimiter);
      const limit = Math.min(Math.max(options.limit ?? 1000, 1), 1000);
      const page = await kv.list<Meta>({ prefix, limit, cursor: options.cursor });
      return {
        objects: page.keys.map((item) => ({ key: item.name, size: item.metadata?.sz ?? 0 })),
        delimitedPrefixes: [] as string[],
        truncated: !page.list_complete,
        cursor: page.list_complete ? undefined : page.cursor
      };
    }
  };
  return bucket as unknown as R2Bucket;
}

function objectBody(key: string, buffer: ArrayBuffer, meta: Meta | null) {
  return {
    key,
    size: buffer.byteLength,
    httpMetadata: { contentType: meta?.ct },
    // Cada leitura devolve um fluxo novo, como o R2 devolve um corpo por objeto.
    get body() { return new Blob([buffer]).stream(); },
    arrayBuffer: async () => buffer,
    text: async () => new TextDecoder().decode(buffer),
    json: async () => JSON.parse(new TextDecoder().decode(buffer))
  };
}

async function toStorable(value: unknown): Promise<{ data: string | ArrayBuffer; size: number }> {
  if (typeof value === "string") {
    return { data: value, size: new TextEncoder().encode(value).byteLength };
  }
  if (value instanceof ArrayBuffer) return { data: value, size: value.byteLength };
  if (ArrayBuffer.isView(value)) {
    const view = value as Uint8Array;
    const copy = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
    return { data: copy, size: copy.byteLength };
  }
  if (value instanceof Blob) {
    const buffer = await value.arrayBuffer();
    return { data: buffer, size: buffer.byteLength };
  }
  if (value && typeof (value as ReadableStream).getReader === "function") {
    // KV não aceita fluxo sem tamanho conhecido: lê tudo (cada arquivo tem no máximo 10 MB).
    const buffer = await new Response(value as ReadableStream).arrayBuffer();
    return { data: buffer, size: buffer.byteLength };
  }
  throw new Error("Tipo de conteúdo não suportado pelo armazenamento KV.");
}

function assertKey(key: string): void {
  if (new TextEncoder().encode(key).byteLength > MAX_KEY_BYTES) {
    throw new HospError(
      400,
      "O caminho do arquivo é longo demais para este armazenamento. Use um caminho mais curto.",
      "path_too_long"
    );
  }
}

async function putWithRetry(kv: KVNamespace, key: string, data: string | ArrayBuffer, metadata: Meta): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await kv.put(key, data, { metadata });
      return;
    } catch (error) {
      // O KV recusa gravar a mesma chave mais de uma vez por segundo (HTTP 429).
      const rateLimited = /429|too many requests|rate limit/i.test(String(error));
      if (!rateLimited || attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }
}

async function listWithDelimiter(kv: KVNamespace, prefix: string, delimiter: string) {
  const objects: Array<{ key: string; size: number }> = [];
  const prefixes = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < MAX_SCAN_PAGES; page += 1) {
    const result = await kv.list<Meta>({ prefix, limit: 1000, cursor });
    for (const item of result.keys) {
      const rest = item.name.slice(prefix.length);
      const index = rest.indexOf(delimiter);
      if (index >= 0) prefixes.add(prefix + rest.slice(0, index + delimiter.length));
      else objects.push({ key: item.name, size: item.metadata?.sz ?? 0 });
    }
    if (result.list_complete) break;
    cursor = result.cursor;
  }
  return { objects, delimitedPrefixes: [...prefixes], truncated: false, cursor: undefined };
}
