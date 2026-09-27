const WHATSAPP_NUMBER = "5574981017188";

export default function DecisionCTA() {
  const open = () => {
    const message = "Vi a experiência da Girofy e quero ver uma direção para a minha marca.";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="decisionCta" aria-labelledby="decision-title">
      <div className="final__wrap">
        <div className="final__rule" />
        <div className="kicker">06 · INVERSÃO DE RISCO</div>
        <h2 className="headline" id="decision-title">Veja antes.<br /><em>Decida depois.</em></h2>
        <p className="bodycopy">Você não precisa contratar uma promessa. Primeiro veja a direção que a Girofy daria à sua marca.</p>
        <div className="risk"><span>SEM PROMESSA CEGA</span><span>DIREÇÃO VISUAL REAL</span><span>PRÓXIMO PASSO CLARO</span></div>
        <div className="ctaLine"><button className="button" onClick={open}>Quero ver o que fariam com minha marca ↗</button></div>
      </div>
    </section>
  );
}
