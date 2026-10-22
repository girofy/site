# Estratégia de descoberta, anúncios e conversão da Girofy

## Decisão central

A meta é gerar conversas comerciais qualificadas, não acumular palavras-chave, impressões ou cliques vazios. O teste pago inicial recomendado é de 30 dias, focado em criação de sites para empresas em Petrolina, Juazeiro e Sobradinho, pois esse é o serviço com página local e campanha já delineadas no pacote. O orgânico continua nacional pelas páginas de serviço existentes. Depois do diagnóstico local, uma campanha nacional pode ser testada com orçamento e medição próprios. Se a prioridade imediata for nacional, primeiro confirme no Planejador que há CPC e procura compatíveis com R$ 15/dia; não misture vários serviços e dezenas de regiões num único teste.

O trabalho se organiza em quatro sistemas diferentes: elegibilidade e posição paga, presença orgânica, entendimento da entidade Girofy por buscadores/respostas de IA e conversão depois do clique. Eles se alimentam com informação consistente, mas não são o mesmo algoritmo.

Uma posição alta não é sorte pura. É resultado de sinais e concorrência, mas não pode ser garantida. No Google Ads, cada busca elegível entra em um leilão. Lance, qualidade esperada do anúncio e da página, contexto da pesquisa, limites de qualidade e concorrência afetam o Ad Rank. A posição pode variar de uma consulta para outra. O Ads não compra uma posição orgânica nem garante primeira página. A otimização precisa medir tanto visibilidade quanto custo e qualidade dos contatos. Fontes oficiais: [Ad Rank e posição](https://support.google.com/google-ads/answer/1722122) e [Search Essentials](https://developers.google.com/search/docs/essentials).

## O que sabemos e o que ainda precisa ser medido

- O pacote tem nove páginas indexáveis, uma página de briefing `noindex`, `robots.txt`, `sitemap.xml`, metadados, canonical, dados estruturados e o mapa inicial de consultas.
- A campanha existente está descrita como Pesquisa e com foco local, mas não foi auditada dentro da conta nesta etapa. Por isso, não há diagnóstico factual do motivo pelo qual o gasto não ocorre.
- O pacote recebido contém a página local `criacao-de-sites-para-empresas.html`, mas não foi possível confirmar se essa versão corresponde ao deploy atual. Antes de pagar, verificar no domínio ativo a página final, o número, o destino do WhatsApp e o funcionamento em celular.
- O site não contém uma tag de Google Ads/Tag Manager nos HTMLs examinados. É preciso confirmar se a medição está sendo carregada por configuração externa antes de usar lances por conversão.
- Os cerca de 70 termos em `docs/MAPA-DE-BUSCAS.md` são hipóteses de pesquisa. Não são 70 buscas com volume comprovado nem uma recomendação para cadastrar tudo.
- Uma impressão no Search Console prova que uma URL apareceu em uma consulta registrada, mas não informa sozinha quem pesquisou, se foi o próprio dono, se a busca tinha intenção de compra ou se houve visita. Pesquisar Girofy manualmente não é estratégia de posicionamento e pode confundir a leitura dos resultados.

## Curto prazo: remover bloqueios e medir antes de ampliar

### 1. Diagnosticar por que a campanha não consome

Na conta do Google Ads, revisar nesta ordem:

1. **Conta e cobrança:** status de verificação, pagamento, suspensão ou alerta da conta.
2. **Campanha:** tipo realmente “Pesquisa”, status e datas de início/fim, orçamento diário médio, programação e elegibilidade.
3. **Rede:** manter somente a Pesquisa Google. Desativar Display e parceiros de pesquisa no primeiro teste. Não usar Performance Max, Demand Gen, vídeo ou campanhas de Display para cumprir a preferência por resultados de pesquisa.
4. **Local e idioma:** conferir os locais incluídos e a opção de presença. Se atender nacionalmente de forma remota, Brasil pode ser incluído; se limitar o teste ao Vale, usar “pessoas que estão ou estão regularmente nos locais” e conferir exclusões. A opção padrão também pode alcançar pessoas que só demonstraram interesse na área.
5. **Anúncios e ativos:** revisar reprovações, política, URL final, ativo ausente e se a página abre em celular.
6. **Palavras-chave:** verificar se estão habilitadas, se têm “baixo volume de pesquisa”, se usam negativas conflitantes ou restrições excessivas. Conferir correspondência real no relatório de termos de pesquisa.
7. **Lances:** observar estratégia, CPC máximo/teto, parcela de impressões perdida por classificação e elegibilidade. Um teto muito baixo pode impedir participação em leilões; removê-lo sem um limite de gasto definido pode encarecer o tráfego.
8. Usar **Diagnóstico de campanha** e **Prévia e diagnóstico de anúncios** para saber a causa por consulta e local, em vez de pesquisar repetidamente no Google. O Ads lista cobrança, status, baixa procura, lance, local, programação e classificação entre causas possíveis de entrega baixa.

O relatório de parcela de impressões separa oportunidades perdidas por orçamento e por classificação. Se a campanha não tem impressões, corrigir elegibilidade, volume ou lance. Se tem impressões mas poucos cliques, revisar a consulta e a mensagem. Se tem clique mas não chegam contatos, revisar correspondência entre anúncio e página, velocidade, CTA e fricção. Fonte: [problemas de campanhas de Pesquisa com pouco tráfego](https://support.google.com/google-ads/answer/9208915) e [diagnóstico de anúncios](https://support.google.com/google-ads/answer/148778).

### 2. Configurar conversões sem inflar o resultado

- Medir abertura do WhatsApp como **microconversão**. O clique não comprova mensagem enviada.
- Registrar em uma planilha cada mensagem real, se pertence ao público, se virou reunião/oportunidade e se virou venda. Guardar origem, campanha/termo quando disponível, cidade, serviço e motivo de perda.
- Quando a operação permitir, importar para Ads as conversões offline de lead qualificado ou venda. Só então testar “Maximizar conversões” com um evento primário real; não alimentar o algoritmo apenas com abertura de WhatsApp e esperar que ele distinga compradores.
- Usar cliques no WhatsApp como diagnóstico/ação secundária até confirmar o percurso completo. Verificar a tag em modo de teste antes de ativar qualquer lance inteligente.
- Não configurar Pixel/Google tag nesta cópia sem o ID da conta e a autorização operacional necessária.

### 3. Fazer a conta de R$ 15 por dia

R$ 15/dia representa cerca de R$ 450 em 30 dias como orçamento médio. Para a maioria das campanhas, o gasto de um dia pode chegar a duas vezes o orçamento diário médio, respeitando o limite mensal de 30,4 vezes a média; portanto, não é um teto rígido de cada dia. Consultar a tela de cobrança e os limites da conta antes de publicar.

Clicks possíveis são aproximadamente `orçamento ÷ CPC médio`: com CPC hipotético de R$ 1, cerca de 15 cliques/dia; a R$ 5, cerca de 3; a R$ 15, cerca de 1. Esses valores são exemplos matemáticos, não previsão de CPC da Girofy. Sem volume e CPC atuais do Planejador, não é honesto prometer vários cliques, leads ou reuniões por dia. Mesmo 15 cliques não significam 15 contatos; a taxa de conversão e a qualificação precisam ser observadas.

Para início sem dados, “Maximizar cliques” pode ser um teste de tráfego com orçamento e limite máximo de CPC. O Planejador precisa confirmar que os termos comerciais e a geografia têm CPC estimado compatível antes da ativação. Para um teto de R$ 450 e uma meta operacional de ao menos 30 cliques, o limite matemático seria CPC de até R$ 15 (`R$ 450 ÷ 30`). R$ 15 não é previsão nem recomendação de CPC de mercado; é apenas o maior custo médio que caberia nesse cenário. Definir o teto abaixo disso reduz custo por clique, mas pode reduzir muito a entrega; acima disso aceita-se a possibilidade de menos de 30 cliques. Não aumente o teto sem conhecer a economia de venda. “Maximizar cliques” não otimiza qualidade do lead. Fontes: [Maximizar cliques](https://support.google.com/google-ads/answer/6268626) e [limites de gasto](https://support.google.com/google-ads/answer/1704424).

Regra operacional, não corte estatístico universal: se o teste terminar com menos de 30 cliques, classifique como amostra insuficiente para julgar a taxa de contato, mesmo que não haja lead. Não conclua que o canal falhou nem aumente o orçamento automaticamente. Primeiro reveja elegibilidade, CPC, termos, parcela de impressões e medição; só repita se os termos forem comerciais e a Girofy aceitar investir mais no aprendizado. Com 30 cliques ou mais, a taxa ainda é direcional; escale somente se conversas qualificadas, reuniões e CAC sustentarem.

## Campanha paga inicial: focar intenção, não quantidade

### Estrutura de teste

Começar com **uma campanha de Pesquisa Google**, um serviço prioritário e um destino compatível. Pelo material atual, a hipótese inicial é criação de sites empresariais, levando a `criacao-de-sites-para-empresas.html`; confirmar no Planejador e na conversa real de venda antes de considerar validada. O serviço a escolher deve ser o mais fácil de explicar, entregar e provar hoje.

- Para o teste inicial, usar uma campanha com Petrolina, Juazeiro e Sobradinho e segmentação por presença física ou regular nessas áreas. A página local existe para esse serviço e reduz o escopo do aprendizado. Depois, fazer um teste nacional separado se a Girofy atende projetos remotos em todo o Brasil; não é necessário criar uma campanha por cidade.
- Usar correspondência exata e de frase em poucas famílias de intenção: contratar empresa de site, criação de site empresarial, orçamento/projeto de site e localização atendida. Só acrescentar serviço de software, sistema ou automação quando o grupo tiver página e proposta compatíveis e houver orçamento suficiente para observar cada grupo.
- A lista no Planejador deve responder: estimativa de buscas, CPC de topo, concorrência, previsão de cliques com o orçamento real e volume por local. Filtrar consultas cuja intenção seja contratação, não só tema semelhante.
- Adicionar negativas iniciais de curso, tutorial, emprego, salário, vaga, template e gratuito se os termos aparecerem. Rever antes de negativar “preço”, “orçamento”, “empresa”, “sistema” ou palavras correlatas, porque podem sinalizar compra.
- Usar anúncio responsivo com ativos verdadeiros e página com a mesma intenção. O anúncio deve pré-qualificar: empresa/projeto real, tipo de solução, região/atendimento e próximo passo. Não usar “resultado garantido”, “topo do Google” ou “reunião todo dia”.
- Não segmentar por “quem está com cartão na mão” via perfil demográfico. Em Search, o filtro principal é a intenção escrita na consulta, a geografia adequada, o anúncio que qualifica e a página correspondente. Idade/cargo inferidos podem excluir bons decisores e não substituem intenção.

### O que otimizar para subir

- **Ad Rank/posição:** acompanhar parcela de impressões no topo e no topo absoluto, parcela perdida por classificação e por orçamento, CPC e termos que ativaram anúncios. Uma meta de parcela de impressões no topo pode ser testada com teto de CPC e teto diário; perseguir posição 1 sem limite pode comprar cliques caros. “Topo absoluto” é apenas a primeira posição de anúncio, não Top 1 orgânico.
- **Qualidade do anúncio e da página:** texto aderente à consulta, especificidade verdadeira, página rápida/estável e fácil de usar no celular, CTA claro e pouco atrito. Corrigir a consulta errada antes de “aumentar lance”.
- **Cliques qualificados:** comparar termo real, taxa de clique, chegada na página, clique no WhatsApp, conversa recebida, qualificação e venda. CTR não é sucesso sozinho.
- **Orçamento:** quando perder parcela por orçamento e ainda existir custo por oportunidade aceitável, elevar em etapas. Quando perder por classificação, investigar qualidade e limite de CPC. Se os termos forem ruins, restringir ou negativar antes de pagar para aparecer mais.

### Expansão nacional paga

Manter no primeiro teste uma campanha local por 30 dias. O conteúdo orgânico nacional continua ativo nesse período. Ao final, não usar somente o número de cliques como decisão: comparar termos, contatos reais, reuniões, propostas, capacidade de entrega e CAC. Se o Vale não gerar amostra suficiente, o resultado é inconclusivo; não é uma prova de que o Brasil inteiro terá CPC melhor. Abrir um teste nacional separado quando a operação realmente atender remotamente e houver verba suficiente para um ciclo identificável. Relatar os resultados por região e serviço.

### Geografia por etapas

Não abrir 20–30 campanhas por cidade nem criar uma campanha para cada nome de cidade. No teste inicial, manter Petrolina, Juazeiro e Sobradinho na mesma campanha com a opção de presença física ou regular. Quando chegar a hora de medir Brasil, abrir uma campanha nacional separada e comparar consultas, conversas e CAC por região. Só separar uma cidade quando houver demanda observada, uma oferta local genuína e verba para medir aquele grupo.

### Busca pelo nome Girofy

Monitorar separadamente as consultas de marca no Search Console e no relatório de termos do Ads: `Girofy`, variações de grafia, `Girofy site` e combinações com serviços. A busca pública encontrou [girofyapp.com.br](https://girofyapp.com.br/), que se apresenta como ERP para pequenos negócios; isso confirma uma entidade distinta com nome parecido, sem demonstrar relação nem intenção de cópia. Reforçar Girofy, `girofy.site`, descrição dos serviços e logo nas fontes oficiais. Um anúncio de proteção pela marca própria só entra se o diagnóstico mostrar confusão ou perda de procura qualificada e se o custo não tirar verba de consultas de compra. Não começar pagando por todas as buscas de marca.

## Search Console e SEO orgânico

### Checklist técnico inicial

1. Confirmar propriedade de domínio `girofy.site` verificada por DNS na Hostinger e acesso ao domínio canônico sem `www`.
2. Enviar `https://girofy.site/sitemap.xml`; revisar `https://girofy.site/robots.txt` e confirmar que as nove páginas públicas podem ser rastreadas. Manter o briefing fora do sitemap e com `noindex`.
3. Inspecionar cada URL: rastreio, índice, canonical selecionada, resposta HTTP, renderização, conteúdo principal e versão móvel. Corrigir erro real antes de solicitar indexação.
4. No relatório de desempenho, registrar consulta, página, país, dispositivo, impressões, cliques, CTR e posição média. Separar Girofy/Girofy app de consultas sem marca e separar local de nacional. Quando disponível na propriedade, consultar também o relatório de desempenho das funcionalidades de IA generativa.
5. Medir uma janela base de 28 dias e comparar com 28 dias anteriores quando houver volume; guardar exportações semanais. O primeiro registro de impressão é sinal inicial, não prova de tração nem de compra.
6. Testar favicon no endereço `https://girofy.site/favicon.png`: arquivo quadrado 512×512, acessível e sem bloqueio. Seguir os [requisitos de favicon da Pesquisa Google](https://developers.google.com/search/docs/appearance/favicon-in-search); o Google recrawla e pode manter cache por algum tempo, sem controle sobre o dia em que o novo ícone aparece.

### Cobertura útil, sem páginas doorway

- Manter uma página por serviço/intenção que a Girofy realmente atende. A página explica decisão, escopo e próximo passo, com evidência real e ligações internas úteis.
- Criar página regional só se a Girofy realmente atua ali e puder incluir informação local própria: processo, disponibilidade, exemplos reais, áreas próximas, perguntas e condições. Não trocar apenas o nome de uma cidade em páginas copiadas; o Google identifica páginas de entrada que existem principalmente para ranquear em consultas regionais como possível abuso de doorway pages ([políticas de spam](https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse)).
- Para alcance nacional, melhorar a clareza das páginas de serviços já existentes, criar material de decisão útil (custos, critérios, perguntas de contratação, quando comprar versus desenvolver) e conectar isso às páginas comerciais. Não criar artigos para empilhar palavras-chave.
- Buscar citações e links editoriais verdadeiros por trabalho publicado, participação, parceiros, fornecedores, comunidades empresariais, diretórios confiáveis e projetos com permissão. Não comprar esquemas, fabricar avaliações, gerar menções artificiais ou pedir links irrelevantes.
- Repetir buscas manuais pelo nome da empresa não acelera indexação ou ranking. Usar inspeção de URL, ferramentas de resultados e Search Console para medir sem criar ruído pessoal.

## Entendimento da marca por Google e assistentes de IA

O objetivo possível é tornar a empresa fácil de identificar e verificar, não obrigar uma IA a recomendá-la. Google diz que os princípios usuais de rastreio, indexação, conteúdo útil e experiência continuam valendo nas [experiências de IA](https://developers.google.com/search/docs/appearance/ai-features); não há uma marcação especial que garanta citação. Dados estruturados devem representar o conteúdo visível e não garantem resultado especial. A Pesquisa Google declara que não usa `llms.txt` e que isso não aumenta nem reduz visibilidade/ranking; outros sistemas podem optar por ler o arquivo.

- Usar sempre o nome Girofy, domínio canônico, descrição verdadeira dos serviços e contato consistente nos canais públicos legítimos.
- Fortalecer a página institucional e páginas de serviço com explicações verificáveis sobre o que a Girofy faz, para quem, como escopa um projeto e quais limites existem.
- Usar `Organization`/`WebSite` e breadcrumbs somente quando corretos. O logo e os dados devem apontar para recursos acessíveis e coerentes com a marca.
- Preencher perfil de empresa apenas se houver elegibilidade para perfil local conforme regras da plataforma; não inventar endereço comercial nem área de serviço.
- Para a ambiguidade de nome “Girofy app”, a busca pública encontrou `girofyapp.com.br`, que se apresenta como ERP para pequenos negócios. Isso identifica uma entidade distinta de nome parecido, mas não demonstra relação nem intenção de cópia. Diferenciar a Girofy por descritores consistentes, `girofy.site`, serviços e fontes próprias/relevantes. Não transformar essa distinção em ataque ou comparação promocional.
- Verificar separadamente as diretivas para Google Search, Google-Extended e os crawlers de outras respostas de IA. Google-Extended controla se o conteúdo pode ser usado para grounding e treinamento em Gemini/Vertex AI; permitir o token não afeta a inclusão ou classificação na Pesquisa Google e não garante recomendação. O `robots.txt` atual permite Google-Extended. Como o token inclui os dois usos, mantenha essa escolha explícita e não altere a diretiva sem decisão do proprietário.
- Permitir `OAI-SearchBot` se a Girofy quer ser elegível para resumo/citação no ChatGPT Search. A inclusão e a posição não são garantidas. O ChatGPT adiciona `utm_source=chatgpt.com` aos links de referência, o que permite medir visitas desse canal na analítica.
- Monitorar consultas de marca, tráfego de referência e citações observáveis por fonte, salvando data/consulta e sem tratar uma resposta isolada como ranking estável.

## Performance e experiência que podem afetar a conversão

O ativo de vídeo atual é MP4 H.264, cerca de 1,58 MB na cópia examinada. WebP é imagem, não uma troca direta de vídeo com seek pela rolagem. Antes de converter, reproduzir o travamento em aparelhos móveis, medir LCP/INP/CLS e verificar carregamento da fonte, keyframes, intervalo de seeking e eventos `seeked`. Um poster leve, dimensões reservadas e início do carregamento perto da seção podem manter resposta e economizar dados. Só adicionar WebM se a comparação em dispositivos reais mostrar ganho sem quebrar o seek.

As imagens fora do primeiro viewport podem continuar lazy; remover lazy de todas pode aumentar rede e piorar o carregamento inicial. Reservar width/height, carregar cedo o hero e as imagens realmente visíveis e testar rolagem até o fim em rede móvel. Um loader só deve indicar progresso real; não exibir 100% enquanto mídia importante ainda não está pronta.

## Ritmo de trabalho e decisões

| Horizonte | Fazer | Sinal de avanço |
|---|---|---|
| 0–2 semanas | corrigir elegibilidade, validar propriedade/sitemap, configurar conversão-proxy, consultar Planejador e auditar anúncios | primeiras impressões elegíveis e dados sem vazamentos óbvios |
| 2–6 semanas | revisar termos semanalmente, classificar WhatsApp recebido, medir páginas/consultas e rodar um teste pago simples | consultas comerciais e conversas que podem ser atribuídas |
| 6–12 semanas | manter o que traz lead qualificado, ajustar região/serviço, importar conversões offline se possível, melhorar páginas com dados e provas reais | custo por oportunidade e taxa de avanço conhecidos |
| longo prazo | publicar recursos úteis, ganhar citações reais, fortalecer marca e referências, ampliar mídia somente quando economia de aquisição fecha | crescimento estável de consultas sem marca, oportunidades e referências |

Não usar “Top 3”, sessões, cliques, posição média ou resposta de IA como meta isolada. A medida principal é quantidade e custo de conversas qualificadas, com dados suficientes para saber o que originou o resultado.

## Princípios de copy aplicados sem reescrita

O estudo de *Breakthrough Advertising* é aplicado como estrutura de raciocínio: começar pelo desejo/problema que já existe, verificar o nível de consciência de quem pesquisa, considerar quanto o mercado já ouviu de promessas semelhantes e ligar uma performance verdadeira da Girofy a um mecanismo e a evidência. Para Search, a própria consulta já dá um sinal de consciência: alguém que busca “orçamento para site empresarial” pede uma decisão mais direta do que alguém que pesquisa “como organizar pedidos da empresa”. Uma campanha e uma página devem corresponder a essa intenção.

O anúncio não precisa prometer o universo; precisa fazer a pessoa certa reconhecer que a Girofy trabalha naquele tipo de problema. Como ainda faltam casos, números e resultados comprovados no material, a persuasão deve vir de clareza de escopo, demonstração do processo, conversa com o fundador e exemplos identificados honestamente como conceituais. A página atual permanece intacta nesta etapa.
