import { ArrowUpRight } from 'lucide-react'
import GiroDirector from '../components/GiroDirector'
import Odometer from '../components/Odometer'
import FloatingCta from '../components/FloatingCta'
import MagneticCta from '../components/MagneticCta'
import Objections from '../components/Objections'

const whatsappUrl =
  'https://wa.me/5571999336635?text=Ol%C3%A1%2C%20Girofy!%20Quero%20solicitar%20um%20diagn%C3%B3stico%20gratuito%20do%20meu%20neg%C3%B3cio.'

// SCENE 2 — the faults the scanner reveals
const faults = [
  'Pedidos anotados no papel.',
  'Cliente sem resposta às 22h.',
  'Retrabalho por planilha errada.',
  'Concorrente aparecendo primeiro no Google.',
]

// SCENE 3 — services as machine components (method absorbed as the strip below)
const components = [
  {
    code: 'PEÇA 01',
    name: 'Turbina de aquisição',
    what: 'Site & landing pages de conversão',
    desc: 'Páginas rápidas, feitas para transformar visita em cliente.',
  },
  {
    code: 'PEÇA 02',
    name: 'Núcleo de operação',
    what: 'Sistemas & web apps sob medida',
    desc: 'Software no lugar de planilha, retrabalho e processo manual.',
  },
  {
    code: 'PEÇA 03',
    name: 'Correia de transmissão',
    what: 'Automações & integrações',
    desc: 'Seus sistemas conversando sozinhos — sem erro, sem digitação dupla.',
  },
]

const methodSteps = ['Diagnóstico', 'Arquitetura', 'Construção', 'Aceleração']

// SCENE 4 — engineering scenarios (the 4 strongest)
const scenarios = [
  {
    sector: 'Educação',
    title: 'Plataforma de matrículas para escolas',
    problem: 'Matrícula manual gerava desistência e consumia 20h/semana da secretaria.',
    built: 'Matrícula digital com pagamento e contrato automatizados.',
    result: '100% das matrículas online',
  },
  {
    sector: 'Vendas',
    title: 'Funil de vendas de alta conversão',
    problem: 'CAC alto por site lento e copy genérica.',
    built: 'Landing de altíssima performance, carregando em menos de 1s.',
    result: '+78% de conversão projetada',
  },
  {
    sector: 'Saúde',
    title: 'Portal de agendamento para clínicas',
    problem: 'Secretárias sobrecarregadas e alta taxa de faltas.',
    built: 'Agendamento self-service com lembretes automáticos no WhatsApp.',
    result: '−40% de faltas projetadas',
  },
  {
    sector: 'Logística',
    title: 'Esteira de integração automatizada',
    problem: 'Erro humano na digitação de fretes entre sistemas.',
    built: 'Automação em nuvem ligando o CRM ao sistema de logística.',
    result: 'Expedição de 15min para 2min',
  },
]

