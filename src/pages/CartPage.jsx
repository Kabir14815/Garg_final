import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MIN_ORDER_VALUE } from '../data/shopData'
import './CartPage.css'

export default function CartPage() {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className="cart-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
    >
      <motion.div
        className="cart-inner"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, delay: 0.1 }}
      >
        <h1>Your Cart</h1>
        <p className="cart-empty-msg">Your cart is empty.</p>
        <p className="cart-min-order">
          Minimum order value: ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}. Maximum: No limit.
        </p>
        <Link to="/shop" className="cart-shop-link">Continue shopping</Link>
      </motion.div>
    </motion.div>
  )
}
