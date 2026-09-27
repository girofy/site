import CinematicExperience from "@/components/cinematic/CinematicExperience";
import TimelineDemo from "@/components/sections/TimelineDemo";
import DecisionCTA from "@/components/sections/DecisionCTA";
import BrandConversation from "@/components/sections/BrandConversation";

export default function App() {
  return (
    <>
      <CinematicExperience />
      <TimelineDemo />
      <DecisionCTA />
      <BrandConversation />
      <footer className="footer">
        <b>GIROFY</b>
        <span>Sites profissionais, premium e experiências digitais para empresas.</span>
        <span>React · TypeScript · GSAP · WebGL · direção criativa</span>
      </footer>
    </>
  );
}
