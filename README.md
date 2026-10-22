# Girofy

Site público da Girofy em português, com nove páginas institucionais indexáveis, um briefing e um painel privado de hospedagem em `/hosp`.

Antes de alterar o projeto, leia `AGENTS.md` para o contexto compartilhado entre agentes e `docs/MASTER.md` para as decisões da experiência. A estratégia de descoberta, Ads, SEO e conversão está em `docs/ESTRATEGIA-DE-AQUISICAO.md`.

## Preparar, testar e pré-visualizar

1. Use Node.js 22.13 ou superior.
2. Rode `npm run install:ci` para instalar as dependências travadas.
3. Rode `npm run dev` e acesse `http://localhost:5173/`.
4. Para abrir o painel local, crie `.dev.vars` com `HOSP_ADMIN_PASSWORD=uma-chave-local` e acesse `/hosp`.
5. Rode `npm run typecheck`, `npm run build` e `node scripts/smoke-local.mjs` antes de publicar.

`build.py` prepara as páginas comerciais em `public/`. O build completo em `dist/` contém o Worker e os ativos do site. Para testar o Worker compilado, rode `npm start`. No Site oficial, mantenha o projeto existente `girofy-experience`, seu domínio e seu acesso público.

O endpoint MCP preparado fica em `functions/mcp.js`. Ele não faz parte do fluxo de hospedagem nem deve ser declarado ativo sem confirmação da capacidade no Site.

## Painel de hospedagem

- Acesse `https://girofy.site/hosp` e informe a chave compartilhada. O painel não pede conta nem usa banco de dados.
- Envie um ZIP, uma pasta ou arquivos estáticos como HTML, CSS, JavaScript, imagens, áudio e vídeo. Em ZIPs, o painel detecta saídas `dist/`, `build/` e `out/` e deixa escolher a pasta de publicação; caminhos comuns de imagens, `srcset`, CSS e assets com hash em bundles são ajustados para `/{slug}`. O painel não executa NPM, Next.js SSR, Node ou código de servidor: envie a saída já compilada.
- Cada publicação aceita até 50 MB e 500 arquivos, com máximo de 10 MB por arquivo; cada projeto mantém até 12 versões recentes. A cota de produção também depende dos limites do Site.
- O endereço fica em `https://girofy.site/{slug}`. Subdomínios por projeto ainda não estão configurados.
- Os projetos publicados são públicos. Arquivos privados comuns, como `.env`, chaves e pastas de dependências, são recusados. O HTML/SVG publicado roda sob CSP sandbox, sem compartilhar cookies ou `localStorage` do domínio oficial.
- O atalho flutuante da Netlify abre o endereço HTTPS configurado em **Configurações**; a URL e a visibilidade do botão ficam salvas no dispositivo do navegador.
- A chave abre uma sessão segura por sete dias. Para sair, use **Bloquear painel**.
- No Site oficial, `HOSP_ADMIN_PASSWORD` é configurado como segredo de ambiente. Não salve a chave no projeto ou no ZIP.

## Páginas indexáveis

- `index.html`: apresentação, jornada, estudos conceituais e entradas para as soluções.
- `software-sob-medida.html`: fluxos próprios que software pronto não acompanha.
- `sistemas-internos.html`: planilhas, solicitações, aprovações e responsabilidades.
- `aplicativos-empresariais.html`: tarefas de clientes ou equipes no celular.
- `plataformas-digitais.html`: portais e jornadas contínuas entre empresa e cliente.
- `automacao-integracoes.html`: tarefas repetidas e transferência manual entre sistemas.
- `sites-para-empresas.html`: oferta, credibilidade, descoberta e próximo passo.
- `criacao-de-sites-para-empresas.html`: página de conversão para pesquisa local e contato pelo WhatsApp.
- `guia-escolher-software.html`: decisão de escopo, custo e compra versus desenvolvimento.

`projeto.html` é o briefing de conversão e usa `noindex,follow`; ele não entra no sitemap.
`docs/CAMPANHA-GOOGLE-ADS-SITES.md` registra palavras-chave, negativas, textos do anúncio e os critérios para ativação.
`docs/MAPA-SEO-GEO-PALAVRAS-CHAVE.md` separa intenções comerciais, informativas, técnicas e GEO, com páginas de destino e limites das promessas.
`docs/ESTRATEGIA-DE-AQUISICAO.md` organiza prioridades de curto, médio e longo prazo e diferencia hipóteses de dados medidos.

## Abertura e carregamento

Na primeira página aberta em uma aba, a marca é desenhada em SVG por cerca de 1 segundo enquanto os recursos eager, as fontes e as imagens visíveis terminam de carregar. O SVG pré-carregado não recebe uma segunda atribuição de URL, evitando reiniciar o desenho. Se ainda houver espera, a animação troca para um único traço em loop; um limite de 2,6 segundos evita prender o visitante em uma conexão lenta. Nas páginas seguintes da mesma aba, o loop só aparece quando esses recursos ainda estão carregando após 650 ms. Vídeo e imagens lazy fora da tela continuam sob demanda para poupar dados móveis. A abertura é ignorada quando o dispositivo pede movimento reduzido.

## Estrutura visual preservada

- O hero continua com quatro interfaces flutuantes em preto, branco e cinza.
- A seção do aperto de mãos e a cena da pessoa na idade da pedra permanecem.
- A história horizontal tem cinco etapas e começa pela imagem original do dinossauro e do celular. A rolagem move a linha SVG, sem setas.
- A galeria de estudos conceituais continua usando uma curva em C, com várias imagens visíveis.
- A página inicial preserva os quatro mockups. Cada página de solução e o guia têm um SVG próprio, animado e leve, ligado ao problema daquela busca; o vídeo do aperto de mãos e a jornada horizontal continuam compartilhados.
- No celular, o gesto vertical continua a rolagem da página mesmo sobre o desenho; o primeiro quadro e os SVGs foram aproximados do texto e os seis atalhos iniciais ficaram mais compactos.
- A foto do fundador usa o retrato enviado, otimizado em WebP e recortado em círculo, com uma sombra vetorial simples deslocada para a direita; os espaços dessa seção foram reduzidos.
- As novas páginas explicam problemas, quando a solução faz sentido, como o projeto é definido e como começar. Os exemplos visuais são conceitos, não cases implantados.

As ilustrações de intenção ficam em `assets/illustrations/` e são copiadas para `public/assets/illustrations/` durante o build. Elas usam SVG com movimento reduzido quando o visitante prefere menos animação.

## Busca e descoberta

`robots.txt`, `sitemap.xml`, metadados por página, URLs canônicas, dados estruturados e `llms.txt` estão incluídos. As regras permitem crawlers de busca/consulta da OpenAI, Perplexity e Anthropic e bloqueiam GPTBot e ClaudeBot (treinamento). Google-Extended está permitido; o token pode cobrir grounding no Gemini e uso para treinamento. Esses controles não garantem indexação, posição ou tráfego. O mapa de 70 consultas iniciais acompanha o pacote em `docs/MAPA-DE-BUSCAS.md` para orientar validação e medição no Search Console.

O favicon público é `favicon.png`: símbolo sem lettering, centralizado em canvas quadrado. `build.py` o copia para `public/`.

## Limites de dados e claims

- Não há promessa de primeiro lugar, quantidade de visitas, aumento de margem ou resultado comercial garantido.
- Não são inventados clientes ou resultados. As imagens de portfólio continuam identificadas como estudos conceituais.
- O formulário abre uma mensagem de WhatsApp para a pessoa revisar e enviar. Não há CRM ou armazenamento no site.
