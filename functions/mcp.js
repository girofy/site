const services = [
  {
    name: 'Software sob medida',
    url: 'https://girofy.site/software-sob-medida.html',
    summary: 'Para fluxos próprios que ferramentas prontas não acompanham; avalie regras, exceções e integrações antes de desenvolver.'
  },
  {
    name: 'Sistemas internos',
    url: 'https://girofy.site/sistemas-internos.html',
    summary: 'Para solicitações, aprovações e responsabilidades espalhadas entre planilhas, mensagens e pessoas.'
  },
  {
    name: 'Aplicativos empresariais',
    url: 'https://girofy.site/aplicativos-empresariais.html',
    summary: 'Para clientes ou equipes que precisam concluir tarefas recorrentes pelo celular.'
  },
  {
    name: 'Plataformas digitais',
    url: 'https://girofy.site/plataformas-digitais.html',
    summary: 'Para jornadas contínuas que conectam clientes, equipes, documentos e andamento.'
  },
  {
    name: 'Automação e integrações',
    url: 'https://girofy.site/automacao-integracoes.html',
    summary: 'Para reduzir transferência manual, encaminhar trabalho repetível e deixar exceções visíveis.'
  },
  {
    name: 'Sites para empresas',
    url: 'https://girofy.site/sites-para-empresas.html',
    summary: 'Para explicar oferta, diferenciais e próximo passo a quem pesquisa antes de entrar em contato.'
  },
  {
    name: 'Guia de projeto',
    url: 'https://girofy.site/guia-escolher-software.html',
    summary: 'Para avaliar custo, escopo, alternativas prontas, integrações e operação antes de contratar.'
  }
];

