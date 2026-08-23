import { AgeGateModal } from '@/components/landing/AgeGateModal'
import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { StatsBand } from '@/components/landing/StatsBand'
import { PillarsShowcase } from '@/components/landing/PillarsShowcase'
import { PricingSection } from '@/components/landing/PricingSection'
import { FinalCta } from '@/components/landing/FinalCta'
import { LandingFooter } from '@/components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07070b] text-white">
      <AgeGateModal />
      <LandingNav />
      <Hero />
      <StatsBand />
      <PillarsShowcase />
      <PricingSection />
      <FinalCta />
      <LandingFooter />
    </div>
  )
}
