import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import './Testimonials.css'

const quote = {
  text: 'Amazing service. My ring was a bit too big and they offered to resize it for free and very swiftly.',
  author: 'Kathryn Murphy',
  role: 'Project Manager',
}

const fadeUp = (reduceMotion) => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
  visible: { opacity: 1, y: 0 },
})
const stagger = (reduceMotion) => ({
  hidden: {},
  visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.15, delayChildren: reduceMotion ? 0 : 0.1 } },
})

export default function Testimonials() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()
  return (
    <motion.section className="testimonials" ref={ref}>
      <motion.h2
        className="testimonials-title"
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        variants={fadeUp(reduceMotion)}
        transition={{ duration: reduceMotion ? 0 : 0.5 }}
      >
        What People Say
      </motion.h2>
      <motion.div
        className="testimonials-inner"
        variants={stagger(reduceMotion)}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        <motion.div className="testimonials-content" variants={fadeUp(reduceMotion)}>
          <span className="testimonials-quote-mark">"</span>
          <blockquote className="testimonials-quote">{quote.text}</blockquote>
          <div className="testimonials-author">
            <strong>{quote.author}</strong>
            <span>{quote.role}</span>
          </div>
          <div className="testimonials-nav">
            <button type="button" className="test-nav-arrow" aria-label="Previous">←</button>
            <button type="button" className="test-nav-arrow" aria-label="Next">→</button>
          </div>
        </motion.div>
        <motion.div className="testimonials-visual" variants={fadeUp(reduceMotion)}>
          <div className="testimonials-image-placeholder">
            <span>Customer</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
