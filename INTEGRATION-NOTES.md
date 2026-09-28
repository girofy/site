# Notas de integração — experiência Girofy

A implementação cinematográfica substitui a composição de seções da versão integrada anterior. `src/App.tsx` monta agora `ImmersiveExperience`; os componentes anteriores continuam no projeto como histórico reutilizável, mas não fazem parte da experiência publicada.

## Arquitetura ativa

- **Cena:** Three.js com membrana deformável via Simplex Noise 4D, fragmentos instanciados em metal, enquadramento de projetos e trilho espacial do método.
- **Timeline:** um ScrollTrigger fixa a cena e compartilha um único progresso entre câmera, shader e sete estados de narrativa.
- **Interface:** DOM acessível para texto, navegação e CTA; o WebGL sustenta a metáfora e não carrega a copy crítica.
- **Conversão:** leitura local de captura, navegação de portfólio, placa personalizada e entrada no WhatsApp.
- **Som:** camada de 44 Hz, textura de transição e impactos curtos, acionada apenas quando a pessoa habilita o áudio.

## Decisões de resiliência

- O pacote de Three.js é carregado sob demanda, sem bloquear a montagem do conteúdo.
- O pinning funciona independentemente do contexto WebGL.
- A falha de WebGL preserva os capítulos e os CTAs.
- O modo `prefers-reduced-motion` não baixa o motor 3D e apresenta as cenas em sequência vertical.
- Os arquivos do scanner permanecem locais; somente a cor média é extraída para a demonstração visual.

## Comandos

```bash
npm test
npm run build
```

O ruído 4D é derivado de Ashima Arts / Stefan Gustavson; consulte `NOISE-LICENSE.txt`.
