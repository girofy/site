# Girofy

Site da Girofy em React, TypeScript, Vite e Tailwind CSS.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar na Vercel

Importe este repositório na Vercel. Ela detecta o Vite automaticamente. Use estas configurações se precisar defini-las manualmente:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

O build de produção pode ser validado localmente com:

```bash
npm ci
npm run build
```

## Estrutura

- `src/main.tsx` inicializa a aplicação React e a timeline.
- `src/legacy-app.js` contém a experiência cinematográfica original.
- `components/ui/timeline.tsx` implementa a timeline GSAP.
- `styles.css` contém os estilos da experiência.
- `public/portfolio` e `public/assets` guardam imagens servidas diretamente pelo Vite.

As imagens em `public/` são copiadas para a raiz de `dist/` no build. O projeto usa o diretório `components/ui` para manter componentes reutilizáveis e imports compatíveis com a estrutura shadcn.
