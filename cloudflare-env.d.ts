declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    BUCKET?: R2Bucket;
    HOSP_ADMIN_PASSWORD?: string;
  }
}
