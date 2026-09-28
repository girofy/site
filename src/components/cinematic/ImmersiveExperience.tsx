import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import type * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import simplex4D from "@/lib/noise4d.glsl?raw";
import { getAttractor, getChapter, getFeaturedProjectIndex, validateScreenshot, type Chapter } from "@/lib/kinetic.js";

gsap.registerPlugin(ScrollTrigger);

const WHATSAPP_NUMBER = "5574981017188";

const PROJECTS = [
  { name: "Óticas do Vale", src: "/portfolio/01-oticas-do-vale.webp" },
  { name: "Norma", src: "/portfolio/02-norma.webp" },
  { name: "Brisa Alta", src: "/portfolio/03-brisa-alta.webp" },
  { name: "Nórdica", src: "/portfolio/04-nordica.webp" },
  { name: "Atlas", src: "/portfolio/05-atlas.webp" },
  { name: "Eixo Fisio", src: "/portfolio/06-eixo-fisio.webp" },
  { name: "Nayane Rodrigues", src: "/portfolio/07-nayane-rodrigues.webp" },
  { name: "Lume Derm", src: "/portfolio/08-lume-derm.webp" },
  { name: "Aura Vet", src: "/portfolio/09-aura-vet.webp" },
  { name: "Vértice", src: "/portfolio/10-vertice.webp" },
  { name: "Auster", src: "/portfolio/11-auster.webp" },
  { name: "Lúmina Casa", src: "/portfolio/12-lumina-casa.webp" },
  { name: "Órbita Visão", src: "/portfolio/13-orbita-visao.webp" },
  { name: "Casa Norte", src: "/portfolio/14-casa-norte.webp" },
];

const METHODS = [
  { title: "Diagnóstico", eyebrow: "01 / LEITURA" },
  { title: "Tese de percepção", eyebrow: "02 / POSIÇÃO" },
  { title: "Direção criativa", eyebrow: "03 / SISTEMA" },
  { title: "Arquitetura narrativa", eyebrow: "04 / EXPERIÊNCIA" },
  { title: "Motion + 3D", eyebrow: "05 / RITMO" },
  { title: "Performance", eyebrow: "06 / ENGENHARIA" },
  { title: "Conversão", eyebrow: "07 / AÇÃO" },
];

const SHOTS: Array<{ id: Chapter; start: number; end: number }> = [
  { id: "singularity", start: 0, end: 0.18 },
  { id: "market", start: 0.13, end: 0.33 },
  { id: "breakout", start: 0.28, end: 0.47 },
  { id: "portfolio", start: 0.42, end: 0.68 },
  { id: "machine", start: 0.62, end: 0.81 },
  { id: "founder", start: 0.76, end: 0.91 },
  { id: "timeline", start: 0.88, end: 1 },
];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const smooth = (n: number) => n * n * (3 - 2 * n);
const range = (p: number, a: number, b: number) => smooth(clamp((p - a) / (b - a), 0, 1));

function openWhatsApp(message: string) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function createEnvironmentTexture(three: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const base = ctx.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, "#55585f");
  base.addColorStop(0.18, "#101216");
  base.addColorStop(0.46, "#c9cbd0");
  base.addColorStop(0.55, "#17191e");
  base.addColorStop(0.82, "#71757e");
  base.addColorStop(1, "#08090b");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const strips = [
    [74, 72, 24, 260, "rgba(255,255,255,.92)"],
    [185, 20, 11, 310, "rgba(255,255,255,.4)"],
    [302, 0, 70, 512, "rgba(7,8,10,.94)"],
    [426, 36, 30, 210, "rgba(255,255,255,.76)"],
    [570, 14, 96, 470, "rgba(8,9,12,.88)"],
    [730, 86, 22, 310, "rgba(255,255,255,.58)"],
    [856, 0, 60, 512, "rgba(12,14,18,.96)"],
    [968, 40, 14, 300, "rgba(255,255,255,.5)"],
  ] as const;
  strips.forEach(([x, y, w, h, color]) => {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.45, color);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  });
  return new three.CanvasTexture(canvas);
}

function makePalette(url: string) {
  return new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return resolve("#9ea7b2");
      ctx.drawImage(image, 0, 0, 32, 32);
      const pixels = ctx.getImageData(0, 0, 32, 32).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 16) {
        r += pixels[i];
        g += pixels[i + 1];
        b += pixels[i + 2];
        count += 1;
      }
      resolve(`#${[r, g, b].map((value) => Math.round(value / count).toString(16).padStart(2, "0")).join("")}`);
    };
    image.onerror = () => resolve("#9ea7b2");
    image.src = url;
  });
}

