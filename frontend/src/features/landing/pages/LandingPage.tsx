import { LandingNav } from '../components/LandingNav'
import { Hero } from '../components/Hero'
import { IntegrationsStrip } from '../components/IntegrationsStrip'
import { RoleSplit } from '../components/RoleSplit'
import { ValidationFeature } from '../components/ValidationFeature'
import { LandingFooter } from '../components/LandingFooter'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper-0">
      <div className="bg-shell">
        <LandingNav />
        <Hero />
      </div>
      <IntegrationsStrip />
      <RoleSplit />
      <ValidationFeature />
      <LandingFooter />
    </div>
  )
}

export default LandingPage
