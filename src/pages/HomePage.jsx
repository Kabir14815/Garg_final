import { lazy, Suspense } from 'react'
import BannerVideo from '../components/BannerVideo'
import DigitalMetalMeter from '../components/DigitalMetalMeter'
import Hero from '../components/Hero'

const HomeBelowFold = lazy(() => import('./HomeBelowFold'))

function BelowFoldFallback() {
  return <div className="home-below-fold-fallback" aria-hidden="true" />
}

export default function HomePage() {
  return (
    <>
      <BannerVideo />
      <DigitalMetalMeter className="digital-metal-meter--below-banner" />
      <Hero />
      <Suspense fallback={<BelowFoldFallback />}>
        <HomeBelowFold />
      </Suspense>
    </>
  )
}
