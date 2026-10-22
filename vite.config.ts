import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig(async () => {
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";
  process.env.WRANGLER_WRITE_LOGS ??= "false";

  const { cloudflare } = await import("@cloudflare/vite-plugin");
  const r2 = hostingConfig.r2;
  return {
    plugins: [
      vinext(),
      sites({ mockAuth: false }),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          main: "./build/sites-worker.ts",
          compatibility_flags: ["nodejs_compat"],
          r2_buckets: r2 ? [{ binding: r2, bucket_name: "site-creator-r2" }] : []
        }
      })
    ]
  };
});
