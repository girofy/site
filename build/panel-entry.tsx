// Ponto de entrada do painel visual no Worker enxuto (sem Next/vinext).
// O build (scripts/build-standalone.mjs) empacota este arquivo em hosp-assets/panel.js.
import { createRoot } from "react-dom/client";
import HospPage from "../app/hosp/page";

const root = document.getElementById("root");
if (root) createRoot(root).render(<HospPage />);
