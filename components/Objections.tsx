/**
 * Objection handling — native <details>, zero JS, styled as technical readouts.
 * Server component on purpose: works without hydration.
 */
const items = [
  {
    q: 'Já tenho um site.',
    a: 'Ótimo — o diagnóstico mostra se ele está convertendo ou só existindo. Se estiver girando redondo, dizemos isso e você não gasta nada.',
  },
  {
    q: 'Quanto custa?',
    a: 'Depende da peça que falta no seu motor. O diagnóstico é gratuito e sai com escopo e faixa de investimento claros — sem surpresa depois.',
  },
  {
    q: 'Em quanto tempo vejo retorno?',
    a: 'Projetamos cada solução com uma métrica-alvo definida antes de codar. Você acompanha o retorno pelo mesmo número que nós.',
  },
]

export default function Objections() {
  return (
    <div className="objections">
      {items.map((it) => (
        <details key={it.q}>
          <summary>{it.q}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  )
}
