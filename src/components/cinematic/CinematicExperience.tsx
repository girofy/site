import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const PORTFOLIO = [
  { name: "Óticas do Vale", src: "/portfolio/01-oticas-do-vale.webp", smallSrc: "/portfolio/01-oticas-do-vale-sm.webp" },
  { name: "Norma", src: "/portfolio/02-norma.webp", smallSrc: "/portfolio/02-norma-sm.webp" },
  { name: "Brisa Alta", src: "/portfolio/03-brisa-alta.webp", smallSrc: "/portfolio/03-brisa-alta-sm.webp" },
  { name: "Nórdica", src: "/portfolio/04-nordica.webp", smallSrc: "/portfolio/04-nordica-sm.webp" },
  { name: "Atlas", src: "/portfolio/05-atlas.webp", smallSrc: "/portfolio/05-atlas-sm.webp" },
  { name: "Eixo Fisio", src: "/portfolio/06-eixo-fisio.webp", smallSrc: "/portfolio/06-eixo-fisio-sm.webp" },
  { name: "Nayane Rodrigues", src: "/portfolio/07-nayane-rodrigues.webp", smallSrc: "/portfolio/07-nayane-rodrigues-sm.webp" },
  { name: "Lume Derm", src: "/portfolio/08-lume-derm.webp", smallSrc: "/portfolio/08-lume-derm-sm.webp" },
  { name: "Aura Vet", src: "/portfolio/09-aura-vet.webp", smallSrc: "/portfolio/09-aura-vet-sm.webp" },
  { name: "Vértice", src: "/portfolio/10-vertice.webp", smallSrc: "/portfolio/10-vertice-sm.webp" },
  { name: "Auster", src: "/portfolio/11-auster.webp", smallSrc: "/portfolio/11-auster-sm.webp" },
  { name: "Lúmina Casa", src: "/portfolio/12-lumina-casa.webp", smallSrc: "/portfolio/12-lumina-casa-sm.webp" },
  { name: "Órbita Visão", src: "/portfolio/13-orbita-visao.webp", smallSrc: "/portfolio/13-orbita-visao-sm.webp" },
  { name: "Casa Norte", src: "/portfolio/14-casa-norte.webp", smallSrc: "/portfolio/14-casa-norte-sm.webp" },
];

const WHATSAPP_NUMBER = "5574981017188";
const DEFAULT_MESSAGE = "Vi a experiência da Girofy e quero ver o que vocês fariam com a minha marca.";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const range = (progress: number, start: number, end: number) => clamp((progress - start) / (end - start), 0, 1);
const smooth = (t: number) => t * t * (3 - 2 * t);
const sceneAlpha = (progress: number, start: number, end: number, fade: number) => {
  const x = range(progress, start, start + fade);
  const y = 1 - range(progress, end - fade, end);
  return smooth(Math.min(x, y));
};

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="Girofy">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M46 13H24C14 13 8 20 8 31v9c0 8 6 13 14 13h16l17-17H33v9H23c-4 0-6-2-6-6v-8c0-6 3-9 9-9h20V13Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M38 27h18v18" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      <span className="brand__word">GIROFY</span>
    </a>
  );
}

function Loader({ value, done }: { value: number; done: boolean }) {
  return (
    <div className={`loader${done ? " is-done" : ""}`} aria-hidden={done}>
      <div className="loader__core">
        <div className="loader__glyph"><i /><i /><i /></div>
        <div className="loader__brand"><b>GIROFY</b><span>{String(value).padStart(2, "0")}%</span></div>
        <div className="loader__rail"><i style={{ transform: `scaleX(${value / 100})` }} /></div>
        <div className="loader__copy"><span>CONSTRUINDO PROFUNDIDADE</span><span>REACT + WEBGL</span></div>
      </div>
    </div>
  );
}

function Scene({ className, sceneRef, children }: { className: string; sceneRef: (el: HTMLElement | null) => void; children: ReactNode }) {
  return <section className={`scene ${className}`} ref={sceneRef}>{children}</section>;
}

