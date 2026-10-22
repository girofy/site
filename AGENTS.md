# Contexto operacional do projeto Girofy

Leia este arquivo antes de alterar o projeto. Para visão da experiência e das decisões de design, leia também `docs/MASTER.md`. Para aquisição e medição, leia `docs/ESTRATEGIA-DE-AQUISICAO.md`, `docs/CAMPANHA-GOOGLE-ADS-SITES.md`, `docs/MAPA-DE-BUSCAS.md` e `docs/MAPA-SEO-GEO-PALAVRAS-CHAVE.md`.

## Projeto e objetivo

- Site público: `https://girofy.site/` (domínio canônico sem `www`). O alias `https://www.girofy.site/` também existe.
- Projeto Site: `girofy-experience`; publicação estática a partir de `dist/`.
- A Girofy oferece criação de sites empresariais, software sob medida, sistemas internos, aplicativos empresariais, plataformas digitais e automações/integrações.
- O objetivo comercial é iniciar conversas com donos, sócios, diretores e responsáveis por compras/operação que já identificaram uma necessidade. A empresa atende Petrolina, Juazeiro e Sobradinho e quer validar aquisição nacional quando a entrega remota for adequada.
- O fundador participa do entendimento, escopo, design e desenvolvimento. O formulário abre um rascunho no WhatsApp; não é CRM e não armazena o lead.

## Estrutura técnica

- As páginas comerciais continuam em HTML, CSS e JavaScript na raiz. O painel privado `/hosp` usa React/Vinext em um Worker do Sites; publique pelo Site existente.
- Os HTMLs da raiz são a fonte. `python3 build.py` copia as páginas e ativos institucionais para `public/`; `npm run build` gera o artefato completo em `dist/`. Não edite apenas os arquivos gerados em `public/` ou `dist/`.
- O artefato tem Worker em `dist/server/` e arquivos estáticos em `dist/client/`. `.openai/hosting.json` mantém o `project_id` existente e declara o binding lógico R2 `BUCKET`; não substituir o Site por um novo.
- `/hosp` não usa conta nem banco de dados. Exige a chave compartilhada guardada no segredo de ambiente `HOSP_ADMIN_PASSWORD` e cria uma sessão HMAC HttpOnly por sete dias. A chave nunca entra no repositório.
- Os projetos enviados ficam públicos em `girofy.site/{slug}`, persistidos no R2 do Site sem D1/SQL. Na V1, a hospedagem serve arquivos estáticos: não instala NPM, não executa Next.js SSR, APIs ou processos enviados.
- Limites da aplicação: 50 MB e 500 arquivos por publicação; 10 MB por arquivo; até 12 versões por projeto. A cota real de armazenamento continua sujeita aos limites do Site.
- Páginas HTML e SVG publicadas recebem CSP sandbox sem `allow-same-origin`; o painel recusa escritas com origem diferente. Assim, arquivos enviados não compartilham cookies ou `localStorage` com `girofy.site`. Caminhos absolutos comuns em HTML, `srcset`, CSS e referências estáticas de assets em bundles JavaScript são adaptados ao subcaminho; construções JavaScript dinâmicas arbitrárias não são reescritas.
- `node_modules`, chaves e arquivos `.env` são recusados. Todo site publicado é público; não envie conteúdo privado.
- Existem nove páginas indexáveis e `projeto.html`, que é `noindex,follow`. Não inclua o briefing no sitemap.
- `assets/` contém imagens WebP/SVG, ilustrações e o vídeo local `assets/video/acordo.mp4` (H.264). O vídeo é controlado pela rolagem; testar seek em aparelho móvel antes de mudar codec, FPS, keyframes ou pré-carregamento.
- O projeto inclui `functions/mcp.js` com ferramentas públicas de leitura preparadas; a ativação depende das capacidades definidas para a publicação. Não afirmar que CRM, autenticação, armazenamento de leads ou ferramentas MCP estão ativos sem validação.
- `.openai/hosting.json` é a fonte do `project_id` e dos bindings do Worker. Não substituir o projeto por um Site novo.

## Marca e linguagem

