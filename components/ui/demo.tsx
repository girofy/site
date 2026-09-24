"use client";

import Timeline from "@/components/ui/timeline";

const settings = {
  textColor: "var(--color-foreground, #f3f1eb)",
  mutedTextColor: "var(--color-muted-foreground, #8a8d94)",
  activeColor: "#9fc7ff",
  backgroundColor: "var(--color-background, #050506)",
  duration: 1.25,
};

export default function TimelineDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  return (
    <main className="bg-background text-foreground">
      <section className="flex min-h-[72vh] flex-col justify-end gap-5 px-[var(--safe,6vw)] pb-[12vh] pt-[16vh]">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          05 · COMO A GIROFY CONSTRÓI DISTÂNCIA
        </p>
        <h2 className="max-w-[10ch] text-[clamp(52px,8vw,124px)] font-semibold leading-[0.88] tracking-[-0.065em]">
          Não é uma sequência de telas. <span className="font-serif font-normal italic text-white/75">É um sistema de percepção.</span>
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Continue rolando. A seção trava, avança horizontalmente e revela as camadas que transformam estratégia em experiência, performance e conversa comercial.
        </p>
      </section>

      <Timeline
        title="Da tese à experiência"
        periodLabel="7 CAMADAS · 1 SISTEMA"
        backgroundColor={s.backgroundColor}
        textColor={s.textColor}
        mutedTextColor={s.mutedTextColor}
        activeColor={s.activeColor}
        imageUrl="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=78"
        imageAlt="Estúdio contemporâneo de criação"
        duration={s.duration}
      />

      <section className="flex min-h-[48vh] items-center px-[var(--safe,6vw)] py-20">
        <p className="max-w-3xl text-[clamp(28px,4.6vw,72px)] leading-[0.98] tracking-[-0.045em] text-white/90">
          O objetivo não é adicionar mais efeito. É fazer cada camada empurrar a marca para fora da comparação.
        </p>
      </section>
    </main>
  );
}
