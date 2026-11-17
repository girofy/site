// Gera dist-standalone/worker.js: o Worker enxuto da hospedagem em um único arquivo.
import { build } from "esbuild";
import { statSync } from "node:fs";

await build({
  entryPoints: ["build/standalone-worker.ts"],
  outfile: "dist-standalone/worker.js",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  legalComments: "none",
  // Fornecido pelo runtime do Workers.
  external: ["cloudflare:workers"],
  logLevel: "warning"
});

const bytes = statSync("dist-standalone/worker.js").size;
console.log("dist-standalone/worker.js · " + (bytes / 1024).toFixed(1) + " KB");
