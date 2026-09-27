"use client";

import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  },
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export type TimelineItem = {
  id: string;
  eyebrow: string;
  title: string;
  content: string;
};

export type TimelineProps = {
  title?: string;
  periodLabel?: string;
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  duration?: number;
  scrollDuration?: number;
  topItems?: TimelineItem[];
  bottomItems?: TimelineItem[];
};

type SplitTextInstance = InstanceType<typeof SplitText>;

const defaultTopItems: TimelineItem[] = [
  {
    id: "diagnostico",
    eyebrow: "01 · LEITURA",
    title: "Diagnóstico",
    content: "Encontramos onde sua presença perde valor, clareza ou desejo antes de alguém pedir preço.",
  },
  {
    id: "direcao",
    eyebrow: "03 · SISTEMA",
    title: "Direção criativa",
    content: "Uma ideia central organiza tipografia, imagem, interface e comportamento em vez de empilhar efeitos.",
  },
  {
    id: "motion",
    eyebrow: "05 · RITMO",
    title: "Motion + 3D",
    content: "Movimento entra para explicar, conduzir e criar memória — não para decorar uma tela comum.",
  },
  {
    id: "conversao",
    eyebrow: "07 · AÇÃO",
    title: "Conversão",
    content: "A experiência termina em uma decisão clara: conversar, pedir uma direção ou avançar para o projeto.",
  },
];

const defaultBottomItems: TimelineItem[] = [
  {
    id: "tese",
    eyebrow: "02 · POSIÇÃO",
    title: "Tese de percepção",
    content: "Definimos o que precisa ser sentido antes que o visitante leia uma explicação ou veja uma proposta.",
  },
  {
    id: "arquitetura",
    eyebrow: "04 · EXPERIÊNCIA",
    title: "Arquitetura narrativa",
    content: "Scroll, cena e conteúdo avançam como uma história: problema, ruptura, prova, método e convite.",
  },
  {
    id: "performance",
    eyebrow: "06 · ENGENHARIA",
    title: "Performance",
    content: "Mobile, carregamento e FPS são tratados como parte da direção; uma experiência premium não pode parecer quebrada.",
  },
];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

