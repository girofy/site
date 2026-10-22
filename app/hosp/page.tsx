"use client";

import { unzipSync } from "fflate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Version = {
  version: string;
  entry: string;
  publishedAt: string;
  fileCount: number;
  totalBytes: number;
};

type Project = {
  slug: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  activeVersion: string | null;
  entry: string | null;
  publishedAt: string | null;
  fileCount: number;
  totalBytes: number;
  versions: Version[];
};

type StagedFile = { path: string; file: File };
type AuthState = "checking" | "ready" | "key-required" | "setup-error";
const NETLIFY_HOME = "https://app.netlify.com/";
const NETLIFY_LINK_KEY = "girofy-hosp-netlify-link";
const NETLIFY_VISIBLE_KEY = "girofy-hosp-netlify-visible";
const MAX_FILES = 500;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SITE_BYTES = 50 * 1024 * 1024;

export default function HospPage() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [adminKey, setAdminKey] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [archiveFiles, setArchiveFiles] = useState<StagedFile[]>([]);
  const [archiveRoots, setArchiveRoots] = useState<string[]>([]);
  const [archiveRoot, setArchiveRoot] = useState("");
  const [netlifyUrl, setNetlifyUrl] = useState(NETLIFY_HOME);
  const [netlifyUrlDraft, setNetlifyUrlDraft] = useState(NETLIFY_HOME);
  const [netlifyVisible, setNetlifyVisible] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [entry, setEntry] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [completedBytes, setCompletedBytes] = useState(0);
  const [completedFiles, setCompletedFiles] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renaming, setRenaming] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [restoreFor, setRestoreFor] = useState("");
  const [restoreVersion, setRestoreVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const zipInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const totalBytes = useMemo(
    () => files.reduce((total, item) => total + item.file.size, 0),
    [files]
  );
  const htmlFiles = useMemo(
    () => files.filter((item) => item.path.toLowerCase().endsWith(".html")),
    [files]
  );

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ projects: Project[] }>("/api/hosp");
      setProjects(result.projects);
      setAuth("ready");
    } catch (error) {
      const reason = error instanceof ApiError ? error.reason : "";
      if (reason === "key_required" || reason === "key_invalid") setAuth("key-required");
      else if (reason === "admin_key_not_configured") setAuth("setup-error");
      else setMessage(readError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/api/hosp", {
        method: "POST",
        body: JSON.stringify({ action: "login", key: adminKey })
      });
      setAdminKey("");
      await loadProjects();
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setBusy(false);
    }
  }

  async function lockPanel() {
    try {
      await api("/api/hosp", { method: "POST", body: JSON.stringify({ action: "logout" }) });
    } catch (error) {
      setMessage(readError(error));
    }
    setProjects([]);
    setAuth("key-required");
  }

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem(NETLIFY_LINK_KEY);
      const safeUrl = savedUrl ? normalizeHttpsUrl(savedUrl) : null;
      if (safeUrl) {
        setNetlifyUrl(safeUrl);
        setNetlifyUrlDraft(safeUrl);
      }
      setNetlifyVisible(localStorage.getItem(NETLIFY_VISIBLE_KEY) !== "false");
    } catch {
      // O atalho continua disponível com o endereço padrão se o armazenamento local estiver bloqueado.
    }
  }, []);

  const prepareFiles = useCallback((incoming: StagedFile[], note = "") => {
    const valid: StagedFile[] = [];
    const blocked: string[] = [];
    const seen = new Set<string>();
    for (const item of incoming) {
      const path = normalizePath(item.path);
      if (!path || isBlockedPath(path) || path.split("/").some((part) => part.startsWith("."))) {
        blocked.push(item.path);
        continue;
      }
      if (item.file.size > MAX_FILE_BYTES) {
        setMessage("“" + path + "” passa do limite de 10 MB por arquivo.");
        continue;
      }
      if (!seen.has(path)) {
        seen.add(path);
        valid.push({ path, file: item.file });
      }
    }
    if (valid.length > MAX_FILES) {
      setMessage("A publicação aceita até 500 arquivos. Remova alguns itens e tente de novo.");
      return;
    }
    const bytes = valid.reduce((total, item) => total + item.file.size, 0);
    if (bytes > MAX_SITE_BYTES) {
      setMessage("A publicação aceita até 50 MB no total.");
      return;
    }
    const selectedEntry = valid.find((item) => item.path.toLowerCase() === "index.html") ??
      valid.find((item) => item.path.toLowerCase().endsWith(".html"));
    setFiles(valid);
    setEntry(selectedEntry?.path ?? "");
    setMessage(blocked.length
      ? "Arquivos protegidos foram ignorados (" + blocked.length + "). " + note
      : note);
  }, []);

  const handleOrdinaryFiles = useCallback((list: FileList | File[]) => {
    setArchiveFiles([]);
    setArchiveRoots([]);
    setArchiveRoot("");
    const incoming = Array.from(list).map((file) => {
      const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      return { path: relative, file };
    });
    prepareFiles(stripCommonRoot(incoming));
  }, [prepareFiles]);

  const handleZip = useCallback(async (file?: File) => {
    if (!file) return;
    setFiles([]);
    setEntry("");
    setArchiveFiles([]);
    setArchiveRoots([]);
    setArchiveRoot("");
    setMessage("Conferindo o ZIP e separando os arquivos…");
    try {
      if (file.size > MAX_SITE_BYTES) throw new Error("O ZIP pode ocupar até 50 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const names = inspectZip(bytes);
      const unpacked = unzipSync(bytes);
      const entries: StagedFile[] = Object.entries(unpacked)
        .filter(([path]) => !path.endsWith("/"))
        .map(([path, data]) => {
          const safePath = normalizePath(path);
          const actual = data instanceof Uint8Array ? data : new Uint8Array(data);
          const fileBuffer = new ArrayBuffer(actual.byteLength);
          new Uint8Array(fileBuffer).set(actual);
          return {
            path: safePath,
            file: new File([fileBuffer], safePath.split("/").pop() || "arquivo", {
              type: mimeType(safePath)
            })
          };
        });
      const fileNames = new Set(entries.map((item) => item.path));
      if (names.some((path) => !fileNames.has(path))) {
        throw new Error("O ZIP contém arquivos que não puderam ser lidos.");
      }
      const normalizedEntries = stripCommonRoot(entries);
      const roots = discoverZipRoots(normalizedEntries);
      const root = chooseZipRoot(normalizedEntries, roots);
      setArchiveFiles(normalizedEntries);
      setArchiveRoots(roots);
      setArchiveRoot(root);
      const selected = filesForRoot(normalizedEntries, root);
      prepareFiles(selected, root
        ? "ZIP lido. Detectei a pasta de publicação “" + root + "/”."
        : "ZIP lido. Detectei os arquivos de publicação na raiz.");
    } catch (error) {
      setMessage(readError(error, "Não consegui abrir esse ZIP. Confira o arquivo e tente novamente."));
    }
  }, [prepareFiles]);

  function changeZipRoot(root: string) {
    setArchiveRoot(root);
    prepareFiles(filesForRoot(archiveFiles, root), root
      ? "Usando “" + root + "/” como pasta de publicação."
      : "Usando a raiz completa do ZIP.");
  }

  function saveNetlifyShortcut() {
    const safeUrl = normalizeHttpsUrl(netlifyUrlDraft);
    if (!safeUrl) {
      setMessage("Cole um endereço HTTPS válido para o atalho da Netlify.");
      return;
    }
    setNetlifyUrl(safeUrl);
    setNetlifyUrlDraft(safeUrl);
    try { localStorage.setItem(NETLIFY_LINK_KEY, safeUrl); } catch {}
    setMessage("Atalho da Netlify atualizado neste aparelho.");
  }

  function toggleNetlifyShortcut(visible: boolean) {
    setNetlifyVisible(visible);
    try { localStorage.setItem(NETLIFY_VISIBLE_KEY, String(visible)); } catch {}
  }

  async function publish() {
    setMessage("");
    const normalizedSlug = slugify(slug || name);
    if (!files.length) {
      setMessage("Escolha um ZIP, uma pasta ou arquivos para publicar.");
      return;
    }
    if (!normalizedSlug) {
      setMessage("Escolha um nome curto para o endereço do site.");
      return;
    }
    if (totalBytes > MAX_SITE_BYTES) {
      setMessage("A publicação aceita até 50 MB no total.");
      return;
    }
    if (files.some((item) => item.file.size > MAX_FILE_BYTES)) {
      setMessage("Cada arquivo pode ocupar até 10 MB.");
      return;
    }

    setBusy(true);
    setCompletedBytes(0);
    setCompletedFiles(0);
    try {
      const begin = await api<{ version: string }>("/api/hosp", {
        method: "POST",
        body: JSON.stringify({
          action: "begin", slug: normalizedSlug,
          name: name.trim() || normalizedSlug, entry,
          fileCount: files.length, totalBytes
        })
      });
      let next = 0;
      const concurrency = Math.min(5, files.length);
      async function uploadWorker() {
        while (true) {
          const index = next++;
          if (index >= files.length) return;
          const item = files[index];
          const body = new FormData();
          body.set("slug", normalizedSlug);
          body.set("version", begin.version);
          body.set("path", item.path);
          body.set("file", item.file, item.path.split("/").pop() || item.file.name);
          await api("/api/hosp", { method: "POST", body });
          setCompletedBytes((value) => value + item.file.size);
          setCompletedFiles((value) => value + 1);
        }
      }
      await Promise.all(Array.from({ length: concurrency }, () => uploadWorker()));
      const result = await api<{ project: Project }>("/api/hosp", {
        method: "POST",
        body: JSON.stringify({
          action: "publish", slug: normalizedSlug,
          name: name.trim() || normalizedSlug,
          version: begin.version, entry
        })
      });
      setProjects((current) => [
        result.project,
        ...current.filter((project) => project.slug !== result.project.slug)
      ]);
      setFiles([]);
      setArchiveFiles([]);
      setArchiveRoots([]);
      setArchiveRoot("");
      setEntry("");
      setName("");
      setSlug("");
      setSlugEdited(false);
      setMessage("Publicado. Seu site está no ar em girofy.site/" + result.project.slug);
      if (zipInput.current) zipInput.current.value = "";
      if (filesInput.current) filesInput.current.value = "";
      if (folderInput.current) folderInput.current.value = "";
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setBusy(false);
    }
  }

  async function rename(project: Project) {
    const nextName = renameValue.trim();
    if (!nextName) return;
    try {
      await api("/api/hosp", {
        method: "POST",
        body: JSON.stringify({ action: "rename", slug: project.slug, name: nextName })
      });
      setProjects((current) => current.map((item) =>
        item.slug === project.slug ? { ...item, name: nextName } : item
      ));
      setRenaming("");
      setMessage("Nome do projeto atualizado.");
    } catch (error) {
      setMessage(readError(error));
    }
  }

  async function restore(project: Project) {
    if (!restoreVersion) return;
    try {
      await api("/api/hosp", {
        method: "POST",
        body: JSON.stringify({
          action: "restore", slug: project.slug, version: restoreVersion
        })
      });
      setMessage("Versão restaurada e publicada.");
      setRestoreFor("");
      setRestoreVersion("");
      await loadProjects();
    } catch (error) {
      setMessage(readError(error));
    }
  }

  async function remove(project: Project) {
    if (!window.confirm("Apagar “" + project.name + "” e todas as suas versões?")) return;
    try {
      await api("/api/hosp", {
        method: "POST",
        body: JSON.stringify({ action: "delete", slug: project.slug })
      });
      setProjects((current) => current.filter((item) => item.slug !== project.slug));
      setMessage("Projeto apagado.");
    } catch (error) {
      setMessage(readError(error));
    }
  }

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length === 1 && /\.zip$/i.test(dropped[0].name)) {
      void handleZip(dropped[0]);
    } else if (dropped.length) {
      handleOrdinaryFiles(dropped);
    }
  };

  if (loading && auth === "checking") {
    return <main className="gate"><GirofyMark /><p>Preparando seu espaço…</p></main>;
  }
  if (auth !== "ready") {
    return (
      <main className="gate">
        <GirofyMark />
        <div className="gate-copy">
          <p className="eyebrow">GIROFY / HOSPEDAGEM</p>
          <h1>{auth === "key-required" ? "Abra seu painel." :
            auth === "setup-error" ? "Acesso indisponível." : "Não foi possível abrir o painel."}</h1>
          <p>{auth === "key-required"
            ? "Sem conta e sem cadastro. Use sua chave de acesso."
            : auth === "setup-error"
              ? "A chave do painel ainda não foi configurada."
              : message || "Tente atualizar a página."}</p>
          {auth === "key-required" && (
            <form className="gate-form" onSubmit={(event) => void unlock(event)}>
              <label className="eyebrow" htmlFor="admin-key">CHAVE DO PAINEL</label>
              <input
                id="admin-key"
                className="field"
                type="password"
                autoComplete="current-password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                required
                autoFocus
              />
              {message && <p role="alert" className="gate-error">{message}</p>}
              <button className="button button-light" type="submit" disabled={busy || !adminKey}>
                {busy ? "Verificando…" : "Abrir painel"} <ArrowIcon />
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <a className="brand" href="https://girofy.site/" aria-label="Girofy, página inicial">
          <GirofyMark /><span>GIROFY</span><i></i><span className="brand-muted">HOSTING</span>
        </a>
        <div className="topbar-actions">
          <button className="button button-outline settings-trigger" onClick={() => setSettingsOpen((value) => !value)}>
            <SlidersIcon /> Configurações
          </button>
          <button className="quiet-link signout" onClick={() => void lockPanel()}>Bloquear painel</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">SEU ESPAÇO DE PUBLICAÇÃO</p>
          <h1>Seus sites.<br /><span>No ar.</span></h1>
          <p className="hero-description">Envie os arquivos. Escolha o endereço. Publique.</p>
        </div>
        <div className="hero-note">
          <span className="status-dot"></span>
          <span>PUBLICAÇÃO ESTÁTICA</span>
          <p>Seu site fica disponível em um endereço simples dentro de girofy.site.</p>
        </div>
      </section>

      {settingsOpen && (
        <section className="settings-panel" aria-label="Configurações da hospedagem">
          <div>
            <p className="eyebrow">CONFIGURAÇÕES</p>
            <h2>Seu espaço de hospedagem</h2>
            <p>Até 50 MB e 500 arquivos por publicação. Cada arquivo pode ter até 10 MB. Mantemos as 12 versões mais recentes de cada projeto.</p>
          </div>
          <div className="settings-grid">
            <div><strong>Arquivos estáticos</strong><span>HTML, CSS, JavaScript, imagens, fontes, áudio e vídeo.</span></div>
            <div><strong>Arquivos protegidos</strong><span>Segredos, chaves privadas e pastas de dependências são recusados.</span></div>
            <div><strong>Build NPM</strong><span>Envie a saída já compilada em dist/, build/ ou out/. O painel detecta a pasta e ajusta caminhos de assets com hash. Ele não executa scripts ou código de servidor enviados.</span></div>
            <div><strong>Armazenamento</strong><span>Arquivos e versões ficam no armazenamento do Site.</span></div>
          </div>
          <div className="netlify-settings">
            <div>
              <p className="eyebrow">ATALHO FLUTUANTE</p>
              <h3>Netlify</h3>
              <p>Escolha para onde o botão da Netlify deve levar. O endereço fica salvo neste aparelho.</p>
              <label className="netlify-toggle">
                <input type="checkbox" checked={netlifyVisible} onChange={(event) => toggleNetlifyShortcut(event.target.checked)} />
                <span>Mostrar botão flutuante</span>
              </label>
            </div>
            <div className="netlify-url-editor">
              <label className="field-label" htmlFor="netlify-url">Destino do botão</label>
              <input
                id="netlify-url"
                className="field"
                type="url"
                inputMode="url"
                autoComplete="url"
                value={netlifyUrlDraft}
                onChange={(event) => setNetlifyUrlDraft(event.target.value)}
                placeholder={NETLIFY_HOME}
              />
              <button className="button button-outline" type="button" onClick={saveNetlifyShortcut}>Salvar destino</button>
            </div>
          </div>
        </section>
      )}

      <section className="publish-section" aria-labelledby="publish-title">
        <div className="section-heading">
          <div><p className="eyebrow">NOVO PROJETO</p><h2 id="publish-title">Coloque seu site no ar</h2></div>
          <span className="section-count">01 / PUBLICAR</span>
        </div>

        <div className="publish-grid">
          <div className="drop-column">
            <div
              className={"drop-zone" + (dragging ? " is-dragging" : "") + (files.length ? " has-files" : "")}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
              onDrop={onDrop}
            >
              <div className="upload-glyph"><UploadIcon /></div>
              <h3>{files.length ? files.length + " arquivos prontos" : "Solte seus arquivos aqui"}</h3>
              <p>{files.length
                ? formatBytes(totalBytes) + (htmlFiles.length ? " · " + htmlFiles.length + " páginas HTML" : " · criaremos uma página de arquivos")
                : "ZIP, pasta ou arquivos do seu site."}</p>
              {!files.length ? (
                <div className="file-actions">
                  <button className="button button-light" onClick={() => zipInput.current?.click()}>Escolher ZIP</button>
                  <button className="button button-outline" onClick={() => folderInput.current?.click()}>Escolher pasta</button>
                  <button className="text-button" onClick={() => filesInput.current?.click()}>Selecionar arquivos</button>
                </div>
              ) : (
                <button className="text-button replace-files" onClick={() => zipInput.current?.click()}>
                  Trocar arquivos
                </button>
              )}
              <p className="drop-limit">Até 50 MB por publicação · máximo de 500 arquivos</p>
            </div>
            {archiveRoots.length > 0 && files.length > 0 && (
              <div className="zip-root-control">
                <div>
                  <label className="field-label" htmlFor="zip-root">Pasta do site no ZIP</label>
                  <p>Escolhi a saída final automaticamente. Selecione outra pasta para ajustar o que será publicado.</p>
                </div>
                <select id="zip-root" className="field select-field" value={archiveRoot} disabled={busy} onChange={(event) => changeZipRoot(event.target.value)}>
                  {archiveRoots.map((root) => <option key={root || "__root__"} value={root}>{root ? root + "/" : "Raiz completa do ZIP"}</option>)}
                </select>
              </div>
            )}
            {files.length > 0 && (
              <div className="staged-summary">
                <span>{files.length} arquivos incluídos</span>
                <button className="text-button" onClick={() => { setFiles([]); setEntry(""); setArchiveFiles([]); setArchiveRoots([]); setArchiveRoot(""); }}>
                  Limpar
                </button>
              </div>
            )}
            <input ref={zipInput} className="visually-hidden" type="file" accept=".zip,application/zip" onChange={(event) => void handleZip(event.target.files?.[0])} />
            <input ref={filesInput} className="visually-hidden" type="file" multiple onChange={(event) => event.target.files && handleOrdinaryFiles(event.target.files)} />
            <input ref={folderInput} className="visually-hidden" type="file" multiple onChange={(event) => event.target.files && handleOrdinaryFiles(event.target.files)} {...({ webkitdirectory: "", directory: "" } as object)} />
          </div>

          <div className="project-settings">
            <label className="field-label" htmlFor="project-name">Nome do projeto</label>
            <input id="project-name" className="field" value={name} onChange={(event) => {
              const value = event.target.value;
              setName(value);
              if (!slugEdited) setSlug(slugify(value));
            }} placeholder="Meu novo site" maxLength={60} />

            <label className="field-label" htmlFor="project-slug">Endereço do site</label>
            <div className="slug-field">
              <span>girofy.site/</span>
              <input id="project-slug" value={slug} onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }} placeholder="meu-site" maxLength={40} />
            </div>
            <p className="field-help">Use letras minúsculas, números e hífens.</p>

            {htmlFiles.length > 0 && (
              <>
                <label className="field-label" htmlFor="entry-file">Página inicial</label>
                <select id="entry-file" className="field select-field" value={entry} onChange={(event) => setEntry(event.target.value)}>
                  {htmlFiles.map((item) => <option key={item.path} value={item.path}>{item.path}</option>)}
                </select>
              </>
            )}
            {!htmlFiles.length && files.length > 0 && (
              <div className="info-note">Não encontrei HTML. Vou criar uma página simples com links para os arquivos enviados.</div>
            )}

            <button className="button button-light publish-button" onClick={() => void publish()} disabled={busy || !files.length}>
              {busy ? <><Spinner /> Enviando {completedFiles}/{files.length}</> : <>Publicar site <ArrowIcon /></>}
            </button>
            {busy && (
              <div className="progress-wrap" aria-live="polite">
                <div className="progress-track"><span style={{ width: Math.min(100, totalBytes ? (completedBytes / totalBytes) * 100 : 100) + "%" }}></span></div>
                <span>{completedFiles} de {files.length} arquivos enviados</span>
              </div>
            )}
            <p className="privacy-note"><LockIcon /> Seus envios ficam disponíveis publicamente no endereço escolhido.</p>
          </div>
        </div>
      </section>

      {message && <div className="notice" role="status"><span>{message}</span><button aria-label="Fechar aviso" onClick={() => setMessage("")}>×</button></div>}

      <section className="projects-section" aria-labelledby="projects-title">
        <div className="section-heading">
          <div><p className="eyebrow">SEU CATÁLOGO</p><h2 id="projects-title">Projetos publicados</h2></div>
          <span className="section-count">{projects.length.toString().padStart(2, "0")} / 50 PROJETOS</span>
        </div>
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-mark"><GirofyMark /></div>
            <div><h3>Seu primeiro projeto começa aqui.</h3><p>Quando publicar, ele aparece nesta lista com endereço, versão e opções de edição.</p></div>
          </div>
        ) : (
          <div className="project-list">
            {projects.map((project, index) => (
              <article className="project-card" key={project.slug}>
                <div className="project-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="project-main">
                  {renaming === project.slug ? (
                    <form className="rename-form" onSubmit={(event) => { event.preventDefault(); void rename(project); }}>
                      <input className="field rename-input" value={renameValue} autoFocus onChange={(event) => setRenameValue(event.target.value)} aria-label="Novo nome do projeto" maxLength={60} />
                      <button className="text-button" type="submit">Salvar</button>
                      <button className="text-button" type="button" onClick={() => setRenaming("")}>Cancelar</button>
                    </form>
                  ) : <h3>{project.name}</h3>}
                  <a className="project-url" href={project.url} target="_blank" rel="noreferrer">
                    girofy.site/{project.slug} <ExternalIcon />
                  </a>
                  <div className="project-meta">
                    <span className={"project-status" + (project.activeVersion ? "" : " is-draft")}>
                      <i></i>{project.activeVersion ? "Publicado" : "Aguardando arquivos"}
                    </span>
                    {project.activeVersion && <span>{project.fileCount} arquivos</span>}
                    {project.activeVersion && <span>{formatBytes(project.totalBytes)}</span>}
                    {project.publishedAt && <span>Atualizado {formatDate(project.publishedAt)}</span>}
                  </div>
                </div>
                <div className="project-actions">
                  {project.activeVersion && <a className="button button-outline open-button" href={project.url} target="_blank" rel="noreferrer">Abrir <ArrowIcon /></a>}
                  <button className="icon-button" title="Renomear projeto" aria-label={"Renomear " + project.name} onClick={() => {
                    setRenaming(project.slug); setRenameValue(project.name);
                  }}><EditIcon /></button>
                  {project.versions.length > 1 && (
                    <button className="icon-button" title="Versões anteriores" aria-label={"Versões de " + project.name} onClick={() => {
                      setRestoreFor(restoreFor === project.slug ? "" : project.slug);
                      setRestoreVersion(project.versions[1]?.version ?? "");
                    }}><HistoryIcon /></button>
                  )}
                  <button className="icon-button danger-button" title="Apagar projeto" aria-label={"Apagar " + project.name} onClick={() => void remove(project)}><TrashIcon /></button>
                </div>
                {restoreFor === project.slug && (
                  <div className="restore-row">
                    <label htmlFor={"version-" + project.slug}>Versão para restaurar</label>
                    <select id={"version-" + project.slug} className="field" value={restoreVersion} onChange={(event) => setRestoreVersion(event.target.value)}>
                      {project.versions.filter((version) => version.version !== project.activeVersion).map((version) => (
                        <option key={version.version} value={version.version}>
                          {formatDate(version.publishedAt)} · {version.fileCount} arquivos
                        </option>
                      ))}
                    </select>
                    <button className="button button-outline" onClick={() => void restore(project)}>Restaurar versão</button>
                    <button className="text-button" onClick={() => setRestoreFor("")}>Cancelar</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <GirofyMark />
        <span>GIROFY · PUBLICAÇÃO SIMPLES</span>
        <a href="https://girofy.site/" target="_blank" rel="noreferrer">girofy.site <ExternalIcon /></a>
      </footer>
      {netlifyVisible && (
        <a className="netlify-fab" href={netlifyUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir Netlify em outra aba">
          <span className="netlify-symbol"><NetlifyIcon /></span>
          <span>NETLIFY</span>
          <ExternalIcon />
        </a>
      )}
    </main>
  );
}

class ApiError extends Error {
  constructor(message: string, readonly reason: string) { super(message); }
}

async function api<T = void>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const reason = typeof data.error === "string" ? data.error : "";
    const message = typeof data.message === "string" ? data.message :
      typeof data.error === "string" && ![
        "key_required", "key_invalid", "admin_key_not_configured"
      ].includes(data.error) ? data.error : response.statusText || "Não foi possível concluir.";
    throw new ApiError(message, reason);
  }
  return data as T;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function stripCommonRoot(items: StagedFile[]): StagedFile[] {
  if (!items.length) return items;
  const firstParts = items.map((item) => item.path.split("/"));
  const root = firstParts[0][0];
  if (!root || firstParts.some((parts) => parts.length < 2 || parts[0] !== root)) return items;
  return items.map((item) => ({ ...item, path: item.path.slice(root.length + 1) }));
}

function discoverZipRoots(items: StagedFile[]): string[] {
  const roots = new Set<string>([""]);
  for (const item of items) {
    const parts = item.path.split("/");
    if (parts.length > 1) roots.add(parts[0]);
    if (parts.length > 1 && /\.html?$/i.test(parts.at(-1) ?? "")) {
      roots.add(parts.slice(0, -1).join("/"));
    }
  }
  const hasHtml = (root: string) => items.some((item) =>
    (root === "" || item.path.startsWith(root + "/")) && /\.html?$/i.test(item.path)
  );
  const options = [...roots].filter((root) => root === "" || hasHtml(root));
  const buildPriority: Record<string, number> = { dist: 0, build: 1, out: 2, public: 3, site: 4, www: 5 };
  return options.sort((left, right) => {
    if (!left) return -1;
    if (!right) return 1;
    const leftBase = left.split("/").at(-1)?.toLowerCase() ?? "";
    const rightBase = right.split("/").at(-1)?.toLowerCase() ?? "";
    return (buildPriority[leftBase] ?? 10) - (buildPriority[rightBase] ?? 10) || left.localeCompare(right);
  });
}

function chooseZipRoot(items: StagedFile[], roots: string[]): string {
  const directIndex = (root: string) => {
    const indexPath = (root ? root + "/" : "") + "index.html";
    return items.some((item) => item.path.toLowerCase() === indexPath.toLowerCase());
  };
  const basename = (root: string) => root.split("/").at(-1)?.toLowerCase() ?? "";
  for (const wanted of ["dist", "build", "out"]) {
    const found = roots.find((root) => root && basename(root) === wanted && directIndex(root));
    if (found) return found;
  }
  if (directIndex("")) return "";
  for (const root of roots) if (root && directIndex(root)) return root;
  for (const wanted of ["dist", "build", "out", "public", "site", "www"]) {
    const found = roots.find((root) => root && basename(root) === wanted);
    if (found) return found;
  }
  return roots.find(Boolean) ?? "";
}

function filesForRoot(items: StagedFile[], root: string): StagedFile[] {
  if (!root) return items;
  const prefix = root + "/";
  return items.filter((item) => item.path.startsWith(prefix))
    .map((item) => ({ ...item, path: item.path.slice(prefix.length) }));
}

function normalizeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
}

function isBlockedPath(path: string): boolean {
  const parts = path.toLowerCase().split("/");
  const file = parts.at(-1) ?? "";
  return parts.some((part) =>
    part === ".git" || part === ".next" || part === "node_modules" ||
    part === ".vercel" || part === ".wrangler" || part === ".ssh" ||
    part === "__macosx"
  ) || file === ".ds_store" || file === ".npmrc" || file === ".netrc" ||
    file === ".env" || file.startsWith(".env.") || file.endsWith(".pem") ||
    file.endsWith(".key") || file.endsWith(".p12") || file.endsWith(".pfx");
}

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-").slice(0, 40).replace(/-+$/g, "");
}

function inspectZip(data: Uint8Array): string[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let eocd = -1;
  const start = Math.max(0, data.length - 65_557);
  for (let offset = data.length - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("Este ZIP não parece válido.");
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) {
    throw new Error("ZIP dividido em partes não é compatível.");
  }
  const entries = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  let offset = view.getUint32(eocd + 16, true);
  if (entries === 0xffff || centralSize === 0xffffffff || offset === 0xffffffff || entries > MAX_FILES + 50) {
    throw new Error("ZIP64 ou ZIP com mais de 500 arquivos não é compatível.");
  }
  const names: string[] = [];
  let declaredBytes = 0;
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > data.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("O índice central do ZIP está incompleto.");
    }
    const madeBy = view.getUint16(offset + 4, true);
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const uncompressed = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    if (flags & 1 || (method !== 0 && method !== 8) || compressed === 0xffffffff || uncompressed === 0xffffffff) {
      throw new Error("O ZIP usa compressão ou criptografia não compatível.");
    }
    const rawName = new TextDecoder().decode(data.subarray(offset + 46, offset + 46 + nameLength));
    const path = normalizePath(rawName);
    const mode = externalAttributes >>> 16;
    const isUnixSymlink = ((madeBy >>> 8) === 3) && ((mode & 0xf000) === 0xa000);
    if (isUnixSymlink) throw new Error("Atalhos simbólicos não podem ser publicados.");
    if (!path.startsWith("__macosx/") && !path.endsWith("/")) {
      if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === "." || part.includes(":"))) {
        throw new Error("O ZIP contém um caminho de arquivo inseguro.");
      }
      if (!isBlockedPath(path)) {
        declaredBytes += uncompressed;
        if (uncompressed > MAX_FILE_BYTES) throw new Error("Um arquivo do ZIP passa do limite de 10 MB.");
        if (declaredBytes > MAX_SITE_BYTES) throw new Error("O conteúdo extraído passa do limite de 50 MB.");
        names.push(path);
      }
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (names.length > MAX_FILES) throw new Error("O ZIP contém mais de 500 arquivos.");
  return names;
}

function mimeType(path: string): string {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  const known: Record<string, string> = {
    ".avif": "image/avif", ".css": "text/css", ".gif": "image/gif",
    ".html": "text/html", ".ico": "image/x-icon", ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg", ".js": "text/javascript", ".mjs": "text/javascript",
    ".json": "application/json", ".m4a": "audio/mp4", ".mp3": "audio/mpeg",
    ".mp4": "video/mp4", ".ogg": "audio/ogg", ".otf": "font/otf", ".pdf": "application/pdf",
    ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain",
    ".ttf": "font/ttf", ".wav": "audio/wav", ".webmanifest": "application/manifest+json",
    ".wasm": "application/wasm", ".webm": "video/webm", ".webp": "image/webp", ".woff": "font/woff",
    ".woff2": "font/woff2", ".xml": "application/xml"
  };
  return known[extension] ?? "application/octet-stream";
}

function formatBytes(value: number): string {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(0) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch { return ""; }
}

function readError(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function GirofyMark() {
  return <span className="girofy-mark" aria-hidden="true"><i /><i /><i /><i /></span>;
}

function NetlifyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32"><path d="M5 4h5l12 14V4h5v24h-5L10 14v14H5z" /></svg>;
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3.5 10h12m-5-5 5 5-5 5" /></svg>;
}
function UploadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32"><path d="M16 22V4m0 0-7 7m7-7 7 7M5 19v8h22v-8" /></svg>;
}
function SlidersIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h14M7 3v4m6 1v4m-3 1v4" /></svg>;
}
function ExternalIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M9 2h5v5M14 2 7 9M12 9v4H3V4h4" /></svg>;
}
function EditIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m4 13-.8 3.8L7 16l9.4-9.4a1.8 1.8 0 0 0-2.6-2.6L4 13Zm8.8-7.1 2.6 2.6" /></svg>;
}
function HistoryIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3.5 9A6.5 6.5 0 1 1 4 13m-.5-8v4h4M10 6v4l2.5 1.5" /></svg>;
}
function TrashIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3.5 5.5h13m-11.5 0 .8 11h8.4l.8-11M7 5.5V3h6v2.5m-4 3v5m2-5v5" /></svg>;
}
function LockIcon() {
  return <svg aria-hidden="true" viewBox="0 0 18 18"><rect x="3.5" y="7.5" width="11" height="8" rx="1.5" /><path d="M6 7.5V5a3 3 0 0 1 6 0v2.5m-3 3v2" /></svg>;
}
function Spinner() {
  return <span className="spinner" aria-hidden="true"></span>;
}
