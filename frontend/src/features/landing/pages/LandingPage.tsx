import { LandingNav } from '../components/LandingNav'
import { Hero } from '../components/Hero'
import { LandscapeGallery } from '../components/LandscapeGallery'
import { ResearchSitesMap } from '../components/ResearchSitesMap'
import { ProtectedSpeciesShowcase } from '../components/ProtectedSpeciesShowcase'
import { ValidationPipeline } from '../components/ValidationPipeline'
import { DashboardPreview } from '../components/DashboardPreview'
import { EcosystemIntegrations } from '../components/EcosystemIntegrations'
import { RoleSplit } from '../components/RoleSplit'
import { LandingFooter } from '../components/LandingFooter'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper-0">
      <LandingNav />
      <Hero />
      <LandscapeGallery />
      <ResearchSitesMap />
      <ProtectedSpeciesShowcase />
      <ValidationPipeline />
      <DashboardPreview />
      <EcosystemIntegrations />
      <RoleSplit />
      <LandingFooter />
    </div>
  )
}

export default LandingPage