# Girofy · direção e estrutura da experiência

## Ideia central

A Girofy constrói sites que deixam claro por que escolher uma empresa e produtos, sistemas e automações que organizam o trabalho depois do primeiro contato. A página fala do que o comprador precisa entender e do que a equipe precisa fazer avançar.

## Linguagem visual

- Branco, preto e cinzas; hierarquia forte, sem laranja, dourado, verde-limão ou efeitos de “IA”.
- Hero com o personagem de televisão e quatro miniinterfaces: website e sistema em um lado; produto digital e automação no outro.
- O vídeo do aperto de mãos fica. O texto trata da relação entre pessoas e do papel da tecnologia na continuidade do trabalho.
- A seção de soluções preserva a estátua usando computador. Website, produto digital, sistema interno e automação aparecem em quatro cartões 2×2; selecionar um mostra o problema e o uso correspondente.
- O dinossauro pixelado e o dinossauro realista atrás do celular são a imagem original enviada pelo usuário e abrem a jornada horizontal.
- O portfólio tem uma curva de imagens em “C” à esquerda, ocupando menos da metade da largura; o texto do projeto fica à direita.

## Sete seções

1. **Posicionamento:** “Sua próxima fase não cabe no básico.” A linha de apoio diz que a Girofy cria sites que explicam por que escolher a empresa e soluções digitais que tiram o trabalho do improviso.
2. **Acordo:** vídeo entre mão humana e robótica. O texto liga a decisão do cliente à experiência e ao trabalho da equipe.
3. **Soluções:** estátua com computador e abas para sites, produtos digitais, sistemas internos e automações. Cada aba parte de uma situação observável, sem prometer resultado garantido.
4. **Decisão do comprador:** cinco painéis horizontais ligados por um único caminho SVG. Começa com a imagem correta do dinossauro e percorre busca, apresentação, escolha, experiência após o sim e operação. A rolagem vertical move o percurso tanto no desktop quanto no celular; nenhuma seta inicia a sequência. Em movimento reduzido, os painéis viram uma sequência vertical estática.
5. **Estudos conceituais:** 14 imagens locais em uma órbita CSS em “C”. Várias ficam visíveis sem interação. Um arrasto gira a órbita, o teclado permite navegar e a entrada faz uma demonstração curta uma só vez. Não carrega Three.js, modelos externos ou WebGL.
6. **Fundador:** conversa direta com César, da definição do problema às decisões de escopo, design e desenvolvimento.
7. **Contato:** a chamada final conduz a `projeto.html`. WhatsApp e e-mail seguem acessíveis; o briefing fica fora do fluxo principal.

## Copy e integridade

Os títulos descrevem situações que o comprador reconhece: pesquisar uma empresa, não entender seu diferencial, cobrar atualizações ou depender de mensagens e memória para manter o trabalho em andamento. A copy é direta, mas não atribui ao site posições garantidas no Google, taxas de conversão, aumento de margem ou resultados comerciais sem evidência.

As 14 interfaces são estudos conceituais, não clientes ou implantações. O formulário prepara uma mensagem local para a pessoa revisar e enviar. A experiência comercial não usa CRM nem armazena contatos; a única autenticação está restrita ao painel de hospedagem.

## Movimento e desempenho

A linguagem é premium e contida: transições curtas para estados, entradas graduais e movimento maior só quando a rolagem conta uma etapa da história. O percurso usa SVG embutido. A galeria usa HTML, imagens WebP locais e CSS 3D; não depende de WebGL. `prefers-reduced-motion` remove pinning e animações contínuas.

## Páginas de intenção e descoberta

A experiência inicial encaminha para sete páginas de solução e decisão, além de uma página curta de aquisição para criação de sites em Petrolina, Juazeiro e Sobradinho. Junto com a home, são nove URLs indexáveis. Cada página descreve uma intenção e um próximo passo; a página de aquisição reduz distrações e leva a conversa para o WhatsApp. O briefing fica separado e fora do índice.

As páginas de solução reutilizam a abertura cinematográfica, o vídeo do aperto de mãos e a jornada horizontal da imagem do dinossauro. A página de aquisição usa uma experiência mais direta, sem preloader nem vídeo antes do CTA, e reutiliza a ilustração de pesquisa já existente. O sistema visual e a ordem das experiências seguem a mesma identidade, com conteúdo ajustado à intenção de cada página.

O mapa `docs/MAPA-DE-BUSCAS.md` agrupa 70 consultas iniciais por intenção; `docs/MAPA-SEO-GEO-PALAVRAS-CHAVE.md` relaciona intenções comerciais, informativas, técnicas e GEO às páginas existentes. São hipóteses, não volume verificado. `robots.txt`, `sitemap.xml`, canonical, JSON-LD e metadados ajudam crawlers a localizar e interpretar o conteúdo, mas não prometem indexação, posição ou visita. A campanha também não garante posição, lead ou venda.

## Movimento e formulário

O vídeo é servido como MP4 H.264 otimizado para carregamento progressivo e busca de quadro. Na seção do dinossauro, a rolagem da página move as cinco etapas ao longo do traçado SVG; a largura do deslocamento é recalculada quando o viewport muda. O formulário de projeto abre um rascunho local de WhatsApp para a pessoa revisar e enviar; não guarda os dados.

A implementação de MCP preparada para o Site tem três ferramentas públicas de leitura. A ativação depende da publicação do Site com a capacidade MCP habilitada; a conexão não está ativa nesta cópia local.


## Controles de rastreamento de IA

`robots.txt` permite OAI-SearchBot e ChatGPT-User; bloqueia GPTBot (treinamento). Permite PerplexityBot/Perplexity-User e Claude-SearchBot/Claude-User; bloqueia ClaudeBot (treinamento). Google-Extended foi permitido para a descoberta/grounding do Gemini, sabendo que o token também permite uso para treinamento conforme os controles do Google.

## Hospedagem Girofy

`/hosp` é uma área de administração para publicar sites estáticos por upload. A entrada usa uma chave compartilhada no segredo `HOSP_ADMIN_PASSWORD`, sem conta e sem banco de dados; o servidor mantém uma sessão HMAC HttpOnly por sete dias e valida a origem em todas as escritas. A chave não aparece no código.

Os arquivos são persistidos no R2 gerenciado pelo Site. O painel aceita ZIP, pasta ou arquivos, mantém versões recentes, permite restaurar e excluir projetos, e publica cada projeto em `girofy.site/{slug}`. O subdomínio `{slug}.girofy.site` não está configurado.

A primeira versão serve arquivos estáticos sem instalar dependências nem executar NPM, Next.js SSR, APIs ou processos enviados. Limites da aplicação: 10 MB por arquivo, 50 MB e 500 arquivos por versão, até 12 versões por projeto. A capacidade final também depende das cotas do Site.

O painel detecta `dist/`, `build/` e `out/` dentro do ZIP e deixa selecionar a pasta publicada. O atalho flutuante da Netlify abre a URL HTTPS editável e mantém a preferência neste navegador.

Páginas HTML e SVG enviadas recebem CSP sandbox sem `allow-same-origin`; portanto, não têm acesso a cookies ou `localStorage` de `girofy.site`. Caminhos absolutos comuns em HTML, `srcset`, CSS e referências estáticas de assets em bundles JavaScript são adaptados ao subcaminho do projeto; construções JavaScript dinâmicas arbitrárias não são reescritas. Todo projeto publicado é público e arquivos comuns de segredo são recusados.
