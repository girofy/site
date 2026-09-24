// Built using Hyperiux Vault mechanics and adapted for Girofy.
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

type JourneyItem = {
  id: string;
  marker: string;
  title: string;
  content: string;
};

type SplitTextInstance = InstanceType<typeof SplitText>;

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
  topItems?: JourneyItem[];
  bottomItems?: JourneyItem[];
};

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

const defaultTopJourneyData: JourneyItem[] = [
  {
    id: "diagnostico",
    marker: "01",
    title: "Diagnóstico",
    content: "Entender mercado, oferta, percepção atual e o que está tornando a marca comparável.",
  },
  {
    id: "direcao",
    marker: "03",
    title: "Direção criativa",
    content: "Definir uma tese visual e narrativa que a concorrência não consiga copiar trocando logo e cor.",
  },
  {
    id: "motion",
    marker: "05",
    title: "Motion + 3D",
    content: "Movimento entra para conduzir atenção, demonstrar valor e criar memória — não para decorar.",
  },
  {
    id: "entrega",
    marker: "07",
    title: "Entrega",
    content: "Performance, responsividade, SEO técnico e uma experiência pronta para receber tráfego real.",
  },
];

const defaultBottomJourneyData: JourneyItem[] = [
  {
    id: "arquitetura",
    marker: "02",
    title: "Arquitetura",
    content: "Organizar a jornada para transformar curiosidade em compreensão, desejo e próximo passo.",
  },
  {
    id: "prototipo",
    marker: "04",
    title: "Protótipo",
    content: "Ver a direção cedo, corrigir rápido e reduzir o risco de aprovar uma promessa abstrata.",
  },
  {
    id: "conversao",
    marker: "06",
    title: "Conversão",
    content: "CTA, prova, oferta e contexto trabalham juntos para gerar conversas mais qualificadas.",
  },
];