export default function Page() {
  return (
    <main>
      <GiroDirector />
      <FloatingCta href={whatsappUrl} />

      <header className="site-header">
        <a href="#inicio" className="wordmark" aria-label="Girofy — início">GIROFY<span>.</span></a>
        <nav aria-label="Navegação principal">
          <a href="#diagnostico">Diagnóstico</a>
          <a href="#engenharia">Engenharia</a>
          <a href="#cenarios">Cenários</a>
          <a href="#fundador">Quem faz</a>
        </nav>
        <a className="header-contact" href={whatsappUrl} target="_blank" rel="noreferrer">
          Diagnóstico gratuito <ArrowUpRight aria-hidden="true" />
        </a>
      </header>

      {/* ————— CENA 1 · O GIRO PERDIDO ————— */}
      <section id="inicio" className="scene scene-hero" data-scene="hero" data-chapter="dark" aria-label="Abertura">
        <div className="scene-view">
          <div className="section-shell hero-stage">
            <p className="eyebrow auto a0">Engenharia digital · Estratégia · Performance</p>
            <h1>
              <span className="auto a1">Seu negócio gira.</span>
              <span className="auto a2 hero-line2">Mas quanto ele perde <em>a cada volta?</em></span>
            </h1>
            <div className="hero-foot auto a3">
              <div className="loss-box">
                <span className="loss-label">Conta rápida: 1h por dia presa em tarefa manual, a R$ 45/hora —</span>
                <span className="loss-value"><Odometer value={16425} prefix="R$ " duration={2200} /></span>
                <span className="loss-label">por ano, vazando de um único processo.</span>
              </div>
              <div className="hero-actions">
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="cta" aria-label="Encontrar meu vazamento pelo WhatsApp">
                  Encontrar meu vazamento <ArrowUpRight aria-hidden="true" />
                </a>
                <span className="scroll-hint">Role para abrir o motor<span className="scroll-line" /></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ————— CENA 2 · DENTRO DO MOTOR ————— */}
      <section id="diagnostico" className="scene scene-diag" data-scene="diag" data-chapter="dark" aria-labelledby="diag-title">
        <div className="scene-view">
          <div className="section-shell diag-stage">
            <p className="eyebrow">Diagnóstico</p>
            <h2 id="diag-title">Todo negócio tem falhas<br />que o dono <em>não vê.</em></h2>
            <ul className="fault-list">
              {faults.map((f) => (
                <li key={f} className="beat fault">
                  <span className="fault-dot" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="diag-note beat">Cada falha é silenciosa. Juntas, são o motivo do faturamento não girar.</p>
          </div>
        </div>
      </section>

      {/* ————— CENA 3 · A ENGENHARIA (método incorporado) ————— */}
      <section id="engenharia" className="scene scene-build" data-scene="build" data-chapter="light" aria-labelledby="build-title">
        <div className="scene-view">
          <span className="kinetic-word" aria-hidden="true">ENGENHARIA</span>
          <div className="section-shell build-stage">
            <div className="build-heading">
              <p className="eyebrow">O que construímos</p>
              <h2 id="build-title">Montamos a peça<br />que falta no seu motor.</h2>
            </div>
            <div className="component-rail">
              {components.map((c) => (
                <article key={c.code} className="component beat">
                  <span className="component-code">{c.code}</span>
                  <h3>{c.name}</h3>
                  <p className="component-what">{c.what}</p>
                  <p className="component-desc">{c.desc}</p>
                </article>
              ))}
            </div>
            <p className="method-strip beat" aria-label="Método de trabalho">
              {methodSteps.map((s, i) => (
                <span key={s}>
                  <strong>{String(i + 1).padStart(2, '0')}</strong> {s}
                  {i < methodSteps.length - 1 && <span className="method-sep" aria-hidden="true"> → </span>}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>

      {/* ————— CENA 4 · CENÁRIOS ————— */}
      <section id="cenarios" className="scene scene-cases" data-scene="cases" data-chapter="light" aria-labelledby="cases-title">
        <div className="scene-view">
          <div className="section-shell cases-stage">
            <div className="cases-heading">
              <p className="eyebrow">Engenharia aplicada</p>
              <h2 id="cases-title">Problemas que<br />sabemos resolver.</h2>
              <p className="cases-note">Cenários demonstrativos: a falha, a peça construída e o retorno projetado.</p>
              <div className="case-dots" role="tablist" aria-label="Navegar entre cenários">
                {scenarios.map((s, i) => (
                  <button key={s.sector} type="button" data-case-dot={i} aria-label={`Cenário ${i + 1}: ${s.sector}`}>
                    <span />
                  </button>
                ))}
              </div>
            </div>
            <div className="case-deck">
              {scenarios.map((s, i) => (
                <article key={s.title} className={`case-card cc${i}`}>
                  <header>
                    <span className="case-index">{String(i + 1).padStart(2, '0')} / 04</span>
                    <span className="case-sector">{s.sector}</span>
                  </header>
                  <h3>{s.title}</h3>
                  <div className="case-body">
                    <div>
                      <span className="case-label">Falha encontrada</span>
                      <p>{s.problem}</p>
                    </div>
                    <div>
                      <span className="case-label">Peça construída</span>
                      <p>{s.built}</p>
                    </div>
                  </div>
                  <p className="case-result">{s.result}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ————— CENA 5 · O GIRO A FAVOR ————— */}
      <section className="scene scene-flow" data-scene="flow" data-chapter="dark" aria-labelledby="flow-title">
        <div className="scene-view">
          <div className="section-shell flow-stage">
            <p className="eyebrow beat">O resultado</p>
            <h2 id="flow-title" className="beat">Agora sim.<br /><em>Girando a seu favor.</em></h2>
            <dl className="flow-metrics beat">
              <div>
                <dt>Conversão média projetada</dt>
                <dd><Odometer value={78} prefix="+" suffix="%" /></dd>
              </div>
              <div>
                <dt>Horas recuperadas por semana</dt>
                <dd><Odometer value={20} suffix="h" /></dd>
              </div>
              <div>
                <dt>Operação vendendo sem parar</dt>
                <dd>24/7</dd>
              </div>
            </dl>
            <div className="proof-line beat">
              <span>Next.js + Vercel — stack usada por Nike, OpenAI e Notion</span>
              <span>Resposta em até 24h</span>
              <span>Acompanhamento com métricas reais</span>
            </div>
            <p className="flow-footnote beat">Projeções com base nos cenários de engenharia acima.</p>
          </div>
        </div>
      </section>

      {/* ————— CENA 6 · QUEM ESTÁ POR TRÁS ————— */}
      <section id="fundador" className="scene scene-founder" data-scene="founder" data-chapter="dark" aria-labelledby="founder-title">
        <div className="scene-view">
          <div className="section-shell founder-stage">
            <p className="eyebrow beat">Quem está por trás da Girofy</p>
            <div className="founder-grid">
              <figure className="founder-photo beat">
                <img src="/girofy/founder.jpg" alt="Fundador da Girofy em seu estúdio" loading="lazy" />
                <figcaption>Fundador · Girofy</figcaption>
              </figure>
              <blockquote className="founder-words">
                <p className="founder-line beat" id="founder-title">A maioria das empresas não precisa de mais tecnologia.</p>
                <p className="founder-line beat"><em>Precisa eliminar processos que ninguém mais questiona.</em></p>
                <p className="founder-small beat">A Girofy nasceu dessa inquietação — entender por que tarefas seguem sendo feitas do mesmo jeito, mesmo custando tempo e dinheiro todos os dias. Não vendemos sites nem sistemas. <strong>Construímos vantagem competitiva.</strong></p>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ————— CENA FINAL · A ASSINATURA ————— */}
      <section id="contato" className="scene scene-logo" data-scene="logo" data-chapter="dark" aria-labelledby="logo-title">
        <div className="scene-view">
          <div className="section-shell logo-stage">
            <h2 id="logo-title" className="beat">Vamos fazer seu<br />negócio <em>girar.</em></h2>
            <ul className="closing-list beat">
              <li>Conversa direta de 30 minutos, sem compromisso</li>
              <li>Você sai com o mapa dos gargalos do seu negócio</li>
              <li>Proposta só se fizer sentido para os dois lados</li>
            </ul>
            <div className="beat">
              <MagneticCta href={whatsappUrl} label="Fazer diagnóstico gratuito" />
              <p className="qualify-note">Trabalhamos com poucas empresas por vez.</p>
            </div>
            <div className="beat">
              <Objections />
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-shell footer-inner">
          <a href="#inicio" className="wordmark" aria-label="Voltar ao início">GIROFY<span>.</span></a>
          <p>Estratégia · Desenvolvimento · Performance</p>
          <div>
            <span>© 2026 Girofy · Salvador, BA</span>
            <a href={whatsappUrl} target="_blank" rel="noreferrer">Falar no WhatsApp</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
