import { createKvBucket } from "./kv-bucket";

/**
 * Escolhe onde a hospedagem guarda os arquivos: R2 (BUCKET) quando existir, senão KV (HOSP_KV).
 * Devolve undefined quando nenhum dos dois está ligado ao Worker.
 */
export function hospStorage(env: { BUCKET?: R2Bucket; HOSP_KV?: KVNamespace }): R2Bucket | undefined {
  if (env.BUCKET) return env.BUCKET;
  if (env.HOSP_KV) return createKvBucket(env.HOSP_KV);
  return undefined;
}
