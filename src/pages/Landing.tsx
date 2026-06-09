import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../sections/HeroSection';
import StatsBar from '../sections/StatsBar';
import ProblemaSolucion from '../sections/ProblemaSolucion';
import FeaturesSection from '../sections/FeaturesSection';
import ComoFunciona from '../sections/ComoFunciona';
import ClientesSection from '../sections/ClientesSection';
import PricingSection from '../sections/PricingSection';
import FaqSection from '../sections/FaqSection';
import CtaFinalSection from '../sections/CtaFinalSection';
import LandingFooter from '../sections/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen bg-stockup-bg text-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <StatsBar />
        <ProblemaSolucion />
        <FeaturesSection />
        <ComoFunciona />
        <ClientesSection />
        <PricingSection />
        <FaqSection />
        <CtaFinalSection />
      </main>
      <LandingFooter />
    </div>
  );
}
