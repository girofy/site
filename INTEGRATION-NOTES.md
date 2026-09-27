# Timeline integration notes

## What was integrated
The Hyperiux/GSAP pinned horizontal timeline mechanic was integrated as `src/components/ui/timeline.tsx` and composed through `src/components/sections/TimelineDemo.tsx`.

## Existing codebase audit
The uploaded project was a no-build React UMD project (`React.createElement`, local React vendor scripts, plain CSS) and did **not** have:
- TypeScript
- Tailwind CSS
- shadcn structure
- npm GSAP dependency

The project was migrated to Vite + React + TypeScript + Tailwind and prepared for shadcn via `components.json`.

## Default paths
- Reusable UI components: `src/components/ui/`
- Global Tailwind styles: `src/styles/globals.css`
- Existing cinematic styles: `src/styles/cinematic.css`
- shadcn alias: `@/components/ui`

`src/components/ui` is important because shadcn-generated imports and future CLI additions resolve consistently through the `@/components/ui` alias.

## Dependencies
Required by the provided component:
- `gsap` (`ScrollTrigger` + `SplitText`)

Common shadcn dependencies were also prepared (`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `tailwindcss-animate`). No Lucide icon was forced into Timeline because the supplied component does not require an icon.

## Data/props selected
Instead of keeping the generic 2020–2026 roadmap copy, the same motion system now tells the Girofy process:
1. Diagnóstico
2. Tese de percepção
3. Direção criativa
4. Arquitetura narrativa
5. Motion + 3D
6. Performance
7. Conversão

The component accepts `topItems` and `bottomItems`, so content can change without editing animation logic.

## State management
No global state/provider is necessary. The component uses refs, GSAP context and `prefers-reduced-motion` only.

## Assets
The timeline uses an existing Girofy portfolio asset (`/portfolio/10-vertice.webp`) rather than adding stock imagery. This avoids another external dependency and keeps the section tied to the portfolio.

## Responsive behavior
- Desktop: pinned horizontal motion over `200vw` of scroll space.
- Mobile: taller `400vh` interaction window, wider track, larger typography and milestone spacing.
- Reduced motion: lines and content remain readable without scroll reveals.

## Placement
The component is placed after the core cinematic experience and before the final risk-reversal/contact sequence. It acts as the bridge between emotional proof and the buying decision.

## SEO preserved from the discarded branch
Only the search/discovery infrastructure was carried over conceptually: metadata, canonical, Organization/Service/WebSite structured data, robots.txt, sitemap.xml, llms.txt and the broader commercial intent language. The discarded branch's visual implementation was not reused.
