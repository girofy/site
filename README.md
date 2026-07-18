<div align="center">

# ⚡ GIROFY — Arquitetura de Soluções Digitais

<p align="center">
  <strong>Engenharia digital focada em crescimento, eficiência operacional, posicionamento e vantagem competitiva.</strong>
</p>

<p align="center">
  <a href="https://girofy.com"><img src="https://img.shields.io/badge/Website-Girofy.com-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Girofy Website"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14.2.16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://github.com/girofy/site/blob/main/public/llms.txt"><img src="https://img.shields.io/badge/AI_Ready-llms.txt-8A2BE2?style=for-the-badge&logo=openai&logoColor=white" alt="AI Ready"></a>
</p>

---

</div>

## 🎯 Manifesto Girofy

> **A Girofy não vende sites. Não vende landing pages. Não vende aplicativos. Não vende sistemas. Não vende inteligência artificial.**
> 
> A Girofy projeta **soluções digitais sob medida** capazes de produzir um resultado real: crescimento, eficiência operacional, velocidade, redução de custos e vantagem competitiva sustentável.

```
                  ┌──────────────────────────────────────────┐
                  │          OBJETIVO DE NEGÓCIO             │
                  │ (Crescimento / Eficiência / Escala)      │
                  └────────────────────┬─────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
            ┌─────────────────────────┐ ┌─────────────────────────┐
            │   ENGENHARIA DIGITAL    │ │  AUTOMAÇÃO & IA AGENTS  │
            │  (Apps / SaaS / CRMs)   │ │ (Fluxos / Integrações)  │
            └─────────────────────────┘ └─────────────────────────┘
```

---

## 🛠️ Espectro de Atuação

A Girofy atua em qualquer camada da engenharia digital sem limite de complexidade:

- 🚀 **Plataformas & Landing Pages de Altíssima Conversão** — Carregamento instantâneo, UX fluido e otimização para conversão.
- ⚡ **SaaS & Web Applications Sob Medida** — Softwares escaláveis e intuitivos desenvolvidos do zero para atender sua regra de negócio.
- ⚙️ **ERPs, CRMs & Dashboards Operacionais** — Painéis de gestão interna que substituem planilhas manuais e reduzem erros operacionais.
- 🤖 **Agentes de IA & Automações de Processos** — Integrações inteligentes entre sistemas, automação de WhatsApp, atendimento e esteiras de dados.
- 🌐 **Arquitetura de Dados & APIs** — Ecossistema de microsserviços integrando seu negócio de ponta a ponta.

---

## 💎 Destaques Tecnológicos & Design System

- **Visual Studio-Grade Studio Aesthetic**: Interface em *Dark Mode* profundo com estética fosca, micro-interações, tipografia moderna e acabamento de alto padrão.
- **Cinematic Director (GSAP + ScrollTrigger)**: Direção de cena fluida com controle de rolagem e animações cinemáticas sem travamentos.
- **Smooth Scroll (Lenis)**: Rolagem suave e responsiva otimizada para todas as telas.
- **Custom Cursor & Magnetic CTA**: Componentes com física magnética e feedback tátil para máxima interatividade.
- **Protocolo AI Ready (`llms.txt` + `robots.txt` + `sitemap.xml`)**: Otimizado para indexação e leitura por Inteligências Artificiais (ChatGPT, Claude, Perplexity, Gemini).

---

## 📁 Estrutura do Projeto

```bash
girofy-official-site/
├── app/
│   ├── globals.css          # Design System, variáveis CSS, temas e keyframes
│   ├── layout.tsx           # Layout principal, SEO Metadata e fontes
│   ├── page.tsx             # Aplicação principal (Cenas cinemáticas 1 a 6)
│   └── sitemap.ts           # Gerador dinâmico de sitemap XML para buscadores/IAs
├── components/
│   ├── GiroDirector.tsx     # Orquestrador de scroll cinemático com GSAP
│   ├── CustomCursor.tsx     # Cursor personalizado interativo
│   ├── FloatingCta.tsx      # Botão flutuante para contato direto via WhatsApp
│   ├── MagneticCta.tsx      # Botão magnético com reação ao ponteiro
│   ├── Objections.tsx       # Seção expansível de quebra de objeções
│   ├── Odometer.tsx         # Contador numérico animado em tempo real
│   ├── Preloader.tsx        # Preloader dinâmico de entrada
│   ├── SmoothScroll.tsx     # Integração com Lenis Smooth Scroll
│   └── ui/                  # Componentes reutilizáveis de UI
├── public/
│   ├── girofy/              # Assets de marca, vídeos e fotografia do fundador
│   ├── llms.txt             # Documentação em texto puro otimizada para modelos de IA
│   └── robots.txt           # Regras de rastreamento e indicação de sitemap
├── lib/                     # Utilitários e helpers
├── package.json             # Dependências do projeto
└── tsconfig.json            # Configurações do TypeScript
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js `v18.0.0` ou superior
- npm / pnpm / yarn

### Passos

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/girofy/site.git
   cd site
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000` no seu navegador.

4. **Gerar a build de produção:**
   ```bash
   npm run build
   npm run start
   ```

---

## ☁️ Deploy de Produção (Zero-Downtime)

Este repositório está pronto para deploy instantâneo na **Vercel**:

1. Conecte sua conta do GitHub na [Vercel](https://vercel.com).
2. Importe o repositório `girofy/site`.
3. A Vercel detectará automaticamente a stack **Next.js** e fará o deploy com SSL gratuito, CDN global e atualizações automáticas a cada `git push origin main`.

---

## 📬 Contato & Suporte

- **Website**: [girofy.com](https://girofy.com)
- **WhatsApp**: [Solicitar Diagnóstico Gratuito](https://wa.me/5571999336635?text=Ol%C3%A1%2C%20Girofy!%20Quero%20solicitar%20um%20diagn%C3%B3stico%20gratuito%20do%20meu%20neg%C3%B3cio.)
- **GitHub**: [github.com/girofy/site](https://github.com/girofy/site)

---

<div align="center">
  <sub>© 2026 Girofy. Todos os direitos reservados. Projetado e construído com precisão cirúrgica.</sub>
</div>
