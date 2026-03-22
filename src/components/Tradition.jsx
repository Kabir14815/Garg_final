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
            <span className="tradition-img-placeholder">Necklace</span>
          </div>
          <div className="tradition-img-overlay">
            <span className="tradition-ring-icon">◇</span>
          </div>
        </motion.div>
        <motion.div className="tradition-content" variants={itemRight(reduceMotion)}>
          <h2 className="tradition-title">Royalty Claims Its Throne in Punjab</h2>
          <p className="tradition-text">
            Showcasing The House of Garg from Garg Jewellers — a luxury two-floor bodega in the heart of city beautiful. Two sectioned floors blooming with the most gleaming jewels and the most haute couture in the city. Step in and feel the heritage of luxury; dive into the balance of tradition and modernity.
          </p>
          <div className="tradition-logo-story">
            <h3>Our insignia</h3>
            <p>Fusing the royal hues of golden and sage, the letters T, H and G meet in perfect artistic proportions. The T takes the form of a handleless dagger, symbolising strength and precision; the G gracefully encircles the H, weaving unity and timelessness. Together they craft royal sophistication and the strong legacy of The House of Garg.</p>
          </div>
          <a href="#contact" className="cta-tradition">Visit us →</a>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
