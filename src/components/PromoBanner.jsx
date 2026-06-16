import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import './PromoBanner.css'

const PROMO_SLIDES = ['/images/hero-1.jpeg', '/images/hero-2.jpeg']

export default function PromoBanner() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % PROMO_SLIDES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.section className="promo-banner" ref={ref}>
      <motion.div
        className="promo-banner-inner"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="promo-banner-bg">
          {PROMO_SLIDES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              width="1400"
              height="700"
              style={{
                opacity: i === activeSlide ? 0.85 : 0,
                transition: 'opacity 1s ease-in-out',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ))}
        </div>
        <div className="promo-banner-content">
          <h2 className="promo-banner-title">Exchange your old gold for new gold</h2>
          <p className="promo-banner-sub">Over 500+ new designs to choose from</p>
          <Link to="/shop" className="promo-banner-cta">Explore designs</Link>
        </div>
      </motion.div>
    </motion.section>
  )
}
