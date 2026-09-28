# Girofy — experiência digital imersiva

Experiência autoral em React + TypeScript. A narrativa transforma o scroll em uma travessia por uma matéria cromada: o usuário vê sinais do mercado indiferenciado, atravessa a ruptura, encontra projetos reais e chega ao método e à conversa comercial.

## Direção e estrutura

- `src/components/cinematic/ImmersiveExperience.tsx` — cena Three.js, shaders 4D, pinning do ScrollTrigger, áudio opcional, leitura local de capturas, navegação de projetos e formulário de contato.
- `src/lib/kinetic.js` — progressão de capítulo, campo de atração do ponteiro e validação de arquivo.
- `src/lib/noise4d.glsl` — ruído Simplex 4D; licença em `NOISE-LICENSE.txt`.
- `src/styles/cinematic.css` — direção de arte, estados tipográficos, cenas e composições próprias para telas menores.
- `public/portfolio/` e `public/assets/` — projetos e retrato já fornecidos no material da Girofy.

Os componentes das versões anteriores permanecem no repositório, mas o `src/App.tsx` atual monta somente a experiência imersiva.

## Interações

- O cursor deforma a membrana e atrai fragmentos cromados.
- A rolagem prende a câmera por sete capítulos e move o cenário no eixo de profundidade.
- A leitura de captura de site funciona no próprio navegador e extrai uma cor média; o arquivo não é enviado a um servidor.
- O portfólio pode ser navegado por botões e lista de projetos.
- O campo de marca grava o nome na placa e abre uma conversa da Girofy no WhatsApp.
- O áudio é opt-in e só é criado após ação do visitante.

## Acessibilidade e degradação elegante

`prefers-reduced-motion` remove o pinning e apresenta todos os capítulos como leitura vertical. O conteúdo essencial continua em HTML. Se WebGL não estiver disponível, o percurso de scroll e a tipografia permanecem ativos com uma composição estática de linhas metálicas.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Verificação

```bash
npm test
npm run build
```

A saída otimizada fica em `dist/`. O motor Three.js é carregado como pacote assíncrono separado do conteúdo e da primeira dobra.
