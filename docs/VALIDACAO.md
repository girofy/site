# Validação do pacote Girofy

Data de preparação: 04/10/2026.

## O que foi verificado

## Carregamento da marca

- A animação SVG aparece imediatamente no primeiro acesso da aba, dura cerca de 1 segundo no mínimo e espera o evento `load`, as fontes e a decodificação das imagens visíveis.
- A URL do SVG pré-carregado não é atribuída de novo ao iniciar a animação, evitando que o navegador a reinicie.
- Se os recursos eager demorarem, a marca muda para um único traço SVG em loop; um limite de 2,6 segundos impede o overlay de bloquear a navegação indefinidamente.
- Em navegações seguintes, a abertura completa é pulada; o loop só aparece se os recursos ainda carregarem depois de 650 ms.
- A foto anexada substitui a foto anterior do fundador, otimizada em WebP e exibida em círculo com uma sombra SVG deslocada à direita.
- Vídeo e imagens lazy fora da primeira tela não são baixados antes de liberar o conteúdo. O vídeo permanece sob demanda para reduzir espera e consumo de dados móveis.
- Movimento reduzido desativa a abertura.


- Cada uma das sete páginas de intenção tem um SVG próprio, com desenho vetorial leve e movimento reduzido quando solicitado pelo dispositivo.
- Títulos, descrições, chamadas principais e seção de processo foram adaptados à dor de cada busca; a página inicial explica sites, software, sistemas e automações já no primeiro bloco.
- As prévias Open Graph e Twitter incluem a imagem principal e texto alternativo.
- As novas ilustrações SVG e o sitemap passam pelo parser XML; os arquivos HTML passam pela auditoria de referências relativas, JSON-LD, títulos, descrições, H1 e canonical.
- O pacote ZIP do projeto e o tar da publicação estática foram conferidos: sete SVGs no diretório publicado, com ``.openai/hosting.json`` na raiz do pacote estático.
- `python3 build.py` gera `dist/` sem erro.
- `node --check` passa em `brand-boot.js`, `brand-loading.js`, `app.js`, `pages.js` e `projeto.js`.
- Um teste local com DOM simulado cobre abertura rápida, loop durante carregamento lento com limite de 2,6 s e desativação por movimento reduzido.
- `functions/mcp.js` passa na verificação de sintaxe ES module e em chamadas locais de `initialize`, `tools/list` e das três ferramentas.
- Os arquivos HTML passam pela auditoria local de referências relativas, JSON-LD, títulos, descrições, H1 e canonical.
- Há nove páginas canônicas no sitemap: a página inicial e oito páginas de contexto. `projeto.html` é `noindex,follow` e fica fora do sitemap.
- A página de aquisição para buscas locais usa metadados próprios, canonical, JSON-LD e CTA do WhatsApp; o build estático copia HTML e CSS para `dist/`.
- A validação desta edição confirmou JSON-LD válido, referências relativas existentes, CTA do WhatsApp, página e CSS no build e limites de 30/90 caracteres para títulos e descrições sugeridos.
- O mapa contém 70 consultas-semente em sete grupos de intenção. São hipóteses, não volumes medidos.
- O vídeo do aperto de mãos foi otimizado em H.264 com fast start e pontos de busca frequentes. O código aguarda dados decodificados antes de buscar quadros e reduz mudanças de frame por rolagem.
- A jornada do dinossauro calcula a distância usando a largura do viewport e as cinco etapas; recalcula em mudança de viewport e após carregar fontes.

## Limites da verificação

- O ambiente não permitiu abrir uma prévia local em navegador real; não houve medição de Core Web Vitals ou teste físico em Safari/iOS.
- A versão não foi publicada. O domínio ativo e a conexão MCP do Site permanecem como estavam antes desta preparação; a leitura do repositório do Site falhou por indisponibilidade do proxy de conexão.
- A ferramenta de segurança bloqueou a execução do workflow oficial de publicação porque depende de um script em uma área protegida. Não foi usado um caminho alternativo para publicar.
- Indexação, posição, volume de tráfego, velocidade de resultados e conversões não foram medidos nem são garantidos por sitemap, `robots.txt`, schema ou `llms.txt`.
