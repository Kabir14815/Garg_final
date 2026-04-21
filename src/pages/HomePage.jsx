import { lazy, Suspense } from 'react'
import BannerVideo from '../components/BannerVideo'
import Hero from '../components/Hero'

const HomeBelowFold = lazy(() => import('./HomeBelowFold'))

function BelowFoldFallback() {
  return <div className="home-below-fold-fallback" aria-hidden="true" />
}

export default function HomePage() {
  return (
    <>
      <BannerVideo />
      <Hero />
      <Suspense fallback={<BelowFoldFallback />}>
        <HomeBelowFold />
      </Suspense>
    </>
  )
}
