# Girofy Hospedagem — arquitetura Sites nativa

**Status:** desenho atualizado para execução  
**Data:** 8 de outubro de 2026

## Objetivo

Adicionar em `https://girofy.site/hosp` um painel privado para enviar, configurar e publicar projetos estáticos. O usuário envia ZIP, pasta ou arquivos; o sistema guarda os bytes com persistência real e publica em `https://girofy.site/{slug}`. A primeira versão prioriza simplicidade, recursos existentes do Sites e ausência de banco de dados relacional.

## Escopo aprovado pelo pedido

- Painel usado pelo proprietário e fora da navegação pública.
- Identidade Girofy preto/branco/cinza, botões e textos de ação grandes, uso simples no celular.
- Publicação estática com `index.html` como entrada padrão; seleção de outro HTML quando não houver `index.html`.
- Upload de ZIP, pasta e arquivos individuais; versões, substituição, restauração, renomear slug e exclusão.
- Preferência por recursos gratuitos e nenhuma configuração manual de uma conta Cloudflare separada.
- `123.girofy.site` seria preferível, mas `/123` é a alternativa já aceita quando subdomínios wildcard não estiverem disponíveis.

## Arquitetura

Trabalhar no Site existente `girofy-experience`, que está ativo, público e atende `girofy.site`. O projeto atual é estático e publica `dist/`. Para adicionar API e armazenamento persistente, migrar o build para um Worker compatível com Sites, mantendo as páginas, URLs, conteúdo e ativos atuais como arquivos estáticos do Worker.

Usar o binding R2 nativo do Sites para armazenar objetos, manifestos JSON e versões imutáveis; o Sites provisiona os recursos e a integração de publicação. Não criar D1/SQL nem pedir conta/token Cloudflare ao usuário. Usar as rotas autenticadas do próprio Site para operações do painel.

### Endereços e isolamento

- Painel: `https://girofy.site/hosp`.
- Projeto publicado: `https://girofy.site/{slug}` e ativos sob `/{slug}/...`.
- O conector de domínio do Sites associa hostnames individuais; não presumir que ele aceite `*.girofy.site`. Por isso, a V1 usa o caminho após o domínio.
- Servir cada documento de projeto em contexto sandbox, sem `allow-same-origin`, e bloquear escrita na API quando a origem for `null`. Isso evita que JavaScript enviado por um projeto acesse o painel ou sua sessão.
- Como o sandbox não oferece cookies nem `localStorage` ao projeto e alguns sites usam URLs absolutas na raiz, a V1 é para sites estáticos independentes; páginas que dependem de sessão, API/backend próprio, `localStorage` ou paths absolutos em JavaScript podem exigir ajustes. Reescrever referências comuns de HTML/CSS quando forem identificáveis, sem prometer reescrita universal de JavaScript.

### Persistência sem banco relacional

- Guardar arquivos sob `projects/{slug}/versions/{version}/...` no R2.
- Guardar `project.json`, `deployment.json` e o ponteiro `active.json` como objetos JSON no mesmo prefixo.
- Não sobrescrever versões publicadas; só mudar o ponteiro ativo depois de validar todos os arquivos.
- Como a V1 é de uso individual, a interface serializa operações por projeto. Se houver falha, manter a versão ativa anterior.
- Os sites publicados são públicos. Avisar na interface e bloquear nomes óbvios de segredo (`.env*`, chaves privadas e credenciais); não tratar arquivos enviados como armazenamento privado.

## Chave de acesso e proteção

- Manter o Site institucional público.
- Proteger `/hosp` com uma chave compartilhada guardada como segredo `HOSP_ADMIN_PASSWORD` no Site; não pedir conta nem cadastrar usuários.
- Após validar a chave, emitir cookie de sessão HttpOnly com HMAC e expiração de sete dias. Exigir a sessão em toda API que leia ou altere projetos e validar a origem em todas as escritas.
- Não colocar a chave, a assinatura da sessão ou o binding R2 no JavaScript do navegador.
- Validar slugs, caminhos e entradas ZIP; impedir `..`, caminhos absolutos, colisões, ZIP bombs e uploads que excedam os limites definidos para a instância.
- Servir MIME adequado com `X-Content-Type-Options: nosniff`; aplicar cache imutável por versão e evitar cache no painel/API.
- Projetos enviados podem conter JavaScript que roda no navegador; sandbox e validação de origem são requisitos da V1, não opção cosmética.

