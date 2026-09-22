import { useEffect, useState } from 'react'

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
  const [showSplash, setShowSplash] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Start disappearing around the middle/end of the splash.
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true)
    }, 2600)

    // Remove it completely at 5 seconds.
    const removeTimer = window.setTimeout(() => {
      setShowSplash(false)
    }, 4200)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-paper-0">
      {showSplash && (
        <div
          className={`landing-splash ${
            isExiting ? 'landing-splash-exit' : ''
          }`}
          aria-hidden="true"
        >
          <div className="landing-splash-glow" />

          <img
            src="/assests/landing/National_Emblem_of_Algeria_(bronze_effect).svg.webp"
            alt=""
            className="landing-splash-emblem"
          />
        </div>
      )}

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