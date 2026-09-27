# Girofy — React + TypeScript + Tailwind + shadcn structure

Base: projeto cinematográfico enviado pelo usuário, migrado para Vite/React/TypeScript sem reaproveitar o visual da versão descartada. Da versão descartada foram preservadas apenas a pesquisa/infraestrutura de SEO e descoberta.

## Estrutura
- `src/components/ui/` — componentes reutilizáveis no padrão shadcn. O Timeline está em `src/components/ui/timeline.tsx`.
- `src/components/cinematic/` — motor e experiência cinematográfica principal.
- `src/components/sections/` — composição de seções específicas da Girofy.
- `src/styles/globals.css` — Tailwind e tokens globais.
- `src/styles/cinematic.css` — direção visual da experiência original.
- `public/` — assets, portfólio e arquivos técnicos de SEO/GEO.

O shadcn usa o alias `@/components/ui`, mapeado em `components.json` e `tsconfig.app.json`. Em Vite, o diretório físico padrão escolhido aqui é `src/components/ui`, que é equivalente a `/components/ui` através do alias `@`.

## Dependências
```bash
npm install
```
O componente Timeline depende de `gsap` e usa `ScrollTrigger` + `SplitText`.

## Desenvolvimento
```bash
npm run dev
```

## Build
```bash
npm run build
```
A saída fica em `dist/`.

## shadcn CLI
A estrutura já está preparada. Para adicionar novos componentes:
```bash
npx shadcn@latest add button
```

## Observação de conteúdo
A Timeline foi adaptada para a narrativa comercial da Girofy: diagnóstico → tese de percepção → direção criativa → arquitetura narrativa → motion/3D → performance → conversão. Não foram mantidos os textos genéricos de roadmap do componente de referência.