## Fluxo do produto

1. Proprietário abre `/hosp`, entra com ChatGPT e vê projetos existentes.
2. Cria projeto e escolhe um slug; o painel reserva slugs que conflitem com páginas institucionais ou rotas do produto.
3. Envia uma pasta, ZIP ou arquivos. A interface mostra progresso real e validação.
4. O sistema organiza arquivos no R2, detecta `index.html` e permite escolher outra entrada HTML.
5. O painel publica ao mudar o ponteiro de versão e mostra a URL `girofy.site/{slug}`.
6. Proprietário pode editar nome/slug, enviar nova versão, restaurar ou apagar o projeto.

Se não houver HTML, ainda é possível guardar e servir os arquivos individualmente; a URL de projeto informa que falta uma página de entrada. Um projeto não executa `npm install`, scripts de build, Node.js, Next.js SSR, bancos, containers ou código de servidor.

## Limites da V1

- Arquivos estáticos: HTML, CSS, JavaScript de navegador, imagens, fontes, mídia e outros downloads.
- GitHub, builds NPM, Next.js SSR, APIs do projeto, domínios próprios por usuário, colaboração e analytics ficam para uma fase posterior, sujeita aos limites do runtime.
- Não prometer publicação em até dez segundos para qualquer pacote; mostrar progresso e dar prioridade a uploads pequenos.
- Não anunciar compatibilidade universal: qualquer arquivo pode ser armazenado/servido como asset dentro dos limites do Sites, mas isso não significa executar qualquer linguagem.

## Critérios de aceite

1. O painel em `/hosp` pede a chave compartilhada e só libera dados e mutações com uma sessão válida.
2. ZIP, pasta e arquivos são persistidos em R2 e continuam publicados após fechar ou trocar de navegador.
3. Uma publicação válida abre `girofy.site/{slug}` com `index.html` e seus assets; o sistema mantém a publicação anterior se o novo envio falhar.
4. O projeto publicado não lê DOM, cookies, sessão nem dados administrativos do Site.
5. As páginas institucionais, sitemap, robots, ativos, rotas existentes e URL canônica continuam funcionando após a migração do build.
6. Slugs conflitantes, ZIP inválido, caminho perigoso, excesso de tamanho e falha R2 retornam erros claros sem apagar a versão ativa.
7. O painel é utilizável em celular e desktop, com progresso real e sem execução de scripts NPM enviados.

## Riscos e requisitos externos

O Site atual precisa migrar de saída puramente estática para um Worker; isso deve preservar visual e rotas existentes e ser validado antes de publicar. Se o build Worker ou o binding R2 não puder ser provisionado pelo Sites, parar sem substituir o site oficial por uma demonstração local.

O Sites disponibiliza bindings lógicos R2 e provisiona a integração, sem precisar expor credenciais Cloudflare. Limites e eventual custo dependem da cota do Site; configurar teto por projeto e por envio antes de habilitar upload. Essa arquitetura reduz dependências externas, mas não significa armazenamento ilimitado.

## Abordagens avaliadas

| Opção | Avaliação | Decisão |
| --- | --- | --- |
| Só HTML e armazenamento no navegador | Não persiste para visitantes e não é hospedagem real | Rejeitada |
| Worker/R2 e chave compartilhada no Site atual, projetos por caminho sandbox | Usa o Site e domínio existentes, persiste sem SQL nem conta Cloudflare adicional; há limites de compatibilidade por isolamento de origem | Recomendada para a V1 |
| Roteador Cloudflare externo e subdomínios wildcard | Melhor compatibilidade de origem, mas exigiria infraestrutura/DNS externo que o usuário quer evitar | Fora da V1 |

## Próxima etapa

Migrar o projeto atual para build Worker mantendo os ativos institucionais, adicionar binding R2 e acesso por chave sem contas, implementar o painel e a publicação estática por slug, validar o deploy e publicar no domínio oficial.