function openWhatsapp(message = DEFAULT_MESSAGE) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function CinematicExperience() {
  const [loaded, setLoaded] = useState(0);
  const [done, setDone] = useState(false);
  const [menu, setMenu] = useState(false);

  const journeyRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scenesRef = useRef<(HTMLElement | null)[]>([]);
  const portfolioTrackRef = useRef<HTMLDivElement | null>(null);
  const portfolioViewportRef = useRef<HTMLDivElement | null>(null);
  const portfolioCardsRef = useRef<(HTMLElement | null)[]>([]);

  const runtime = useRef<{
    gl: WebGLRenderingContext | null;
    program: WebGLProgram | null;
    uR: WebGLUniformLocation | null;
    uT: WebGLUniformLocation | null;
    uS: WebGLUniformLocation | null;
    raf: number;
    progress: number;
    start: number;
  }>({ gl: null, program: null, uR: null, uT: null, uS: null, raf: 0, progress: 0, start: performance.now() });

  const preloadAssets = useMemo(() => [
    "/portfolio/01-oticas-do-vale-sm.webp",
    "/portfolio/10-vertice-sm.webp",
    "/assets/cesar.webp",
  ], []);

  useEffect(() => {
    let count = 0;
    let cancelled = false;
    preloadAssets.forEach((src) => {
      const image = new Image();
      const hit = () => {
        if (cancelled) return;
        count += 1;
        setLoaded(Math.round((count / preloadAssets.length) * 100));
        if (count === preloadAssets.length) window.setTimeout(() => !cancelled && setDone(true), 180);
      };
      image.onload = hit;
      image.onerror = hit;
      image.src = src;
    });
    const safety = window.setTimeout(() => !cancelled && setDone(true), 2200);
    return () => { cancelled = true; window.clearTimeout(safety); };
  }, [preloadAssets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const journey = journeyRef.current;
    if (!canvas || !journey) return;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) return;
    runtime.current.gl = gl;

    const vertexShader = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fragmentShader = `precision highp float;uniform vec2 r;uniform float t;uniform float s;
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
mat2 rot(float a){float c=cos(a),d=sin(a);return mat2(c,-d,d,c);}
float map(vec3 p){float k=smoothstep(.0,1.,s);p.z+=3.2+k*7.;p.xy*=rot(.12*sin(p.z*.7+t*.16));float tunnel=abs(length(p.xy)-1.7)-.045;vec3 q=p;q.xy=abs(q.xy)-vec2(1.18);float bars=sdBox(q,vec3(.025,.025,.8));float plane=sdBox(vec3(p.x,p.y,p.z-2.5),vec3(2.5,.015,2.5));float m=min(tunnel,bars);if(s>.13&&s<.39)m=min(m,plane+.08);return m;}
void main(){vec2 uv=(gl_FragCoord.xy-.5*r.xy)/r.y;vec3 ro=vec3(0.,0.,-3.);vec3 rd=normalize(vec3(uv,1.25));float yaw=(s-.5)*.22;rd.xz*=rot(yaw);float d=0.,glow=0.;vec3 p;for(int i=0;i<72;i++){p=ro+rd*d;float z=map(p);glow+=exp(-18.*abs(z))*.018;d+=max(.025,abs(z)*.72);if(d>16.)break;}vec3 bg=vec3(.012,.013,.016);float grid=pow(max(0.,1.-abs(sin((uv.x+uv.y*.32)*11.+t*.08))),28.)*.045;vec3 col=bg+vec3(.20,.33,.52)*glow+vec3(.15,.18,.22)*grid;float v=1.-smoothstep(.35,1.15,length(uv));col*=.55+.55*v;col+=vec3(.14,.19,.27)*max(0.,sin(t*.18+s*10.))*glow*.28;gl_FragColor=vec4(pow(col,vec3(.82)),1.);}`;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, vertexShader);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentShader);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program));
      return;
    }
    runtime.current.program = program;
    runtime.current.uR = gl.getUniformLocation(program, "r");
    runtime.current.uT = gl.getUniformLocation(program, "t");
    runtime.current.uS = gl.getUniformLocation(program, "s");

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 1.6);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const updateScenes = (progress: number) => {
      const ranges: [number, number][] = [[0, .2], [.14, .38], [.31, .54], [.47, .72], [.66, .86], [.8, 1]];
      const fade = .045;
      scenesRef.current.forEach((el, index) => {
        if (!el) return;
        const [aStart, aEnd] = ranges[index] ?? [0, 1];
        const alpha = sceneAlpha(progress, aStart, aEnd, fade);
        const local = (progress - aStart) / (aEnd - aStart);
        const z = (local - .5) * 120;
        el.style.opacity = alpha.toFixed(3);
        el.style.transform = `translate3d(0,${(.5 - local) * 28}px,${z}px) scale(${.965 + alpha * .035})`;
        el.classList.toggle("is-hit", alpha > .65);
      });

      const hero = scenesRef.current[0];
      hero?.querySelectorAll<HTMLElement>(".heroShift").forEach((el, index) => {
        el.style.transform = `translate3d(${(index % 2 ? 1 : -1) * range(progress, .02, .16) * 26}px,0,${range(progress, .02, .16) * 36}px)`;
      });

      const tiles = scenesRef.current[1]?.querySelectorAll<HTMLElement>(".siteTile");
      if (tiles) {
        const lm = range(progress, .16, .32);
        const base = ["rotateY(14deg) translateZ(-120px)", "rotateY(-9deg) translateZ(-40px)", "rotateY(-15deg) translateZ(-160px)", "rotateY(10deg) translateZ(-70px)"];
        tiles.forEach((tile, index) => {
          const x = (index - 1.5) * lm * 14;
          const zz = index === 1 ? lm * 210 : -lm * 55;
          tile.style.transform = `${base[index] ?? ""} translate3d(${x}px,${-lm * index * 4}px,${zz}px)`;
        });
      }

      const portfolioProgress = range(progress, .43, .67);
      const track = portfolioTrackRef.current;
      const viewport = portfolioViewportRef.current;
      if (track && viewport) {
        const max = Math.max(0, track.scrollWidth - viewport.clientWidth);
        const eased = smooth(portfolioProgress);
        track.style.transform = `translate3d(${(-max * eased).toFixed(2)}px,0,0)`;
        portfolioCardsRef.current.forEach((card, index) => {
          if (!card) return;
          const center = index / Math.max(1, portfolioCardsRef.current.length - 1);
          const delta = center - eased;
          const distance = Math.min(1, Math.abs(delta) * 3.2);
          const tilt = clamp(delta * 24, -10, 10);
          const z = 38 - distance * 70;
          const scale = 1 - distance * .035;
          card.style.opacity = (.72 + (1 - distance) * .28).toFixed(3);
          card.style.transform = `translateZ(${z.toFixed(1)}px) rotateY(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        });
      }

      const layers = scenesRef.current[4]?.querySelectorAll<HTMLElement>(".machineLayer");
      if (layers) {
        const mp = range(progress, .64, .79);
        layers.forEach((layer, index) => {
          const phase = clamp(mp * 5 - index * .23, 0, 1);
          layer.style.opacity = String(.18 + .82 * phase);
          layer.style.transform = `translate3d(${(index % 2 ? 1 : -1) * (1 - phase) * 90}px,0,${(1 - phase) * -180}px) rotateY(${(index % 2 ? 1 : -1) * (1 - phase) * 16}deg)`;
        });
      }
    };

    const onScroll = () => {
      const rect = journey.getBoundingClientRect();
      const max = journey.offsetHeight - window.innerHeight;
      const progress = clamp(-rect.top / Math.max(max, 1), 0, 1);
      runtime.current.progress = progress;
      document.documentElement.style.setProperty("--p", progress.toFixed(4));
      updateScenes(progress);
    };

    const tick = () => {
      resize();
      gl.useProgram(program);
      if (runtime.current.uR) gl.uniform2f(runtime.current.uR, canvas.width, canvas.height);
      if (runtime.current.uT) gl.uniform1f(runtime.current.uT, (performance.now() - runtime.current.start) / 1000);
      if (runtime.current.uS) gl.uniform1f(runtime.current.uS, runtime.current.progress);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      runtime.current.raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    onScroll();
    tick();

    return () => {
      cancelAnimationFrame(runtime.current.raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div className="app" id="top">
      <Loader value={loaded} done={done} />
      <header className="nav">
        <Logo />
        <nav className="nav__center">
          <a href="#experiencia">Experiência</a>
          <a href="#projetos">Projetos</a>
          <a href="#journey-method">Método</a>
          <a href="#fundador">Fundador</a>
        </nav>
        <button className="nav__cta" onClick={() => openWhatsapp()}>Quero sair da comparação ↗</button>
        <button className="menu" aria-label="Abrir menu" onClick={() => setMenu((value) => !value)}><i /></button>
      </header>

      <div className={`mobileMenu${menu ? " open" : ""}`}>
        <a href="#experiencia" onClick={() => setMenu(false)}>Experiência <span>01</span></a>
        <a href="#projetos" onClick={() => setMenu(false)}>Projetos <span>02</span></a>
        <a href="#journey-method" onClick={() => setMenu(false)}>Método <span>03</span></a>
        <a href="#fundador" onClick={() => setMenu(false)}>Fundador <span>04</span></a>
        <button onClick={() => openWhatsapp()}>Quero ver minha marca assim ↗</button>
      </div>

      <main ref={journeyRef} className="journey" id="experiencia">
        <div className="stage">
          <canvas className="webgl" ref={canvasRef} aria-hidden="true" />
          <div className="filmgrain" />
          <div className="vignette" />

          <Scene className="hero" sceneRef={(el) => { scenesRef.current[0] = el; }}>
            <div className="hero__wrap">
              <div className="kicker">GIROFY · CREATIVE TECHNOLOGY</div>
              <h1 className="headline">
                <span className="heroShift">Seu preço começa </span>
                <span className="heroShift stroke">antes da proposta.</span><br />
                <em className="heroShift">Começa na percepção.</em>
              </h1>
              <p className="bodycopy">Experiências digitais em 3D, motion e direção criativa para marcas que não querem disputar atenção como commodity.</p>
              <div className="ctaLine">
                <button className="button" onClick={() => openWhatsapp()}>Quero ver minha marca fora da comparação ↗</button>
                <span className="micro">SCROLL-DRIVEN · RESPONSIVO · WEBGL</span>
              </div>
              <div className="hero__proof"><span><b>3D</b>com função</span><span><b>Motion</b>com narrativa</span><span><b>Código</b>com performance</span></div>
            </div>
            <div className="scrollHint">CONDUZA A EXPERIÊNCIA<i /></div>
          </Scene>

          <Scene className="market" sceneRef={(el) => { scenesRef.current[1] = el; }}>
            <div className="market__wrap">
              <div className="market__copy">
                <div className="kicker">01 · O MERCADO PLANO</div>
                <h2 className="headline">Quando todos parecem <em>bons</em>, todos parecem <em>comparáveis</em>.</h2>
                <p className="bodycopy">E quando a comparação é fácil, o preço vira a conversa.</p>
              </div>
              <div className="market__plane" aria-hidden="true"><i className="siteTile" /><i className="siteTile breaker" /><i className="siteTile" /><i className="siteTile" /></div>
            </div>
          </Scene>

          <Scene className="breakout" sceneRef={(el) => { scenesRef.current[2] = el; }}>
            <div className="breakout__wrap">
              <div className="kicker">02 · GANHAR PROFUNDIDADE</div>
              <h2 className="headline">Não fazemos a sua marca <em>parecer melhor.</em><br />Fazemos ela <em>sair da categoria.</em></h2>
              <div className="equation"><span>COMPARÁVEL</span><b>→</b><span>NEGOCIÁVEL</span><b>/</b><span>MEMORÁVEL</span><b>→</b><span>DESEJÁVEL</span></div>
            </div>
            <div className="depthWord">DEPTH</div>
          </Scene>

          <Scene className="portfolio" sceneRef={(el) => { scenesRef.current[3] = el; }}>
            <div className="portfolio__head" id="projetos">
              <div><div className="kicker">03 · 14 DIREÇÕES</div><h2 className="headline">O nível permanece.<br /><em>A linguagem muda.</em></h2></div>
              <p>Ótica, saúde, construção, direito, hotelaria e casa. Nenhum projeto precisa herdar a estética do anterior.</p>
            </div>
            <div className="portfolioViewport" ref={portfolioViewportRef}>
              <div className="portfolioTrack" ref={portfolioTrackRef}>
                {PORTFOLIO.map((item, index) => (
                  <article className="portfolioCard" key={item.name} ref={(el) => { portfolioCardsRef.current[index] = el; }}>
                    <div className="portfolioCard__frame"><img src={item.src} srcSet={`${item.smallSrc} 760w, ${item.src} 1672w`} sizes="(max-width: 900px) 86vw, 36vw" alt={`Hero conceitual ${item.name}`} loading={index < 2 ? "eager" : "lazy"} decoding="async" /></div>
                    <div className="portfolioCard__meta"><span>{String(index + 1).padStart(2, "0")}</span><b>{item.name}</b></div>
                  </article>
                ))}
              </div>
            </div>
          </Scene>

          <Scene className="process" sceneRef={(el) => { scenesRef.current[4] = el; }}>
            <div className="process__wrap">
              <div className="process__copy"><div className="kicker">04 · A MÁQUINA POR TRÁS</div><h2 className="headline">Isso não sai de <em>um template.</em></h2><p className="bodycopy">Estratégia, direção, interface e movimento entram como camadas da mesma cena. O resultado precisa vender antes de ser explicado.</p></div>
              <div className="machine" aria-hidden="true">
                <div className="machineLayer"><span>01</span><b>Diagnóstico</b></div>
                <div className="machineLayer"><span>02</span><b>Direção criativa</b></div>
                <div className="machineLayer"><span>03</span><b>Motion + 3D</b></div>
                <div className="machineLayer"><span>04</span><b>Conversão + entrega</b></div>
              </div>
            </div>
          </Scene>

          <Scene className="founder" sceneRef={(el) => { scenesRef.current[5] = el; }}>
            <div className="founder__image"><img src="/assets/cesar.webp" alt="César, fundador da Girofy" loading="lazy" /></div>
            <div className="founder__copy" id="fundador"><div className="kicker">05 · QUEM DIRIGE</div><h2 className="headline">Não terceirizo a <em>visão.</em></h2><p className="bodycopy">Da primeira tese visual à experiência final, a direção continua no mesmo lugar. Menos ruído. Mais intenção.</p><div className="signature">César — Founder & Creative Direction</div></div>
          </Scene>

        </div>
      </main>

    </div>
  );
}
