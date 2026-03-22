import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import './NewArrival.css'

const products = [
  { name: 'Necklace Set', price: '₹ 1,85,000', id: 1, image: '/images/garg-2.png' },
  { name: 'Diamond Bangles', price: '₹ 2,28,000', id: 2, image: '/images/garg-6.png' },
  { name: 'Gold Earrings', price: '₹ 42,000', id: 3, image: '/images/garg-3.png' },
  { name: 'Pendant Necklace', price: '₹ 95,000', id: 4, image: '/images/garg-8.png' },
]

const fadeUp = (reduceMotion) => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
  visible: { opacity: 1, y: 0 },
})
const stagger = (reduceMotion) => ({
  hidden: {},
  visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.1, delayChildren: reduceMotion ? 0 : 0.15 } },
})

export default function NewArrival() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()
  return (
    <motion.section className="new-arrival" ref={ref}>
      <div className="new-arrival-inner">
        <motion.div
          className="new-arrival-header"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeUp(reduceMotion)}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
        >
          <h2 className="new-arrival-title">New Arrival</h2>
          <p className="new-arrival-desc">
            Latest handpicked designs for those who appreciate fine craftsmanship and timeless style.
          </p>
          <div className="new-arrival-nav">
            <button type="button" className="nav-arrow" aria-label="Previous">←</button>
            <button type="button" className="nav-arrow" aria-label="Next">→</button>
          </div>
        </motion.div>
        <motion.div
          className="new-arrival-grid"
          variants={stagger(reduceMotion)}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {products.map(({ name, price, id, image }) => (
            <motion.div
              key={id}
              className="new-arrival-card hover-lift"
              variants={fadeUp(reduceMotion)}
              transition={{ duration: reduceMotion ? 0 : 0.45 }}
            >
              <div className="new-arrival-card-image">
                <img src={image} alt={name} />
              </div>
              <div className="new-arrival-card-info">
                <span className="card-name">{name}</span>
                <span className="card-price">{price}</span>
              </div>
              <button type="button" className="card-cart-btn" aria-label={`Add ${name} to cart`}>
                <CartIcon />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
