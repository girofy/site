// Gera dist-standalone/worker.js: o Worker enxuto da hospedagem (painel, API, MCP e sites publicados)
// em um único arquivo. O painel visual é empacotado e embutido no Worker como módulo virtual
// "panel-assets:bundle", então não depende de upload de arquivos estáticos.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, statSync } from "node:fs";

rmSync("dist-standalone", { recursive: true, force: true });
mkdirSync("dist-standalone", { recursive: true });

const panelJs = await build({
  entryPoints: { panel: "build/panel-entry.tsx" },
  bundle: true,
  minify: true,
  write: false,
  outdir: "dist-standalone",
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": "\"production\"" },
  legalComments: "none",
  logLevel: "warning"
});
const panelCss = await build({
  entryPoints: { panel: "app/globals.css" },
  bundle: true,
  minify: true,
  write: false,
  outdir: "dist-standalone",
  logLevel: "warning"
});

const js = panelJs.outputFiles.find((file) => file.path.endsWith(".js")).text;
const css = panelCss.outputFiles.find((file) => file.path.endsWith(".css")).text;
const version = createHash("sha256").update(js).update(css).digest("hex").slice(0, 10);

const panelAssets = {
  name: "panel-assets",
  setup(builder) {
    builder.onResolve({ filter: /^panel-assets:bundle$/ }, () => ({ path: "bundle", namespace: "panel-assets" }));
    builder.onLoad({ filter: /.*/, namespace: "panel-assets" }, () => ({
      loader: "js",
      contents: "export const panelJs=" + JSON.stringify(js) +
        ";export const panelCss=" + JSON.stringify(css) +
        ";export const panelVersion=" + JSON.stringify(version) + ";"
    }));
  }
};

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
  plugins: [panelAssets],
  logLevel: "warning"
});

const kb = (bytes) => (bytes / 1024).toFixed(1) + " KB";
console.log("worker.js " + kb(statSync("dist-standalone/worker.js").size) +
  " (painel " + kb(js.length) + " + estilos " + kb(css.length) + ") · versão do painel " + version);
