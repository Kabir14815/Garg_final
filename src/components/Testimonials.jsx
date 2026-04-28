import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import './Testimonials.css'

const QUOTES = [
  {
    text: 'Amazing service. My ring was a bit too big and they offered to resize it for free and very swiftly.',
    author: 'Kathryn Murphy',
    role: 'Project Manager',
  },
  {
    text: 'The craftsmanship of their jewelry is unparalleled. I found the perfect diamond necklace for my wedding.',
    author: 'Priya Sharma',
    role: 'Bride',
  },
  {
    text: 'A trusted name in the city. Their gold and silver collections are stunning, and the staff is extremely helpful.',
    author: 'Rohan Verma',
    role: 'Entrepreneur',
  }
]

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
  const [activeIndex, setActiveIndex] = useState(0)

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % QUOTES.length)
  }

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + QUOTES.length) % QUOTES.length)
  }

  const quote = QUOTES[activeIndex]

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
          <p className="testimonials-intro">
            Hear from our happy customers who trust Garg Jewellers for their special moments. We take immense pride in our craftsmanship, ensuring every piece reflects elegance and brilliance.
          </p>
          <div className="testimonials-nav">
            <button type="button" onClick={handlePrev} className="test-nav-arrow" aria-label="Previous">←</button>
            <button type="button" onClick={handleNext} className="test-nav-arrow" aria-label="Next">→</button>
          </div>
        </motion.div>
        <motion.div className="testimonials-visual" variants={fadeUp(reduceMotion)}>
          <div className="testimonials-card">
            <div className="testimonials-stars">★★★★★</div>
            <p className="testimonials-card-text">{quote.text}</p>
            <hr className="testimonials-divider" />
            <div className="testimonials-card-author">
              <strong>-{quote.author}</strong>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