const tools = [
  {
    name: 'girofy_listar_solucoes',
    description: 'Lista as soluções da Girofy com o problema que cada uma atende e a página pública para saber mais.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'girofy_indicar_pagina',
    description: 'Relaciona uma situação empresarial à página da Girofy mais útil para avaliá-la. Não é diagnóstico técnico nem orçamento.',
    inputSchema: {
      type: 'object',
      properties: { situacao: { type: 'string', description: 'Descreva brevemente o trabalho, a dúvida ou o processo que está travando.', minLength: 3, maxLength: 3000 } },
      required: ['situacao'], additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'girofy_preparar_briefing',
    description: 'Transforma uma situação em perguntas úteis para iniciar um briefing. Não salva nem envia as informações.',
    inputSchema: {
      type: 'object',
      properties: {
        situacao: { type: 'string', description: 'O que acontece hoje, em até 3000 caracteres.', minLength: 3, maxLength: 3000 },
        objetivo: { type: 'string', description: 'O que deveria ser diferente depois do projeto.', maxLength: 1500 }
      },
      required: ['situacao'], additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }
];

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

const protocolError = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const textResult = (text, isError = false) => ({ content: [{ type: 'text', text }], isError });

function routeFor(situation) {
  const value = situation.toLocaleLowerCase('pt-BR');
  const choices = [
    { pattern: /site|google|busca|encontr|presen[cç]a online|p[aá]gina|credibilidade|or[cç]amento|leads?/, slug: 'sites-para-empresas', name: 'Sites para empresas' },
    { pattern: /planilha|aprova[cç][aã]o|pedido|fila|status|equipe|processo interno|opera[cç][aã]o/, slug: 'sistemas-internos', name: 'Sistemas internos' },
    { pattern: /automat|copiar|integra[cç][aã]o|integrar|repet|transferir dado/, slug: 'automacao-integracoes', name: 'Automação e integrações' },
    { pattern: /aplicativo|\bapp\b|celular|android|iphone|campo/, slug: 'aplicativos-empresariais', name: 'Aplicativos empresariais' },
    { pattern: /portal|plataforma|cliente acompanha|documentos|conta de cliente|marketplace/, slug: 'plataformas-digitais', name: 'Plataformas digitais' },
    { pattern: /custo|pre[cç]o|quanto|contratar|escopo|prazo|proposta/, slug: 'guia-escolher-software', name: 'Guia de projeto' },
    { pattern: /software|sistema|sob medida|personaliz|ferramenta pronta|erp/, slug: 'software-sob-medida', name: 'Software sob medida' }
  ];
  const match = choices.find(choice => choice.pattern.test(value)) || { slug: 'guia-escolher-software', name: 'Guia de projeto' };
  return { ...match, url: `https://girofy.site/${match.slug}.html` };
}

function brief(situation, goal = '') {
  return [
    'Rascunho de briefing — Girofy',
    '',
    `Situação atual: ${situation.trim()}`,
    goal.trim() ? `Resultado desejado: ${goal.trim()}` : null,
    '',
    'Para avançar, reúna:',
    '• um exemplo recente do começo ao fim;',
    '• quem participa e quem decide;',
    '• onde há espera, repetição, erro ou dúvida do comprador;',
    '• quais ferramentas e dados já fazem parte do processo;',
    '• o que deve ficar diferente e como perceber essa diferença.',
    '',
    'Este rascunho não foi salvo nem enviado. Para falar com a Girofy: https://girofy.site/projeto.html'
  ].filter(Boolean).join('\n');
}

async function handle(message) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return protocolError(message?.id, -32600, 'Invalid Request');
  }
  const id = message.id;
  if (message.method === 'notifications/initialized' || message.method === 'notifications/cancelled') return null;
  if (message.method === 'initialize') {
    return { jsonrpc: '2.0', id, result: {
      protocolVersion: typeof message.params?.protocolVersion === 'string' ? message.params.protocolVersion : '2025-03-26',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'girofy-public-site', version: '1.0.0' },
      instructions: 'Ferramentas públicas e somente de leitura. As informações do briefing não são armazenadas nem enviadas.'
    }};
  }
  if (message.method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (message.method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools } };
  if (message.method === 'tools/call') {
    const name = message.params?.name;
    const args = message.params?.arguments || {};
    if (name === 'girofy_listar_solucoes') {
      return { jsonrpc: '2.0', id, result: textResult(services.map(s => `${s.name}\n${s.summary}\n${s.url}`).join('\n\n')) };
    }
    if (name === 'girofy_indicar_pagina') {
      if (typeof args.situacao !== 'string' || args.situacao.trim().length < 3 || args.situacao.length > 3000) {
        return { jsonrpc: '2.0', id, result: textResult('Informe uma situação com 3 a 3000 caracteres.', true) };
      }
      const route = routeFor(args.situacao);
      return { jsonrpc: '2.0', id, result: textResult(`Ponto de partida possível: ${route.name}.\n${services.find(s => s.url === route.url)?.summary || ''}\nLeia: ${route.url}\nA indicação é inicial; o escopo depende do processo e das restrições reais.`) };
    }
    if (name === 'girofy_preparar_briefing') {
      if (typeof args.situacao !== 'string' || args.situacao.trim().length < 3 || args.situacao.length > 3000 || (args.objetivo !== undefined && (typeof args.objetivo !== 'string' || args.objetivo.length > 1500))) {
        return { jsonrpc: '2.0', id, result: textResult('Descreva a situação em até 3000 caracteres e, se quiser, o objetivo em até 1500.', true) };
      }
      return { jsonrpc: '2.0', id, result: textResult(brief(args.situacao, args.objetivo || '')) };
    }
    return { jsonrpc: '2.0', id, result: textResult(`Ferramenta não encontrada: ${String(name || '')}`, true) };
  }
  if (id === undefined) return null;
  return protocolError(id, -32601, 'Method not found');
}

export async function onRequestPost({ request }) {
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 32000) return json({ error: 'Request too large' }, 413);
  let message;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 32000) return json({ error: 'Request too large' }, 413);
    message = JSON.parse(body);
  }
  catch { return json(protocolError(null, -32700, 'Parse error'), 400); }
  if (Array.isArray(message)) {
    if (!message.length || message.length > 10) return json(protocolError(null, -32600, 'Invalid Request'), 400);
    const results = (await Promise.all(message.map(handle))).filter(Boolean);
    return results.length ? json(results) : new Response(null, { status: 202 });
  }
  const result = await handle(message);
  return result ? json(result) : new Response(null, { status: 202 });
}
