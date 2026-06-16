import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from '../hooks/useInView'
import './Hero.css'

// Compressed versions (webm/mp4) are preferred; MOV is a fallback for browsers that support it.
// See optimize-media.sh in the project root to generate the compressed versions.

const fadeUp = (reduceMotion) => ({
  initial: { opacity: 0, y: reduceMotion ? 0 : 24 },
  animate: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
})
const scaleIn = (reduceMotion) => ({
  initial: { opacity: 0, scale: reduceMotion ? 1 : 0.94 },
  animate: { opacity: 1, scale: 1, transition: { duration: reduceMotion ? 0 : 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
})

export default function Hero() {
  const videoRef = useRef(null)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const reduceMotion = useReducedMotion()
  const [mediaRef, mediaNearView] = useInView({ rootMargin: '140px 0px', threshold: 0 })
  const loadVideo = reduceMotion ? false : mediaNearView

  useEffect(() => {
    const v = videoRef.current
    if (!v || !loadVideo) return
    const onLoad = () => setShowPlaceholder(false)
    v.addEventListener('loadeddata', onLoad)
    if (v.readyState >= 2) setShowPlaceholder(false)
    v.play().catch(() => { })
    return () => v.removeEventListener('loadeddata', onLoad)
  }, [loadVideo])

  return (
    <motion.section
      className="hero"
      id="home"
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } } }}
    >
      <div className="hero-content">
        <motion.div className="deco deco-gem deco-gem-1" variants={fadeUp(reduceMotion)} />
        <motion.h1 className="headline" variants={fadeUp(reduceMotion)}>

          <span className="headline-line">Garg Jewellers</span>
        </motion.h1>
        <motion.p className="tagline" variants={fadeUp(reduceMotion)}>Garg Jewellers is a renowned jewellery firm in Kharar, also known as Ved Parkash and Sons. Your one-stop destination for wedding and everyday jewellery, offering a dazzling collection of gold, silver, and diamond pieces.
          Covering dazzling collection of Gold, Silver and Diamond products.</motion.p>
        <motion.p className="hero-house" variants={fadeUp(reduceMotion)}>THE HOUSE OF GARG · GARG JEWELLERS · GARG FASHION</motion.p>
        <motion.div className="hero-ctas" variants={fadeUp(reduceMotion)}>
          <Link to="/shop" className="cta cta-primary">Explore Collection</Link>
          <button type="button" className="cta cta-outline" aria-label="Play Video">
            <PlayIcon /> Play Video
          </button>
        </motion.div>
        <motion.div className="carousel-dots" variants={fadeUp(reduceMotion)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`dot ${i === 1 ? 'active' : ''}`} aria-current={i === 1 ? 'true' : undefined} />
          ))}
        </motion.div>
      </div>

      <div className="hero-media" ref={mediaRef}>
        <div className="deco deco-branch deco-branch-1" />
        <div className="deco deco-branch deco-branch-2" />
        <motion.div className="circle-wrap" variants={scaleIn(reduceMotion)}>
          <div className="circle-border">
            <div className="circle-inner">
              {loadVideo ? (
                <video
                  ref={videoRef}
                  className="hero-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/images/hero-new.webp"
                  aria-label="Garg Jewellers brand video"
                >
                  {/* mp4 is smallest (2.8 MB); webm is fallback */}
                  <source src="/videos/hero.mp4" type="video/mp4" />
                  <source src="/videos/hero.webm" type="video/webm" />
                </video>
              ) : null}
              {(!loadVideo || showPlaceholder) && (
                <div className="hero-video-placeholder" aria-hidden="true" />
              )}
            </div>
          </div>
        </motion.div>
        <div className="deco deco-gem deco-gem-2" />
        <div className="deco deco-gem deco-gem-3" />
      </div>
    </motion.section>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
