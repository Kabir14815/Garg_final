import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from '../hooks/useInView'
import './Hero.css'

const HERO_VIDEO_SRC = '/videos/hero.MOV'

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
    v.play().catch(() => {})
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
          <span className="headline-line">Usher in</span>
          <span className="headline-line">Royal Exclusivity</span>
        </motion.h1>
        <motion.p className="tagline" variants={fadeUp(reduceMotion)}>The House of Garg — where the most gleaming jewels meet haute couture in the heart of the city beautiful.</motion.p>
        <motion.p className="hero-house" variants={fadeUp(reduceMotion)}>THE HOUSE OF GARG · GARG JEWELLERY · GARG FASHION</motion.p>
        <motion.div className="hero-ctas" variants={fadeUp(reduceMotion)}>
          <Link to="/shop" className="cta cta-primary">Explore collection</Link>
          <button type="button" className="cta cta-outline" aria-label="Play video">
            <PlayIcon /> Play video
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
                  src={HERO_VIDEO_SRC}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label="Garg Jewellers brand video"
                />
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