export default function Timeline({
  title = "Da tese à experiência",
  periodLabel = "7 CAMADAS · 1 SISTEMA",
  textColor = "var(--color-foreground, #ffffff)",
  mutedTextColor = "var(--color-muted-foreground, #a1a1aa)",
  activeColor = "#9fc7ff",
  backgroundColor = "var(--color-background, #050506)",
  imageUrl = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=78",
  imageAlt = "Estúdio de criação e estratégia digital",
  duration,
  scrollDuration = 1.2,
  topItems = defaultTopJourneyData,
  bottomItems = defaultBottomJourneyData,
}: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);
  const allJourneyItems = [...topItems, ...bottomItems];

  const sectionStyle: CSSProperties = { color: textColor, backgroundColor };
  const activeStyle: CSSProperties = { backgroundColor: activeColor };
  const mutedTextStyle: CSSProperties = { color: mutedTextColor };

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    const isMobile = window.innerWidth < 600;
    const slidePercent = isMobile ? -57 : -65;
    const lineWidth = isMobile ? "65%" : "98%";
    const lineStart = isMobile ? "top 30%" : "top 25%";
    const slideEnd = isMobile ? "82% 50%" : "92% bottom";
    const lineEnd = isMobile ? "80% 50%" : "92% bottom";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: slideEnd,
        scrub: true,
        invalidateOnRefresh: true,
      },
      defaults: { ease: "none" },
    });

    tl.fromTo(wholeSliderRef.current, { xPercent: 0 }, { xPercent: slidePercent });

    if (reducedMotion) {
      gsap.set(".journey-line", { width: lineWidth });
      return;
    }

    gsap.to(".journey-line", {
      width: lineWidth,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: lineStart,
        end: lineEnd,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }, { dependencies: [reducedMotion], scope: sectionRef });

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (reducedMotion) {
      allJourneyItems.forEach((item) => {
        gsap.set(`.jl-${item.id}`, { scaleY: 1 });
        gsap.set(`.jd-${item.id}`, { scale: 1 });
        gsap.set(`.title-${item.id}`, { opacity: 1, clearProps: "transform" });
        gsap.set(`.description-${item.id}`, { opacity: 1, clearProps: "transform" });
      });
      return;
    }

    allJourneyItems.forEach((item) => {
      gsap.set(`.jl-${item.id}`, { scaleY: 0, transformOrigin: "bottom bottom" });
      gsap.set(`.jd-${item.id}`, { scale: 0 });
      gsap.set(`.title-${item.id}`, { opacity: 1 });
      gsap.set(`.description-${item.id}`, { opacity: 1 });
    });

    const titleSplits: Partial<Record<string, SplitTextInstance>> = {};
    const descriptionSplits: Partial<Record<string, SplitTextInstance>> = {};

    allJourneyItems.forEach((item) => {
      titleSplits[item.id] = new SplitText(`.title-${item.id}`, {
        type: "chars, words, lines",
        mask: "lines",
      });
      descriptionSplits[item.id] = new SplitText(`.description-${item.id}`, {
        type: "chars, words, lines",
        mask: "lines",
      });
    });

    const createItemTimeline = (item: JourneyItem, startPos: number, endPos: number) => {
      const lineSelector = `.jl-${item.id}`;
      const dotSelector = `.jd-${item.id}`;
      const titleLines = titleSplits[item.id]?.lines || [];
      const descriptionLines = descriptionSplits[item.id]?.lines || [];
      const isTop = topItems.some((topItem) => topItem.id === item.id);
      if (!isTop) gsap.set(lineSelector, { transformOrigin: "top top" });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: `${startPos}% 30%`,
          end: `${endPos}% 50%`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .to(lineSelector, { scaleY: 1, duration: normalizedDuration * 0.4 })
        .to(dotSelector, { scale: 1, duration: normalizedDuration * 0.4 }, "<")
        .fromTo(
          titleLines,
          { y: 100 },
          {
            y: 0,
            delay: -0.8 * normalizedDuration,
            duration: normalizedDuration,
            stagger: 0.02,
            ease: "power2.out",
          },
        )
        .fromTo(
          descriptionLines,
          { y: 100 },
          {
            y: 0,
            duration: normalizedDuration,
            stagger: 0.02,
            ease: "power2.out",
          },
          "<",
        );
    };

    const positions: ReadonlyArray<readonly [number, number]> =
      window.innerWidth < 600
        ? [[22, 32], [28, 38], [36, 46], [45, 55], [52, 62], [60, 70], [69, 79]]
        : [[6, 26], [16, 36], [26, 46], [35, 55], [45, 65], [55, 75], [65, 85]];

    allJourneyItems.forEach((item, index) => {
      const [startPos, endPos] = positions[index] ?? positions[positions.length - 1];
      createItemTimeline(item, startPos, endPos);
    });

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      Object.values(titleSplits).forEach((split) => split?.revert?.());
      Object.values(descriptionSplits).forEach((split) => split?.revert?.());
      window.removeEventListener("resize", handleResize);
    };
  }, {
    dependencies: [normalizedDuration, reducedMotion, topItems, bottomItems],
    scope: sectionRef,
  });

  return (
    <section
      ref={sectionRef}
      id="journey-process"
      className="relative h-[200vw] w-full max-[600px]:h-[400vh]"
      style={sectionStyle}
    >
      <div className="sticky top-0 h-screen w-screen overflow-hidden pt-[10%] max-[600px]:top-[5%]">
        <div
          ref={wholeSliderRef}
          className="mr-[2vw] flex h-[30vw] w-[240vw] items-center gap-[5vw] px-[5vw] max-[600px]:h-[80vh] max-[600px]:w-[800vw] max-[600px]:px-[7vw]"
        >
          <div className="h-full w-[30vw] overflow-hidden rounded-[1vw] border border-white/10 max-[600px]:h-[65vw] max-[600px]:w-[85vw] max-[600px]:rounded-[5vw]">
            <img
              src={imageUrl}
              alt={imageAlt}
              draggable={false}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover grayscale-[15%]"
            />
          </div>

          <div className="relative h-full w-full">
            <div className="absolute left-0 top-[49%] flex h-fit w-full -translate-y-1/2 items-center">
              <div className="h-[.8vw] w-[.8vw] rounded-full max-[600px]:h-[2vw] max-[600px]:w-[2vw]" style={activeStyle} />
              <div className="journey-line h-px w-0 rounded-full" style={activeStyle} />
              <div className="h-[.8vw] w-[.8vw] rounded-full max-[600px]:h-[2vw] max-[600px]:w-[2vw]" style={activeStyle} />
            </div>

            <div className="flex h-1/2 w-full items-center justify-start gap-[.5vw]">
              <div className="h-full w-[20%] pt-[2vw] max-[600px]:h-fit max-[600px]:pt-[5vw]">
                <h2 className="w-[65%] text-[3vw] leading-[0.95] tracking-[-0.05em] max-[600px]:text-[8.5vw]">
                  {title}
                </h2>
              </div>

              <div className="flex h-full w-full gap-x-[15vw] max-[600px]:gap-x-[40vw]">
                {topItems.map((item) => (
                  <div key={`top-${item.id}`} className="relative h-full w-[30vw] px-[3vw] max-[600px]:flex max-[600px]:w-[70vw] max-[600px]:flex-col max-[600px]:px-[7vw]">
                    <div className="absolute bottom-0 left-0 top-0 h-full w-full">
                      <div className={`jd-${item.id} relative aspect-square size-[1vw] -translate-x-1/2 rounded-full max-[600px]:size-[2.5vw]`} style={activeStyle} />
                      <div className={`jl-${item.id} h-[94%] w-px origin-bottom rounded-full`} style={activeStyle} />
                    </div>
                    <div className="mt-[-1vw] space-y-[1vw] max-[600px]:mt-[-2vw]">
                      <p className="font-mono text-[.7vw] uppercase tracking-[.25em] text-white/45 max-[600px]:text-[2vw]">{item.marker}</p>
                      <h4 className={`title-${item.id} text-[2.5vw] leading-none tracking-[-0.04em] max-[600px]:text-[6.4vw]`}>{item.title}</h4>
                      <p className={`description-${item.id} w-[90%] text-[1.05vw] leading-[1.35] max-[600px]:w-[90%] max-[600px]:text-[3.7vw]`} style={mutedTextStyle}>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex h-1/2 w-full items-center justify-start">
              <div className="h-full w-[34%] pt-[2vw] max-[600px]:w-[30%] max-[600px]:pt-[5vw]">
                <p className="font-mono text-[.78vw] uppercase tracking-[.22em] max-[600px]:text-[2.2vw]" style={mutedTextStyle}>{periodLabel}</p>
              </div>

              <div className="ml-[7vw] flex h-full w-full gap-x-[20vw] max-[600px]:ml-[7vw] max-[600px]:gap-x-[40vw]">
                {bottomItems.map((item) => (
                  <div key={`bottom-${item.id}`} className="relative h-full w-[25vw] px-[3vw] max-[600px]:w-[70vw] max-[600px]:px-[7vw]">
                    <div className="absolute bottom-[-1%] left-0 h-full w-full">
                      <div className={`jl-${item.id} h-[94%] w-px origin-top rounded-full max-[600px]:h-full`} style={activeStyle} />
                      <div className={`jd-${item.id} relative aspect-square size-[1vw] -translate-x-1/2 rounded-full max-[600px]:size-[2.5vw]`} style={activeStyle} />
                    </div>
                    <div className="flex h-full w-full flex-col justify-end space-y-[1vw] pb-[.5vw]">
                      <p className="font-mono text-[.7vw] uppercase tracking-[.25em] text-white/45 max-[600px]:text-[2vw]">{item.marker}</p>
                      <h4 className={`title-${item.id} text-[2.5vw] leading-none tracking-[-0.04em] max-[600px]:text-[6.4vw]`}>{item.title}</h4>
                      <p className={`description-${item.id} w-[90%] text-[1.05vw] leading-[1.35] max-[600px]:w-[90%] max-[600px]:text-[3.7vw]`} style={mutedTextStyle}>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
