import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import './PromoBanner.css'

export default function PromoBanner() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()
  return (
    <motion.section className="promo-banner" ref={ref}>
      <motion.div
        className="promo-banner-inner"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 30 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="promo-banner-bg">
          <img src="/images/garg-7.png" alt="" aria-hidden />
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
