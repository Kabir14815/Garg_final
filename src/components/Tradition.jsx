import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import './Tradition.css'

const container = (reduceMotion) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: reduceMotion ? 0 : 0.08 },
  },
})
const item = (reduceMotion) => ({
  hidden: { opacity: 0, x: reduceMotion ? 0 : -24 },
  visible: { opacity: 1, x: 0 },
})
const itemRight = (reduceMotion) => ({
  hidden: { opacity: 0, x: reduceMotion ? 0 : 24 },
  visible: { opacity: 1, x: 0 },
})

export default function Tradition() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const reduceMotion = useReducedMotion()
  return (
    <motion.section className="tradition" id="about" ref={ref}>
      <motion.div
        className="tradition-inner"
        variants={container(reduceMotion)}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        <motion.div className="tradition-images" variants={item(reduceMotion)}>
          <div className="tradition-img-main">
            <img
              src="/images/hero-new.webp"
              alt="Bestsellers from Garg Jewellers"
              className="tradition-img-photo"
              loading="lazy"
              decoding="async"
            />
          </div>
        </motion.div>
        <motion.div className="tradition-content" variants={itemRight(reduceMotion)}>
          <h2 className="tradition-title">Bestsellers of Garg Jewellers </h2>
          <p className="tradition-text">
            We are retailers of specialised antique jewellery handcrafted work, known for the craftsmanship and providing the least making charges in sector.
          </p>
          <div className="tradition-logo-story">
            <h3>Our Vision</h3>
            <p>Reaching to the heart of more and more people providing the best jewellery, diamond and silver products. Expanding our legacy.</p>
          </div>
          <a href="#contact" className="cta-tradition">Visit us →</a>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