export default function Timeline({
  title = "Como a percepção ganha profundidade",
  periodLabel = "PERCEPÇÃO → CONVERSÃO",
  textColor = "var(--color-foreground, #f4f2ed)",
  mutedTextColor = "var(--color-muted-foreground, #8b8e96)",
  activeColor = "#a9cfff",
  backgroundColor = "#050506",
  imageUrl = "/portfolio/10-vertice.webp",
  imageAlt = "Projeto digital Girofy em interface premium",
  duration,
  scrollDuration = 1.2,
  topItems = defaultTopItems,
  bottomItems = defaultBottomItems,
}: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);
  const items = [...topItems, ...bottomItems];

  const sectionStyle: CSSProperties = { color: textColor, backgroundColor };
  const activeStyle: CSSProperties = { backgroundColor: activeColor };
  const mutedTextStyle: CSSProperties = { color: mutedTextColor };

  useGSAP(
    () => {
      const section = sectionRef.current;
      const slider = wholeSliderRef.current;
      if (!section || !slider) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          mobile: "(max-width: 599px)",
          desktop: "(min-width: 600px)",
        },
        (context) => {
          const isMobile = Boolean(context.conditions?.mobile);
          const slidePercent = isMobile ? -57 : -65;
          const lineWidth = isMobile ? "65%" : "98%";
          const lineStart = isMobile ? "top 30%" : "top 25%";
          const slideEnd = isMobile ? "82% 50%" : "92% bottom";
          const lineEnd = isMobile ? "80% 50%" : "92% bottom";

          gsap.fromTo(
            slider,
            { xPercent: 0 },
            {
              xPercent: slidePercent,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: slideEnd,
                scrub: true,
              },
            },
          );

          if (reducedMotion) {
            gsap.set(section.querySelectorAll(".journey-line"), { width: lineWidth });
          } else {
            gsap.to(section.querySelectorAll(".journey-line"), {
              width: lineWidth,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: lineStart,
                end: lineEnd,
                scrub: true,
              },
            });
          }
        },
      );

      return () => mm.revert();
    },
    { dependencies: [reducedMotion], scope: sectionRef },
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const titleSplits: Partial<Record<string, SplitTextInstance>> = {};
      const descriptionSplits: Partial<Record<string, SplitTextInstance>> = {};

      if (reducedMotion) {
        items.forEach((item) => {
          gsap.set(section.querySelector(`.jl-${item.id}`), { scaleY: 1 });
          gsap.set(section.querySelector(`.jd-${item.id}`), { scale: 1 });
        });
        return;
      }

      items.forEach((item) => {
        const line = section.querySelector(`.jl-${item.id}`);
        const dot = section.querySelector(`.jd-${item.id}`);
        const titleEl = section.querySelector(`.title-${item.id}`);
        const descEl = section.querySelector(`.description-${item.id}`);
        if (!line || !dot || !titleEl || !descEl) return;

        const isTop = topItems.some((topItem) => topItem.id === item.id);
        gsap.set(line, {
          scaleY: 0,
          transformOrigin: isTop ? "bottom bottom" : "top top",
        });
        gsap.set(dot, { scale: 0 });

        titleSplits[item.id] = new SplitText(titleEl, {
          type: "chars, words, lines",
          mask: "lines",
        });
        descriptionSplits[item.id] = new SplitText(descEl, {
          type: "chars, words, lines",
          mask: "lines",
        });
      });

      const positions =
        window.innerWidth < 600
          ? [[22, 32], [28, 38], [36, 46], [45, 55], [52, 62], [60, 70], [69, 79]]
          : [[6, 26], [16, 36], [26, 46], [35, 55], [45, 65], [55, 75], [65, 85]];

      items.forEach((item, index) => {
        const [startPos, endPos] = positions[index] ?? [70, 88];
        const line = section.querySelector(`.jl-${item.id}`);
        const dot = section.querySelector(`.jd-${item.id}`);
        const titleLines = titleSplits[item.id]?.lines ?? [];
        const descriptionLines = descriptionSplits[item.id]?.lines ?? [];
        if (!line || !dot) return;

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: `${startPos}% 30%`,
            end: `${endPos}% 50%`,
            scrub: true,
          },
        });

        timeline
          .to(line, { scaleY: 1, duration: normalizedDuration * 0.4 })
          .to(dot, { scale: 1, duration: normalizedDuration * 0.4 }, "<")
          .fromTo(
            titleLines,
            { yPercent: 115 },
            {
              yPercent: 0,
              delay: -0.8 * normalizedDuration,
              duration: normalizedDuration,
              stagger: 0.02,
              ease: "power2.out",
            },
          )
          .fromTo(
            descriptionLines,
            { yPercent: 115 },
            {
              yPercent: 0,
              duration: normalizedDuration,
              stagger: 0.02,
              ease: "power2.out",
            },
            "<",
          );
      });

      const handleResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", handleResize);

      return () => {
        Object.values(titleSplits).forEach((split) => split?.revert?.());
        Object.values(descriptionSplits).forEach((split) => split?.revert?.());
        window.removeEventListener("resize", handleResize);
      };
    },
    {
      dependencies: [normalizedDuration, reducedMotion, topItems, bottomItems],
      scope: sectionRef,
    },
  );

  const Item = ({ item, top }: { item: TimelineItem; top: boolean }) => (
    <div
      className={`relative h-full ${top ? "w-[30vw]" : "w-[25vw]"} px-[3vw] max-[600px]:w-[70vw] max-[600px]:px-[7vw]`}
    >
      <div className={`absolute left-0 h-full w-full ${top ? "top-0" : "bottom-[-1%]"}`}>
        {!top && (
          <div
            className={`jl-${item.id} h-[94%] w-px origin-top rounded-full max-[600px]:h-full`}
            style={activeStyle}
          />
        )}
        <div
          className={`jd-${item.id} relative aspect-square size-[1vw] -translate-x-1/2 rounded-full max-[600px]:size-[2.5vw]`}
          style={activeStyle}
        />
        {top && (
          <div
            className={`jl-${item.id} h-[94%] w-px origin-bottom rounded-full`}
            style={activeStyle}
          />
        )}
      </div>

      <div className={top ? "mt-[-1vw] space-y-[1vw] max-[600px]:mt-[-2vw]" : "flex h-full w-full flex-col justify-end space-y-[1vw]"}>
        <p className="font-mono text-[.62vw] uppercase tracking-[.2em] max-[600px]:text-[2.4vw]" style={mutedTextStyle}>
          {item.eyebrow}
        </p>
        <h4 className={`title-${item.id} text-[2.5vw] leading-none max-[600px]:text-[6.4vw]`}>
          {item.title}
        </h4>
        <p className={`description-${item.id} w-[90%] text-[1.25vw] leading-[1.25] max-[600px]:text-[4.25vw]`} style={mutedTextStyle}>
          {item.content}
        </p>
      </div>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      id="journey-method"
      className="relative h-[200vw] w-full max-[600px]:h-[400vh]"
      style={sectionStyle}
      aria-labelledby="journey-method-title"
    >
      <div className="sticky top-0 h-screen w-screen overflow-hidden pt-[10%] max-[600px]:top-[5%]">
        <div
          ref={wholeSliderRef}
          className="mr-[2vw] flex h-[30vw] w-[240vw] items-center gap-[5vw] px-[5vw] max-[600px]:h-[80vh] max-[600px]:w-[800vw] max-[600px]:px-[7vw]"
        >
          <div className="relative h-full w-[30vw] overflow-hidden rounded-[1vw] border border-white/10 max-[600px]:h-[65vw] max-[600px]:w-[85vw] max-[600px]:rounded-[5vw]">
            <img src={imageUrl} alt={imageAlt} draggable={false} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/[.03]" />
          </div>

          <div className="relative h-full w-full">
            <div className="absolute left-0 top-[49%] flex h-fit w-full -translate-y-1/2 items-center">
              <div className="size-[.8vw] rounded-full max-[600px]:size-[2vw]" style={activeStyle} />
              <div className="journey-line h-px w-0 rounded-full" style={activeStyle} />
              <div className="size-[.8vw] rounded-full max-[600px]:size-[2vw]" style={activeStyle} />
            </div>

            <div className="flex h-1/2 w-full items-center justify-start gap-[.5vw]">
              <div className="h-full w-[20%] pt-[2vw] max-[600px]:h-fit max-[600px]:pt-[5vw]">
                <h2 id="journey-method-title" className="w-[82%] text-[3vw] leading-[.95] tracking-[-.055em] max-[600px]:text-[8.5vw]">
                  {title}
                </h2>
              </div>
              <div className="flex h-full w-full gap-x-[15vw] max-[600px]:gap-x-[40vw]">
                {topItems.map((item) => <Item key={item.id} item={item} top />)}
              </div>
            </div>

            <div className="flex h-1/2 w-full items-center justify-start">
              <div className="h-full w-[34%] pt-[2vw] max-[600px]:w-[30%] max-[600px]:pt-[5vw]">
                <p className="font-mono text-[1vw] uppercase tracking-[.18em] max-[600px]:text-[3vw]" style={mutedTextStyle}>
                  {periodLabel}
                </p>
              </div>
              <div className="ml-[7vw] flex h-full w-full gap-x-[20vw] max-[600px]:ml-[7vw] max-[600px]:gap-x-[40vw]">
                {bottomItems.map((item) => <Item key={item.id} item={item} top={false} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
