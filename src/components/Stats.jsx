import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import './Stats.css'

const stats = [
  { value: '12', label: 'ALL OUR STORE' },
  { value: '150+', label: 'PRODUCT REVIEW' },
  { value: '1K+', label: 'PRODUCT BRAND' },
]

const container = (reduceMotion) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: reduceMotion ? 0 : 0.12,
      delayChildren: reduceMotion ? 0 : 0.1,
    },
  },
})
const item = (reduceMotion) => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
  visible: { opacity: 1, y: 0 },
})

export default function Stats() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduceMotion = useReducedMotion()
  return (
    <motion.section className="stats" ref={ref}>
      <motion.div
        className="stats-inner"
        variants={container(reduceMotion)}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        <motion.div className="stats-visual stats-visual-left" variants={item(reduceMotion)}>
          <div className="stats-image-placeholder">
            <span className="stats-image-icon">◇</span>
            <span>Pendant</span>
          </div>
        </motion.div>
        <div className="stats-cards">
          {stats.map(({ value, label }) => (
            <motion.div key={label} className="stats-card" variants={item(reduceMotion)}>
              <span className="stats-value">{value}</span>
              <span className="stats-label">{label}</span>
            </motion.div>
          ))}
        </div>
        <motion.div className="stats-badge" variants={item(reduceMotion)}>
          <div className="stats-badge-circle">
            <span className="stats-badge-title">Garg</span>
            <span className="stats-badge-sub">Jewellery & more</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
