import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import './Instagram.css'

const tiles = [
  { label: 'Rings' },
  { label: 'Style' },
  { label: 'Necklace' },
]

const stagger = (reduceMotion) => ({
  hidden: {},
  visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.1, delayChildren: reduceMotion ? 0 : 0.08 } },
})
const tileItem = (reduceMotion) => ({
  hidden: { opacity: 0, scale: reduceMotion ? 1 : 0.96 },
  visible: { opacity: 1, scale: 1 },
})

export default function Instagram() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()
  return (
    <motion.section className="instagram" ref={ref}>
      <motion.div
        className="instagram-grid"
        variants={stagger(reduceMotion)}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {tiles.map(({ label }, i) => (
          <motion.div key={i} className="instagram-tile hover-lift" variants={tileItem(reduceMotion)}>
            <div className="instagram-tile-image">
              <span>{label}</span>
            </div>
          </motion.div>
        ))}
        <motion.a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="instagram-cta-tile hover-lift"
          variants={tileItem(reduceMotion)}
        >
          <span className="instagram-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </span>
          <span className="instagram-cta-text">JOIN OUR Instagram</span>
        </motion.a>
      </motion.div>
    </motion.section>
  )
}
