import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useMetalRates } from '../context/MetalRatesContext'
import './MetalTicker.css'

/**
 * @param {{ pinned?: boolean }} props
 * pinned — top site strip (dark bar); no scroll-in animation.
 */
export default function MetalTicker({ pinned = false }) {
  const { tickerItems } = useMetalRates()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()

  const body = (
    <>
      <div className="metal-ticker" aria-live="polite">
        <div className="metal-ticker-inner">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={`${item.label}-${i}`} className="metal-ticker-item">
              <span className="metal-ticker-label">{item.label}</span>
              <span className="metal-ticker-value">
                ₹{item.value.toLocaleString('en-IN')}
                {item.unit}
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  )

  const wrapClass = `metal-ticker-wrap${pinned ? ' metal-ticker-wrap--top' : ''}`

  if (pinned) {
    return (
      <div className={wrapClass} aria-label="Metal rates in Indian rupees">
        {body}
      </div>
    )
  }

  return (
    <motion.div
      className={wrapClass}
      ref={ref}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: reduceMotion ? 0 : 0.5 }}
    >
      {body}
    </motion.div>
  )
}
