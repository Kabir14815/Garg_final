import { useRef, useEffect, useState } from 'react'
import './BannerVideo.css'

const BANNER_VIDEO_SRC = '/videos/banner.MOV?v=2'
const BANNER_POSTER = '/images/garg-2.png'

export default function BannerVideo() {
  const videoRef = useRef(null)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onError = () => setUseFallback(true)
    const onLoaded = () => setUseFallback(false)
    v.addEventListener('error', onError)
    v.addEventListener('loadeddata', onLoaded)
    v.play().catch(() => {})
    return () => {
      v.removeEventListener('error', onError)
      v.removeEventListener('loadeddata', onLoaded)
    }
  }, [])

  return (
    <section
      className="banner-video"
      aria-label="Brand video"
    >
      <div className="banner-video-wrap">
        <video
          ref={videoRef}
          className="banner-video-element"
          src={BANNER_VIDEO_SRC}
          poster={BANNER_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Garg Jewellers brand video"
        />
        {useFallback && (
          <div className="banner-video-fallback" style={{ backgroundImage: `url(${BANNER_POSTER})` }} />
        )}
        <div className="banner-video-overlay" aria-hidden="true" />
      </div>
      <div className="banner-video-ctas">
        <a
          href={`https://wa.me/919876376859?text=${encodeURIComponent('Hi, I would like to know more about Garg Jewellers.')}`}
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
