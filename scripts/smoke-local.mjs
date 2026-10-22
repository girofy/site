import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const base = "http://localhost:4173";
const devVarsPath = new URL("../.dev.vars", import.meta.url);
const hadDevVars = existsSync(devVarsPath);
const previousDevVars = hadDevVars ? readFileSync(devVarsPath, "utf8") : null;
writeFileSync(devVarsPath, "HOSP_ADMIN_PASSWORD=smoke-test-key\n");

const server = spawn(process.execPath, ["scripts/run-framework.mjs", "dev", "--port", "4173"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, HOSP_ADMIN_PASSWORD: "smoke-test-key" },
  stdio: "ignore"
});
let cookie = "";
let slug = "smoke-" + Date.now().toString(36);
let failure;

async function checkedFetch(path, options = {}) {
  return fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) });
}

async function jsonRequest(action, payload = {}) {
  const response = await checkedFetch("/api/hosp", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: base,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action, slug, ...payload })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("API " + action + " returned " + response.status + ": " + JSON.stringify(body));
  return body;
}

async function publish(label) {
  const html = new TextEncoder().encode(
    "<!doctype html><html><head><title>" + label + "</title>" +
    "<link rel=\"stylesheet\" href=\"/assets/site.18ac.css\"></head><body><h1>" +
    label + "</h1><img src=\"/assets/card.72af.webp\"><img srcset=\"/assets/hero-a.3c.avif 1x, /assets/hero-b.4d.avif 2x\">" +
    "<script src=\"/assets/app.8f2a.js\"></script><style>.inline{background:url('/assets/inline.2b.svg')}</style></body></html>"
  );
  const files = [
    ["home.html", html, "text/html"],
    ["assets/asset.txt", new TextEncoder().encode("asset " + label), "text/plain"],
    ["assets/site.18ac.css", new TextEncoder().encode("@import '/assets/base.28d.css'; .hero{background-image:url(\"/assets/background.19ac.svg\");}"), "text/css"],
    ["assets/app.8f2a.js", new TextEncoder().encode("const image = '/assets/card.72af.webp';"), "text/javascript"],
    ["assets/card.72af.webp", new TextEncoder().encode("fake webp " + label), "image/webp"],
    ["assets/hero-a.3c.avif", new TextEncoder().encode("hero a " + label), "image/avif"],
    ["assets/hero-b.4d.avif", new TextEncoder().encode("hero b " + label), "image/avif"],
    ["assets/inline.2b.svg", new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"/>") , "image/svg+xml"],
    ["assets/base.28d.css", new TextEncoder().encode(".base{background:url(/assets/background.19ac.svg)}"), "text/css"],
    ["assets/background.19ac.svg", new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"/>") , "image/svg+xml"]
  ];
  const totalBytes = files.reduce((sum, [, bytes]) => sum + bytes.byteLength, 0);
  const begun = await jsonRequest("begin", {
    name: "Smoke test",
    entry: "home.html",
    fileCount: files.length,
    totalBytes
  });
  for (const [path, bytes, type] of files) {
    const form = new FormData();
    form.set("slug", slug);
    form.set("version", begun.version);
    form.set("path", path);
    form.set("file", new File([bytes], path, { type }));
    const response = await checkedFetch("/api/hosp", {
      method: "POST",
      headers: { Cookie: cookie, Origin: base },
      body: form
    });
    if (!response.ok) throw new Error("Upload " + path + " returned " + response.status + ": " + await response.text());
  }
  return jsonRequest("publish", {
    name: "Smoke test",
    version: begun.version,
    entry: "home.html"
  });
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error("Dev server exited before becoming ready.");
    try {
      const response = await checkedFetch("/");
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(500);
  }
  if (!ready) throw new Error("Preview did not start at " + base);

  const home = await checkedFetch("/");
  const homeHtml = await home.text();
  if (!homeHtml.includes("Girofy")) throw new Error("The official home page was not served.");
  const solution = await checkedFetch("/software-sob-medida.html");
  if (!solution.ok) throw new Error("An existing official page returned " + solution.status + ".");
  const dashboard = await checkedFetch("/hosp");
  if (!dashboard.ok) throw new Error("The dashboard returned " + dashboard.status + ".");

  const anonymous = await checkedFetch("/api/hosp");
  if (anonymous.status !== 401) throw new Error("Anonymous API access returned " + anonymous.status + ".");
  const wrongKey = await checkedFetch("/api/hosp", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", key: "wrong-key" })
  });
  if (wrongKey.status !== 401 || (await wrongKey.json()).error !== "key_invalid") {
    throw new Error("An invalid access key was not rejected.");
  }
  const login = await checkedFetch("/api/hosp", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", key: "smoke-test-key" })
  });
  if (!login.ok) throw new Error("The shared access key was not accepted.");
  const setCookie = login.headers.get("set-cookie") ?? "";
  cookie = setCookie.split(";")[0];
  if (!cookie) throw new Error("The key login did not set a session cookie.");

  const projectsResponse = await checkedFetch("/api/hosp", { headers: { Cookie: cookie } });
  if (!projectsResponse.ok) throw new Error("Owner project listing returned " + projectsResponse.status + ".");

  const first = await publish("version-one");
  const firstVersion = first.project.activeVersion;
  const liveOne = await checkedFetch("/" + slug + "/");
  const liveOneHtml = await liveOne.text();
  if (!liveOne.ok || !liveOneHtml.includes("version-one") ||
      !liveOneHtml.includes("/" + slug + "/assets/card.72af.webp") ||
      !liveOneHtml.includes("/" + slug + "/assets/hero-b.4d.avif 2x") ||
      !liveOneHtml.includes("/" + slug + "/assets/inline.2b.svg")) {
    throw new Error("Hashed HTML image paths and both srcset candidates were not scoped to the project.");
  }
  if (!liveOne.headers.get("content-security-policy")?.includes("sandbox")) {
    throw new Error("Published HTML was not isolated by CSP sandbox.");
  }
  const assetOne = await checkedFetch("/" + slug + "/assets/asset.txt");
  if ((await assetOne.text()) !== "asset version-one") throw new Error("A published static asset could not be served.");
  const imageOne = await checkedFetch("/" + slug + "/assets/card.72af.webp");
  if (imageOne.headers.get("content-type") !== "image/webp" || !(await imageOne.text()).includes("version-one")) {
    throw new Error("A hashed image file was not served with its image MIME type.");
  }
  const cssOne = await checkedFetch("/" + slug + "/assets/site.18ac.css");
  const cssOneText = await cssOne.text();
  if (!cssOneText.includes("/" + slug + "/assets/background.19ac.svg") ||
      !cssOneText.includes("/" + slug + "/assets/base.28d.css")) {
    throw new Error("Root-relative CSS image or import paths were not scoped to the project.");
  }
  const scriptOne = await checkedFetch("/" + slug + "/assets/app.8f2a.js");
  if (!(await scriptOne.text()).includes("/" + slug + "/assets/card.72af.webp")) {
    throw new Error("A hashed asset reference inside a JavaScript bundle was not scoped to the project.");
  }

  await publish("version-two");
  const liveTwo = await checkedFetch("/" + slug + "/");
  if (!(await liveTwo.text()).includes("version-two")) throw new Error("The next version did not become active.");

  await jsonRequest("restore", { version: firstVersion });
  const restored = await checkedFetch("/" + slug + "/");
  if (!(await restored.text()).includes("version-one")) throw new Error("Version restore did not switch the active site.");

  await jsonRequest("delete");
  const afterDelete = await checkedFetch("/" + slug + "/");
  if (afterDelete.status !== 404) throw new Error("The project was not removed from its public route.");
  slug = "files-" + Date.now().toString(36);
  const fileOnly = new TextEncoder().encode("plain file");
  const fileOnlyStart = await jsonRequest("begin", {
    name: "Files without HTML",
    entry: "",
    fileCount: 1,
    totalBytes: fileOnly.byteLength
  });
  const fileOnlyForm = new FormData();
  fileOnlyForm.set("slug", slug);
  fileOnlyForm.set("version", fileOnlyStart.version);
  fileOnlyForm.set("path", "manual.txt");
  fileOnlyForm.set("file", new File([fileOnly], "manual.txt", { type: "text/plain" }));
  const fileOnlyUpload = await checkedFetch("/api/hosp", {
    method: "POST",
    headers: { Cookie: cookie, Origin: base },
    body: fileOnlyForm
  });
  if (!fileOnlyUpload.ok) throw new Error("A file-only site upload returned " + fileOnlyUpload.status + ".");
  await jsonRequest("publish", {
    name: "Files without HTML", version: fileOnlyStart.version, entry: ""
  });
  const fileOnlyPage = await checkedFetch("/" + slug + "/");
  if (!(await fileOnlyPage.text()).includes("manual.txt")) {
    throw new Error("A project without HTML did not get its generated file list.");
  }
  await jsonRequest("delete");
  slug = "";
  console.log("Smoke test passed: key-protected API, upload, hashed HTML/JS/CSS assets, srcset, restore, and delete.");
} catch (error) {
  failure = error;
} finally {
  if (slug && cookie) {
    try { await jsonRequest("delete"); } catch {}
  }
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(3000)
  ]);
  if (hadDevVars) writeFileSync(devVarsPath, previousDevVars);
  else rmSync(devVarsPath, { force: true });
}

if (failure) {
  console.error(failure instanceof Error ? failure.message : failure);
  process.exitCode = 1;
}
