import { useState } from "react";

const WHATSAPP_NUMBER = "5574981017188";

export default function BrandConversation() {
  const [name, setName] = useState("");

  const submit = () => {
    const clean = name.trim();
    const message = clean
      ? `Minha empresa é ${clean}. Vi a experiência da Girofy e quero ver o que vocês fariam com a marca.`
      : "Vi a experiência da Girofy e quero ver o que vocês fariam com a minha marca.";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="after" id="contato">
      <div className="after__wrap">
        <div>
          <div className="kicker">UM ÚLTIMO TESTE</div>
          <h2>Coloque sua marca <em>dentro da história.</em></h2>
          <p>Digite o nome. O próximo passo sai do abstrato e vira uma conversa sobre a sua empresa.</p>
        </div>
        <div className="after__form">
          <label>Nome da empresa</label>
          <input
            value={name}
            placeholder="Ex.: Atlas Engenharia"
            autoComplete="organization"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
          <button onClick={submit}>Construir essa conversa ↗</button>
        </div>
      </div>
    </section>
  );
}
