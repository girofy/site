"use client";

import Timeline from "@/components/ui/timeline";

export default function TimelineDemo() {
  return (
    <Timeline
      title="Do diagnóstico à decisão"
      periodLabel="GIROFY · SISTEMA DE PERCEPÇÃO"
      backgroundColor="#050506"
      textColor="#f4f2ed"
      mutedTextColor="#858990"
      activeColor="#a9cfff"
      imageUrl="/portfolio/10-vertice-sm.webp"
      imageAlt="Projeto Vértice desenvolvido como direção visual da Girofy"
      duration={1.25}
    />
  );
}
