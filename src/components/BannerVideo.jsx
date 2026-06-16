import { useRef, useEffect, useState } from 'react'
import './BannerVideo.css'

export default function BannerVideo() {
  const sectionRef = useRef(null)
  const videoRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  // Only start loading the video when the section enters the viewport
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !shouldLoad) return
    const onError = () => setUseFallback(true)
    v.addEventListener('error', onError)
    v.play().catch(() => {})
    return () => v.removeEventListener('error', onError)
  }, [shouldLoad])

  return (
    <section className="banner-video" ref={sectionRef} aria-label="Brand video">
      <div className="banner-video-wrap">
        {shouldLoad && !useFallback ? (
          <video
            ref={videoRef}
            className="banner-video-element"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Garg Jewellers brand video"
          >
            {/* mp4 is smallest (4.6 MB); webm is fallback */}
            <source src="/videos/banner.mp4" type="video/mp4" />
            <source src="/videos/banner.webm" type="video/webm" />
          </video>
        ) : (
          <div className="banner-video-fallback banner-video-fallback--neutral" aria-hidden="true" />
        )}
        <div className="banner-video-overlay" aria-hidden="true" />
      </div>
      <div className="banner-video-ctas">
        <a
          href={`https://wa.me/919054900042?text=${encodeURIComponent('Hi, I would like to know more about Garg Jewellers.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="banner-video-cta banner-video-cta-whatsapp"
        >
          <span aria-hidden>💬</span>
          Connect with us on WhatsApp
        </a>
        <span className="banner-video-cta">
          Hi! Welcome to The House of Garg
        </span>
      </div>
    </section>
  )
}