- Nome escrito: Girofy. Domínio: girofy.site. O símbolo é o monograma geométrico preto; `favicon.png` é o símbolo isolado, quadrado, centrado e com fundo branco.
- Visual: preto, branco e cinzas, contraste alto, estética contida. Não introduzir cores decorativas, imagens genéricas de banco ou excesso de elementos.
- Escrever em português brasileiro, com frases concretas e ritmo humano. Evitar clichês, perguntas retóricas em série, adjetivos vazios, linguagem corporativa, travessões em excesso e fórmulas de IA.
- Copy forte depende de uma necessidade real, um mecanismo que a Girofy realmente entrega e provas verdadeiras. Nunca inventar clientes, depoimentos, números, resultados, urgência, escassez, preço ou garantia.
- O usuário pediu que o trabalho atual priorize tráfego e medição. Não reescrever páginas, acrescentar páginas ou mudar a oferta sem solicitação explícita. Mudanças técnicas de favicon/performance devem preservar conteúdo e layout.

## Busca, anúncios e descoberta por IA

- `docs/MAPA-DE-BUSCAS.md` contém hipóteses de consultas, não volumes de busca nem lista para cadastrar em massa. Validar no Planejador de Palavras-chave, Search Console, termos de pesquisa e intenção real antes de financiar uma consulta.
- A recomendação inicial de mídia é testar por 30 dias a criação de sites em Petrolina, Juazeiro e Sobradinho, com uma campanha de Pesquisa e orçamento sob controle. Manter aquisição orgânica nacional; testar mídia nacional depois, em campanha separada e com verba/dados suficientes.
- Com R$ 15/dia, R$ 450 é a conta aproximada de 30 dias. CPC de R$ 15 é apenas o teto matemático que caberia em 30 cliques nesse total, não uma previsão. Menos de 30 cliques torna o teste inconclusivo para taxa de contato; não é motivo automático para escalar verba.
- Para orçamento baixo, priorizar poucos grupos com intenção comercial e correspondência exata/de frase; expandir só com termos e conversões qualificados. Excluir procura de curso, emprego, tutorial e modelos quando forem irrelevantes, sem negativar “preço” ou “orçamento” automaticamente.
- Separar Search (pago), Search Console (orgânico) e conversões. Cliques em WhatsApp são microconversões; não equivalem a mensagens recebidas, reuniões, oportunidades ou vendas.
- A posição paga é definida em leilão e a posição orgânica por sistemas diferentes. Nunca prometer Top 3, volume de tráfego, reuniões diárias, citação por IA ou prazo de indexação.
- Não criar cópias de landing pages para dezenas de cidades. Uma página local só faz sentido quando representa atendimento, fatos e utilidade reais daquela região.
- SEO e respostas de IA devem partir de páginas úteis, rastreáveis, claras e verificáveis, com identidade consistente e referências reais. Não publicar conteúdo em escala sem valor, menções falsas, páginas doorway, dados estruturados falsos ou “hacks” de citação.
- `llms.txt` pode orientar ferramentas que o leiam, mas não é um atalho de posicionamento no Google. `robots.txt` e diretivas de cada crawler devem refletir a decisão do proprietário, sem afirmar que um arquivo força recomendação.

## Restrições e validação

- Não entrar em contas de Ads, Search Console, Hostinger ou navegador sem pedido explícito para isso. Não ativar campanha, alterar orçamento, lances, pagamentos ou conversões sem autorização específica para aquela mudança.
- Ao receber acesso de escrita ao Sites, usar o projeto existente, preservar o público e publicar pelo fluxo Sites. O `commit_sha` precisa corresponder ao código efetivamente enviado ao repositório; nunca salvar/publicar um arquivo local ligado a um commit diferente.
- O painel detecta as pastas `dist/`, `build/` e `out/` dentro de ZIPs e permite selecionar a raiz correta antes da publicação. A hospedagem continua estática: não instala dependências nem executa SSR, APIs ou processos enviados.
- Antes de publicar: executar `npm run install:ci`, `npm run typecheck`, `npm run build` e `node scripts/smoke-local.mjs`; conferir páginas, arquivos referenciados, noindex/sitemap e o artefato do Worker. Preservar o domínio, o público do Site e registrar decisões técnicas em docs sem sobrescrever fatos antigos.
- Para favicon: PNG quadrado maior que 48 px, URL estável e rastreável. O Google decide quando atualizar o ícone nos resultados; cache e atualização não são instantâneos.
- Para performance: preservar dimensões de mídia e espaço de layout. Não carregar toda imagem eager sem medição; priorizar o primeiro viewport e a seção próxima, e evitar porcentagem de carregamento falsa.

## Voz do usuário

O proprietário quer ousadia apoiada em dados, tráfego qualificado e uma estratégia completa de curto, médio e longo prazo. Ele rejeita copy robótica, promessas genéricas, páginas criadas só para aumentar contagem e gasto pago em YouTube/Drive/Display. Antes de alterar copy, explicar a hipótese e manter o texto atual intacto até haver aprovação.