function ScreenshotScanner({ onContact }: { onContact: (label: string) => void }) {
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [accent, setAccent] = useState("#a9cfff");
  const [complete, setComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseFile = (file?: File) => {
    if (!file) return;
    const verdict = validateScreenshot(file);
    setError(verdict.reason);
    setComplete(false);
    if (!verdict.ok) {
      setPreview("");
      setFileName("");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
  };

  const scan = async () => {
    if (!preview || scanning) return;
    setScanning(true);
    const nextAccent = await makePalette(preview);
    window.setTimeout(() => {
      setAccent(nextAccent);
      setScanning(false);
      setComplete(true);
    }, 850);
  };

  return (
    <section className="scanLab" id="scanner" aria-labelledby="scan-title" style={{ "--scan-accent": accent } as CSSProperties}>
      <div className="scanLab__index"><span>01</span><i />CAPTURA LOCAL · SEM ENVIO DE ARQUIVO</div>
      <div className="scanLab__layout">
        <div className="scanLab__copy">
          <p className="eyebrow">AUTÓPSIA CONSENTIDA</p>
          <h2 id="scan-title">Coloque sua presença<br /><em>sob pressão.</em></h2>
          <p className="scanLab__description">Envie uma captura da sua página. A leitura de cor acontece neste navegador; nada é enviado ou armazenado.</p>
          <label className="uploadControl" htmlFor="screenshot-input">
            <span>{preview ? "Trocar captura" : "Escolher captura"}</span>
            <b>{preview ? fileName : "PNG · JPG · WEBP / ATÉ 12 MB"}</b>
          </label>
          <input
            ref={inputRef}
            className="visuallyHidden"
            id="screenshot-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
          />
          {error && <p className="formError" role="alert">{error}</p>}
          {preview && <button className="button button--dark" onClick={scan} disabled={scanning}>{scanning ? "Lendo a matéria..." : "Iniciar varredura ↗"}</button>}
          {complete && <button className="textAction" onClick={() => onContact("captura visual")}>Quero uma direção para esta marca ↗</button>}
        </div>
        <div
          className={`scanObject${preview ? " has-capture" : ""}${scanning ? " is-scanning" : ""}`}
          aria-live="polite"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}
        >
          <div className="scanObject__frame">
            {preview ? <img src={preview} alt={`Captura local enviada: ${fileName}`} /> : <div className="scanObject__empty"><span>GIROFY / VISUAL SCANNER</span><b>ARRASTE UMA CAPTURA<br />PARA DENTRO DA CENA</b><i /></div>}
            {scanning && <div className="scanObject__beam" />}
          </div>
          <div className="scanObject__readout"><span>{complete ? "COR MÉDIA EXTRAÍDA LOCALMENTE" : preview ? "CAPTURA PRONTA PARA LEITURA" : "AGUARDANDO AMOSTRA"}</span><i style={{ backgroundColor: complete ? accent : undefined }} /></div>
          {complete && <div className="paletteReadout"><i style={{ background: accent }} /><span>COR MÉDIA · {accent.toUpperCase()}</span></div>}
        </div>
      </div>
    </section>
  );
}

type SoundEngine = { context: AudioContext; master: GainNode; lastAt: number };

export default function ImmersiveExperience() {
  const journeyRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const shotsRef = useRef<(HTMLElement | null)[]>([]);
  const progressLineRef = useRef<HTMLSpanElement | null>(null);
  const activeChapterRef = useRef<Chapter>("singularity");
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const runtimeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    membrane: THREE.RawShaderMaterial;
    shards: THREE.InstancedMesh;
    shardObject: THREE.Object3D;
    shardBases: Array<{ x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number }>;
    progress: number;
    time: number;
    pointer: THREE.Vector2;
    velocity: THREE.Vector2;
    impact: number;
    visible: boolean;
    raf: number;
    environment: THREE.Texture | null;
    disposeables: Array<{ dispose: () => void }>;
  } | null>(null);
  const audioRef = useRef<SoundEngine | null>(null);
  const audioEnabledRef = useRef(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [webglReady, setWebglReady] = useState(false);
  const [activeChapter, setActiveChapter] = useState<Chapter>("singularity");
  const [activeMethod, setActiveMethod] = useState(0);
  const [activeProject, setActiveProject] = useState(0);
  const [brandName, setBrandName] = useState("");

  const activeProjectData = PROJECTS[activeProject] ?? PROJECTS[0];

  const playSound = useCallback((kind: "impact" | "transition" | "confirm") => {
    const engine = audioRef.current;
    if (!engine || !audioEnabledRef.current) return;
    const now = engine.context.currentTime;
    if (now - engine.lastAt < 0.14) return;
    engine.lastAt = now;

    const makeVoice = (frequency: number, type: OscillatorType, level: number, duration: number) => {
      const oscillator = engine.context.createOscillator();
      const envelope = engine.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (kind === "transition") oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.24, now + duration * 0.72);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(level, now + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(envelope);
      envelope.connect(engine.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    };

    if (kind === "impact") {
      makeVoice(58, "sine", 0.26, 0.13);
      makeVoice(420, "triangle", 0.07, 0.075);
    } else if (kind === "transition") {
      makeVoice(92, "sine", 0.12, 0.18);
      makeVoice(740, "triangle", 0.045, 0.12);
    } else {
      makeVoice(110, "sine", 0.1, 0.1);
      makeVoice(520, "triangle", 0.045, 0.09);
    }
  }, []);

  const toggleAudio = useCallback(async () => {
    if (!audioRef.current) {
      const context = new AudioContext();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 15;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.12;
      const master = context.createGain();
      master.gain.value = 0;
      const subPulse = context.createOscillator();
      const pulseEnvelope = context.createGain();
      subPulse.type = "sine";
      subPulse.frequency.value = 44;
      pulseEnvelope.gain.value = 0.018;
      subPulse.connect(pulseEnvelope);
      pulseEnvelope.connect(master);
      subPulse.start();
      master.connect(compressor);
      compressor.connect(context.destination);
      audioRef.current = { context, master, lastAt: 0 };
    }
    const engine = audioRef.current;
    if (!engine) return;
    if (engine.context.state === "suspended") await engine.context.resume();
    const enabled = !audioEnabledRef.current;
    audioEnabledRef.current = enabled;
    engine.master.gain.setTargetAtTime(enabled ? 0.22 : 0, engine.context.currentTime, 0.055);
    setAudioEnabled(enabled);
    if (enabled) playSound("confirm");
  }, [playSound]);

  const contact = useCallback((context = "direção visual") => {
    const name = brandName.trim().slice(0, 80);
    const message = name
      ? `Minha empresa é ${name}. Quero conversar sobre uma ${context} para a minha marca.`
      : `Quero conversar sobre uma ${context} para a minha marca.`;
    openWhatsApp(message);
    playSound("confirm");
  }, [brandName, playSound]);

  const seekTo = useCallback((progress: number) => {
    const trigger = triggerRef.current;
    if (!trigger) {
      journeyRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const y = trigger.start + (trigger.end - trigger.start) * clamp(progress, 0, 1);
    window.scrollTo({ top: y, behavior: "smooth" });
    setMenuOpen(false);
  }, []);

  useLayoutEffect(() => {
    const journey = journeyRef.current;
    const stage = stageRef.current;
    const mount = mountRef.current;
    if (!journey || !stage || !mount) return;

    let progress = 0;
    let cancelled = false;
    let disposeScene: (() => void) | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shotsRef.current.forEach((shot, index) => {
      if (!shot) return;
      const visible = reducedMotion || index === 0;
      shot.setAttribute("aria-hidden", String(!visible));
      shot.inert = !visible;
      if (reducedMotion) {
        shot.style.opacity = "1";
        shot.style.pointerEvents = "auto";
        shot.style.transform = "none";
      }
    });

    if (reducedMotion) {
      stage.classList.add("reduced-motion");
      return () => stage.classList.remove("reduced-motion");
    }

    const applyProgress = (nextProgress: number) => {
      progress = clamp(nextProgress, 0, 1);
      if (runtimeRef.current) runtimeRef.current.progress = progress;
      journey.style.setProperty("--journey-progress", `${progress * 100}%`);
      if (progressLineRef.current) progressLineRef.current.style.transform = `scaleX(${progress})`;

      SHOTS.forEach((shot, index) => {
        const element = shotsRef.current[index];
        if (!element) return;
        const fade = index === 0 ? 0.035 : 0.04;
        const enter = shot.start === 0 ? 1 : range(progress, shot.start, shot.start + fade);
        const leave = 1 - range(progress, shot.end - fade, shot.end);
        const alpha = Math.min(enter, leave);
        const local = clamp((progress - shot.start) / Math.max(0.001, shot.end - shot.start), 0, 1);
        const depth = (local - 0.5) * 130;
        const lateral = shot.id === "portfolio" ? (0.5 - local) * 34 : 0;
        element.style.opacity = alpha.toFixed(3);
        element.style.transform = `translate3d(${lateral}px, ${(0.5 - local) * 18}px, ${depth}px) scale(${0.97 + alpha * 0.03})`;
        element.style.pointerEvents = alpha > 0.72 ? "auto" : "none";
        element.inert = alpha <= 0.72;
        element.setAttribute("aria-hidden", String(alpha <= 0.5));
      });

      const chapter = getChapter(progress);
      if (chapter !== activeChapterRef.current) {
        activeChapterRef.current = chapter;
        setActiveChapter(chapter);
        playSound("transition");
      }
      if (progress >= 0.88) {
        const step = Math.min(METHODS.length - 1, Math.floor(((progress - 0.88) / 0.12) * METHODS.length));
        setActiveMethod((current) => current === step ? current : step);
      }
      const featuredProject = getFeaturedProjectIndex(progress);
      if (featuredProject !== null) {
        setActiveProject((current) => current === featuredProject ? current : featuredProject);
      }
    };

    const trigger = ScrollTrigger.create({
      trigger: journey,
      start: "top top",
      end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 720 ? 5.4 : 6.6))}`,
      pin: stage,
      pinSpacing: true,
      scrub: 0.18,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => applyProgress(self.progress),
    });
    triggerRef.current = trigger;
    ScrollTrigger.refresh();
    applyProgress(trigger.progress);

    void Promise.all([
      import("three"),
      import("three/addons/geometries/RoundedBoxGeometry.js"),
    ]).then(([threeModule, roundedBoxModule]) => {
      if (cancelled) return;
      const THREE = threeModule;
      const RoundedBoxGeometry = roundedBoxModule.RoundedBoxGeometry;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let material: THREE.RawShaderMaterial;
    let shards: THREE.InstancedMesh;
    let shardObject: THREE.Object3D;
    let environment: THREE.Texture | null = null;
    let raf = 0;
    let active = false;
    let drawFrame: (now: number) => void = () => {};
    const setRenderActive = (next: boolean) => {
      active = next;
      if (active && raf === 0) raf = requestAnimationFrame(drawFrame);
      else if (!active && raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const disposeables: Array<{ dispose: () => void }> = [];
    const pointer = new THREE.Vector2(0.5, 0.5);
    const velocity = new THREE.Vector2(0, 0);
    const pointerPrevious = { x: 0.5, y: 0.5, time: performance.now() };
    let impact = 0;
    let time = 0;
    let frameTime = performance.now();

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: window.innerWidth > 720, powerPreference: "high-performance" });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.setClearColor(0x050608, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.25 : 1.6));
      mount.appendChild(renderer.domElement);
      setWebglReady(true);

      scene = new THREE.Scene();
      scene.background = null;
      camera = new THREE.PerspectiveCamera(39, 1, 0.1, 90);
      camera.position.set(0, 0, 14);
      scene.add(new THREE.AmbientLight(0x9ca6b6, 0.72));
      const key = new THREE.DirectionalLight(0xffffff, 2.8);
      key.position.set(-5, 7, 10);
      scene.add(key);
      const coolRim = new THREE.DirectionalLight(0x94b4db, 2.2);
      coolRim.position.set(7, -4, -2);
      scene.add(coolRim);
      environment = createEnvironmentTexture(THREE);
      if (environment) {
        environment.mapping = THREE.EquirectangularReflectionMapping;
        environment.colorSpace = THREE.SRGBColorSpace;
        scene.environment = environment;
        disposeables.push(environment);
      }

      const uniforms = {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uVelocity: { value: new THREE.Vector2(0, 0) },
        uImpact: { value: 0 },
      };
      const vertexShader = `
        precision highp float;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat3 normalMatrix;
        uniform float uTime;
        uniform float uProgress;
        uniform vec2 uMouse;
        uniform vec2 uVelocity;
        uniform float uImpact;
        in vec3 position;
        in vec3 normal;
        in vec2 uv;
        out vec2 vUv;
        out vec3 vNormal;
        out vec3 vViewPosition;
        out float vNoise;
        ${simplex4D}
        void main() {
          vec3 p = position;
          vec2 centered = (uv - 0.5) * vec2(1.55, 1.0);
          vec2 delta = centered - (uMouse - 0.5) * vec2(1.1, 0.9);
          float radius = length(delta);
          float vortex = exp(-radius * radius * 7.8) * (0.18 + min(length(uVelocity), 1.0) * 0.82);
          float collapse = smoothstep(0.10, 0.34, uProgress) * (1.0 - smoothstep(0.38, 0.52, uProgress));
          float n = snoise(vec4(p.xy * 0.78, uProgress * 3.1, uTime * 0.12));
          float impact = exp(-radius * radius * 15.0) * uImpact;
          p.z += n * (0.16 + collapse * 0.42) + vortex * (0.28 + collapse * 0.55) + impact * 0.8;
          p.xy += normalize(delta + vec2(0.0001)) * vortex * (0.07 + collapse * 0.22);
          p.xy += vec2(-delta.y, delta.x) * vortex * length(uVelocity) * 0.12;
          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vViewPosition = viewPosition.xyz;
          vNoise = n;
          gl_Position = projectionMatrix * viewPosition;
        }
      `;
      const fragmentShader = `
        precision highp float;
        uniform float uTime;
        uniform float uProgress;
        uniform float uImpact;
        in vec2 vUv;
        in vec3 vNormal;
        in vec3 vViewPosition;
        in float vNoise;
        out vec4 outColor;
        ${simplex4D}
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDirection = normalize(-vViewPosition);
          float facing = abs(dot(normal, viewDirection));
          float fresnel = pow(1.0 - facing, 3.2);
          float grain = snoise(vec4(vUv * vec2(5.4, 3.1), uProgress * 1.8, uTime * 0.075));
          float highlight = pow(max(0.0, sin((vUv.x * 6.4 + grain * 0.11 + uTime * 0.018) * 3.14159)), 28.0);
          float etch = smoothstep(0.72, 0.98, abs(sin(vUv.x * 38.0 + vUv.y * 11.0 + grain * 2.2)));
          vec3 graphite = vec3(0.035, 0.043, 0.055);
          vec3 silver = vec3(0.75, 0.79, 0.84);
          vec3 coldEdge = vec3(0.43, 0.56, 0.72);
          vec3 color = mix(graphite, silver, clamp(fresnel * 0.78 + highlight * 0.64 + etch * 0.10, 0.0, 1.0));
          color = mix(color, coldEdge, fresnel * 0.18);
          float collapse = smoothstep(0.14, 0.43, uProgress);
          float breakNoise = smoothstep(0.12, 0.82, grain * 0.5 + 0.5 + uImpact * 0.4);
          float alpha = mix(0.9, breakNoise * 0.58 + 0.15, collapse * (1.0 - smoothstep(0.82, 0.96, uProgress)));
          alpha *= smoothstep(0.03, 0.22, vUv.y) * (1.0 - smoothstep(0.84, 0.99, vUv.y));
          outColor = vec4(color, alpha);
        }
      `;
      material = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms,
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      });
      const membrane = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 8.2, 72, 48), material);
      membrane.position.set(-0.15, 0.05, -2.8);
      membrane.rotation.set(0.04, -0.12, -0.025);
      scene.add(membrane);
      disposeables.push(membrane.geometry, material);

      const shardGeometry = new RoundedBoxGeometry(0.54, 0.42, 0.13, 3, 0.035);
      const shardMaterial = new THREE.MeshPhysicalMaterial({ color: 0xaeb4be, metalness: 0.94, roughness: 0.19, clearcoat: 0.24, clearcoatRoughness: 0.2, envMapIntensity: 1.8 });
      shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, 28);
      shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      shardObject = new THREE.Object3D();
      const shardBases = Array.from({ length: 28 }, (_, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        return {
          x: (col - 3) * 1.05 + 2.25,
          y: (row - 1.5) * 0.86 + 0.12,
          z: -0.25 - ((i * 7) % 5) * 0.17,
          rx: (i % 3 - 1) * 0.08,
          ry: (col - 3) * 0.045,
          rz: (row % 2 ? -1 : 1) * 0.06,
          scale: 0.72 + (i % 4) * 0.1,
        };
      });
      scene.add(shards);
      disposeables.push(shardGeometry, shardMaterial);

      const textureLoader = new THREE.TextureLoader();
      const featured = [PROJECTS[0], PROJECTS[2], PROJECTS[9], PROJECTS[13]];
      featured.forEach((project, index) => {
        const z = -5.7 - index * 1.95;
        const frame = new THREE.Mesh(
          new RoundedBoxGeometry(5.36, 3.22, 0.2, 4, 0.075),
          new THREE.MeshPhysicalMaterial({ color: 0x090b0e, metalness: 0.72, roughness: 0.26, clearcoat: 0.18 }),
        );
        frame.position.set(index % 2 === 0 ? 0.25 : -0.28, index % 2 === 0 ? 0.05 : -0.08, z);
        frame.rotation.y = (index % 2 === 0 ? -1 : 1) * (0.08 + index * 0.018);
        scene.add(frame);
        disposeables.push(frame.geometry, frame.material as THREE.Material);

        const texture = textureLoader.load(project.src);
        texture.colorSpace = THREE.SRGBColorSpace;
        const screen = new THREE.Mesh(
          new THREE.PlaneGeometry(5.05, 2.84),
          new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
        );
        screen.position.set(frame.position.x, frame.position.y, z + 0.112);
        screen.rotation.copy(frame.rotation);
        scene.add(screen);
        disposeables.push(texture, screen.geometry, screen.material as THREE.Material);
      });

      const founderTexture = textureLoader.load("/assets/cesar.webp");
      founderTexture.colorSpace = THREE.SRGBColorSpace;
      const founderImage = new THREE.Mesh(
        new THREE.PlaneGeometry(3.3, 4.15),
        new THREE.MeshBasicMaterial({ map: founderTexture, toneMapped: false }),
      );
      founderImage.position.set(-2.6, 0, -14.25);
      founderImage.rotation.y = 0.08;
      scene.add(founderImage);
      disposeables.push(founderTexture, founderImage.geometry, founderImage.material as THREE.Material);

      const railPoints = Array.from({ length: 7 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.55) * 0.75, (i % 2 ? -0.25 : 0.25), -15.3 - i * 1.17));
      const railCurve = new THREE.CatmullRomCurve3(railPoints);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 72, 0.025, 6, false), shardMaterial);
      scene.add(rail);
      disposeables.push(rail.geometry);
      railPoints.forEach((point, i) => {
        const node = new THREE.Mesh(new THREE.SphereGeometry(i === 6 ? 0.095 : 0.055, 12, 10), shardMaterial);
        node.position.copy(point);
        scene.add(node);
        disposeables.push(node.geometry);
      });

      runtimeRef.current = {
        renderer, scene, camera, membrane: material, shards, shardObject, shardBases,
        progress, time, pointer, velocity, impact, visible: false, raf, environment, disposeables,
      };

      const resize = () => {
        const width = Math.max(1, mount.clientWidth);
        const height = Math.max(1, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.25 : 1.6));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      const visibility = new IntersectionObserver(([entry]) => {
        setRenderActive(entry.isIntersecting && !document.hidden);
      }, { threshold: 0.01 });
      visibility.observe(stage);
      const onVisibilityChange = () => { setRenderActive(!document.hidden && Boolean(stage.getBoundingClientRect().bottom > 0 && stage.getBoundingClientRect().top < window.innerHeight)); };
      document.addEventListener("visibilitychange", onVisibilityChange);

      const onPointerMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
        const y = clamp(1 - (event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
        const now = performance.now();
        const elapsed = Math.max(16, now - pointerPrevious.time);
        velocity.set(clamp((x - pointerPrevious.x) / elapsed * 1000, -1, 1), clamp((y - pointerPrevious.y) / elapsed * 1000, -1, 1));
        pointer.set(x, y);
        pointerPrevious.x = x;
        pointerPrevious.y = y;
        pointerPrevious.time = now;
      };
      const onPointerDown = () => { impact = 1; if (runtimeRef.current) runtimeRef.current.impact = 1; };
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      stage.addEventListener("pointerdown", onPointerDown, { passive: true });

      drawFrame = (now: number) => {
        raf = 0;
        if (!active) return;
        const delta = Math.min(50, Math.max(0, now - frameTime));
        frameTime = now;
        time += delta * 0.001;
        impact *= 0.91;
        velocity.multiplyScalar(0.94);
        uniforms.uTime.value = time;
        uniforms.uProgress.value = progress;
        uniforms.uMouse.value.copy(pointer);
        uniforms.uVelocity.value.copy(velocity);
        uniforms.uImpact.value = impact;
        camera.position.z = 14 - progress * 27.5;
        camera.position.x = Math.sin(progress * Math.PI * 3.2) * 0.28 + (pointer.x - 0.5) * 0.18;
        camera.position.y = (pointer.y - 0.5) * 0.16;
        camera.lookAt((pointer.x - 0.5) * 0.12, 0, camera.position.z - 8.5);

        const collapse = range(progress, 0.09, 0.34);
        const flare = range(progress, 0.34, 0.52);
        shardBases.forEach((base, index) => {
          const ux = clamp(0.5 + base.x / 12.8, 0, 1);
          const uy = clamp(0.5 + base.y / 8.2, 0, 1);
          const field = getAttractor({ x: ux, y: uy }, { x: pointer.x, y: pointer.y }, { x: velocity.x, y: velocity.y }, 0.42);
          const x = base.x * (1 - collapse) + field.x * 2.1 * collapse + Math.sin(time * 1.1 + index) * flare * 0.28;
          const y = base.y * (1 - collapse) + field.y * 1.6 * collapse + Math.cos(time * 0.8 + index * 2) * flare * 0.22;
          const z = base.z - collapse * 2.8 + flare * ((index % 2 ? 1 : -1) * 0.8);
          const shrink = Math.max(0.055, (1 - collapse * 0.88) * (1 + flare * 0.24));
          shardObject.position.set(x, y, z);
          shardObject.rotation.set(base.rx + time * 0.025 * (index % 2 ? 1 : -1), base.ry + field.twist, base.rz + flare * 0.55);
          shardObject.scale.setScalar(base.scale * shrink);
          shardObject.updateMatrix();
          shards.setMatrixAt(index, shardObject.matrix);
        });
        shards.instanceMatrix.needsUpdate = true;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(drawFrame);
      };
      const initialBounds = stage.getBoundingClientRect();
      setRenderActive(!document.hidden && initialBounds.bottom > 0 && initialBounds.top < window.innerHeight);

      disposeScene = () => {
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        visibility.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("pointermove", onPointerMove);
        stage.removeEventListener("pointerdown", onPointerDown);
        triggerRef.current?.kill();
        triggerRef.current = null;
        disposeables.forEach((resource) => resource.dispose());
        renderer.dispose();
        renderer.domElement.remove();
        runtimeRef.current = null;
      };
    } catch (error) {
      console.warn("WebGL experience unavailable; using the visual fallback.", error);
      setWebglReady(false);
      disposeScene = () => { renderer?.dispose(); renderer?.domElement.remove(); };
    }
    }).catch((error) => {
      if (cancelled) return;
      console.warn("WebGL modules unavailable; using the visual fallback.", error);
      setWebglReady(false);
    });

    return () => {
      cancelled = true;
      triggerRef.current?.kill();
      triggerRef.current = null;
      disposeScene?.();
    };
  }, [playSound]);

  useEffect(() => () => {
    const engine = audioRef.current;
    if (engine) void engine.context.close();
  }, []);

  const navigate = (progress: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    seekTo(progress);
    setMenuOpen(false);
  };

  const onContact = (label: string) => contact(label);

  const submitBrand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    contact("direção visual personalizada");
  };

  return (
    <div className="immersiveApp" id="top">
      <header className="immersiveNav">
        <a className="brandMark" href="#top" aria-label="Girofy, início" onClick={() => seekTo(0)}>
          <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M46 13H24C14 13 8 20 8 31v9c0 8 6 13 14 13h16l17-17H33v9H23c-4 0-6-2-6-6v-8c0-6 3-9 9-9h20V13Z" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M38 27h18v18" fill="none" stroke="currentColor" strokeWidth="4" /></svg>
          <span>GIROFY</span>
        </a>
        <nav className="desktopNav" aria-label="Navegação principal">
          <a href="#experience" onClick={navigate(0)}>EXPERIÊNCIA</a>
          <a href="#projects" onClick={navigate(0.48)}>PROJETOS</a>
          <a href="#method" onClick={navigate(0.94)}>MÉTODO</a>
        </nav>
        <div className="navActions">
          <button className={`soundToggle${audioEnabled ? " is-on" : ""}`} onClick={toggleAudio} aria-pressed={audioEnabled} aria-label={audioEnabled ? "Desativar som" : "Ativar som"}>
            <i /><i /><i /><span>SOM {audioEnabled ? "ON" : "OFF"}</span>
          </button>
          <button className="navContact" onClick={() => contact("direção visual")}>INICIAR CONVERSA <span>↗</span></button>
          <button className="mobileMenuButton" aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span /><span /></button>
        </div>
        <div className={`mobileNav${menuOpen ? " is-open" : ""}`}>
          <a href="#experience" onClick={navigate(0)}>01 / Experiência</a>
          <a href="#projects" onClick={navigate(0.48)}>02 / Projetos</a>
          <a href="#method" onClick={navigate(0.94)}>03 / Método</a>
          <button onClick={() => { contact("direção visual"); setMenuOpen(false); }}>Falar com a Girofy ↗</button>
        </div>
      </header>

      <main>
        <section className="journey" id="experience" ref={journeyRef} aria-label="Experiência Girofy controlada pelo scroll">
          <div className="experienceStage" ref={stageRef}>
            <div className={`experienceCanvas${webglReady ? " is-ready" : ""}`} ref={mountRef} aria-hidden="true" />
            <div className="stageVignette" />
            <div className="stageGrain" />
            <div className="chapterHud" aria-hidden="true">
              <span>GIROFY / {activeChapter.toUpperCase()}</span>
              <div className="chapterProgress"><span ref={progressLineRef} /></div>
              <span>SCROLL PARA AVANÇAR <i>↓</i></span>
            </div>
            <div className="storyScene shot-hero" ref={(el) => { shotsRef.current[0] = el; }}>
              <div className="heroCopy">
                <p className="eyebrow">DIREÇÃO CRIATIVA · ENGENHARIA INTERATIVA</p>
                <h1>Seu preço começa<br /><em>antes da proposta.</em><br /><span>Começa na percepção.</span></h1>
                <p className="heroSupport">Experiências digitais em 3D, motion e direção criativa para marcas que não querem disputar atenção como commodity.</p>
                <div className="heroActions"><button className="button button--silver" onClick={() => contact("direção visual")}>Quero sair da comparação <span>↗</span></button><span className="heroSignal">WEBGL / MOTION / EXPERIÊNCIA</span></div>
              </div>
              <div className="heroAside" aria-hidden="true"><span>01—07</span><i /><b>FORMA<br />SOB TENSÃO</b></div>
            </div>
            <div className="storyScene shot-market" ref={(el) => { shotsRef.current[1] = el; }}>
              <div className="sceneNumber">01 / O MERCADO PLANO</div>
              <div className="marketCopy"><h2>Quando todos<br />parecem <em>bons</em>,<br />todos parecem<br /><strong>comparáveis.</strong></h2><p>E quando a comparação é fácil,<br />o preço vira a conversa.</p></div>
              <div className="marketEcho" aria-hidden="true"><span>COMPARÁVEL</span><span>COMPARÁVEL</span><span>COMPARÁVEL</span><span>COMPARÁVEL</span></div>
              <div className="sceneSideNote">4 SUPERFÍCIES<br />1 ESCOLHA</div>
            </div>
            <div className="storyScene shot-breakout" ref={(el) => { shotsRef.current[2] = el; }}>
              <div className="sceneNumber">02 / RUPTURA DE CATEGORIA</div>
              <div className="breakoutCopy"><p>Não fazemos sua marca<br />parecer melhor.</p><h2>Fazemos ela<br /><em>sair da categoria.</em></h2></div>
              <div className="breakoutAxis"><span>COMPARÁVEL</span><i>→</i><span>MEMORÁVEL</span><i>→</i><span>DESEJÁVEL</span></div>
              <div className="depthGlyph" aria-hidden="true">G</div>
            </div>
            <div className="storyScene shot-portfolio" ref={(el) => { shotsRef.current[3] = el; }}>
              <div className="portfolioChapter"><p className="sceneNumber">03 / PROVA EM MATÉRIA</p><h2>O nível permanece.<br /><em>A linguagem muda.</em></h2><p>14 direções. 14 decisões visuais.<br />Nenhuma precisa herdar a estética da anterior.</p></div>
              <div className="portfolioCounter"><b>{String(activeProject + 1).padStart(2, "0")}</b><i />14<br /><span>{activeProjectData.name}</span></div>
              <div className="portfolioGlint" aria-hidden="true" />
            </div>
            <div className="storyScene shot-machine" ref={(el) => { shotsRef.current[4] = el; }}>
              <div className="machineCopy"><p className="sceneNumber">04 / A MÁQUINA POR TRÁS</p><h2>Uma ideia.<br /><em>Quatro planos.</em></h2><p>Estratégia, direção, interface e movimento entram como camadas da mesma cena.</p></div>
              <div className="machineLabels"><span><i>01</i>Diagnóstico</span><span><i>02</i>Direção criativa</span><span><i>03</i>Motion + 3D</span><span><i>04</i>Conversão + entrega</span></div>
            </div>
            <div className="storyScene shot-founder" ref={(el) => { shotsRef.current[5] = el; }}>
              <div className="founderCopy"><p className="sceneNumber">05 / QUEM DIRIGE</p><h2>Não terceirizo<br />a <em>visão.</em></h2><p>Da primeira tese visual à experiência final, a direção continua no mesmo lugar.</p><span className="founderSignature">César <i>— Founder & Creative Direction</i></span></div>
              <div className="founderMeta">DIREÇÃO<br />PRESENTE<br /><b>DO INÍCIO AO FIM</b></div>
            </div>
            <div className="storyScene shot-timeline" ref={(el) => { shotsRef.current[6] = el; }}>
              <div className="timelineCopy"><p className="sceneNumber">06 / DO DIAGNÓSTICO À DECISÃO</p><h2>Percepção<br /><em>vira sistema.</em></h2><p>Uma sequência. Sete decisões. Uma experiência que chega à ação.</p></div>
              <div className="methodRail" id="method">
                {METHODS.map((method, index) => <div className={`methodNode${activeMethod === index ? " is-active" : ""}`} key={method.title}><span>{method.eyebrow}</span><b>{method.title}</b><i /></div>)}
              </div>
              <button className="button button--silver timelineCTA" onClick={() => contact("projeto digital")}>Levar minha marca para essa conversa <span>↗</span></button>
            </div>
            <a className="skipExperience" href="#scanner">PULAR EXPERIÊNCIA ↓</a>
            {!webglReady && <div className="webglFallback" aria-hidden="true"><span /><span /><span /></div>}
          </div>
        </section>

        <ScreenshotScanner onContact={onContact} />

        <section className="projectProof" id="projects" aria-labelledby="projects-title">
          <div className="projectProof__top"><span>02 / PORTFÓLIO EM MOVIMENTO</span><span>ARQUIVO GIROFY — {String(PROJECTS.length).padStart(2, "0")} PEÇAS</span></div>
          <div className="projectProof__layout">
            <div className="projectProof__imageWrap">
              <img key={activeProjectData.src} src={activeProjectData.src} alt={`Direção visual Girofy: ${activeProjectData.name}`} loading="lazy" />
              <div className="projectImageIndex">{String(activeProject + 1).padStart(2, "0")} <i /> {String(PROJECTS.length).padStart(2, "0")}</div>
            </div>
            <div className="projectProof__copy">
              <p className="eyebrow">PROVA, NÃO PROMESSA</p>
              <h2 id="projects-title">Cada marca<br /><em>pede outro mundo.</em></h2>
              <div className="activeProjectName"><span>PROJETO EM FOCO</span><b>{activeProjectData.name}</b></div>
              <div className="projectControls"><button aria-label="Projeto anterior" onClick={() => setActiveProject((activeProject + PROJECTS.length - 1) % PROJECTS.length)}>←</button><button aria-label="Próximo projeto" onClick={() => setActiveProject((activeProject + 1) % PROJECTS.length)}>→</button><span>ARRASTE A SEQUÊNCIA / USE AS SETAS</span></div>
            </div>
          </div>
          <div className="projectTicker" aria-label="Projetos">
            {PROJECTS.map((project, index) => <button className={index === activeProject ? "is-active" : ""} key={project.name} onClick={() => setActiveProject(index)}><span>{String(index + 1).padStart(2, "0")}</span>{project.name}</button>)}
          </div>
        </section>

        <section className="brandForge" id="brand" aria-labelledby="brand-title">
          <div className="brandForge__top"><span>03 / ESTAMPAGEM DA MARCA</span><span>SEM BRIEFING LONGO</span></div>
          <div className="brandForge__layout">
            <div className="brandForge__copy"><p className="eyebrow">AGORA, A MATÉRIA É SUA</p><h2 id="brand-title">Inscreva sua<br /><em>marca na cena.</em></h2><p>O nome entra na peça. O próximo passo abre uma conversa real com a Girofy.</p></div>
            <div className="brandPlate" aria-live="polite"><span>GIROFY / CREATIVE DIRECTION</span><b>{brandName.trim() || "SUA MARCA"}</b><i /></div>
          </div>
          <form className="brandForm" onSubmit={submitBrand}>
            <label htmlFor="company-name">NOME DA EMPRESA</label>
            <input id="company-name" value={brandName} maxLength={80} placeholder="Digite aqui" autoComplete="organization" onChange={(event) => setBrandName(event.target.value)} />
            <button type="submit">Abrir conversa no WhatsApp <span>↗</span></button>
          </form>
        </section>
      </main>

      <footer className="immersiveFooter">
        <a className="brandMark" href="#top" onClick={() => seekTo(0)}><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M46 13H24C14 13 8 20 8 31v9c0 8 6 13 14 13h16l17-17H33v9H23c-4 0-6-2-6-6v-8c0-6 3-9 9-9h20V13Z" fill="none" stroke="currentColor" strokeWidth="4" /><path d="M38 27h18v18" fill="none" stroke="currentColor" strokeWidth="4" /></svg><span>GIROFY</span></a>
        <span>Sites profissionais, premium e experiências digitais para empresas.</span>
        <span>REACT · THREE.JS · GSAP · WEBGL</span>
      </footer>
    </div>
  );

}
