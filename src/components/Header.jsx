import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import ShopMegaMenu from './ShopMegaMenu'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const LogoIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    <path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.05 7.05l2.12 2.12M22.83 22.83l2.12 2.12M7.05 24.95l2.12-2.12M22.83 9.17l2.12-2.12" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

export default function Header() {
  const [shopOpen, setShopOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const reduceMotion = useReducedMotion()
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <motion.header
      className={`header ${isHome ? 'header--over-video' : ''}`}
      initial={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeOut' }}
    >
      <Link to="/" className="logo-wrap" onClick={() => setMobileMenuOpen(false)}>
        <div className="logo-icon">
          <LogoIcon />
        </div>
        <span className="logo-text">Garg <span className="logo-accent">Jewellers</span></span>
      </Link>

      <nav className={`nav nav-right ${mobileMenuOpen ? 'is-open' : ''}`}>
        <div
          className="nav-item nav-shop"
          onMouseEnter={() => setShopOpen(true)}
          onMouseLeave={() => setShopOpen(false)}
        >
          <Link
            to="/shop"
            className="nav-link"
            onClick={() => { setShopOpen(false); setMobileMenuOpen(false) }}
            aria-expanded={shopOpen}
            aria-haspopup="true"
          >
            Shop
          </Link>
          <ShopMegaMenu open={shopOpen} onClose={() => setShopOpen(false)} />
        </div>
        {user ? (
          <button
            type="button"
            className="nav-link"
            onClick={() => { logout(); setMobileMenuOpen(false); navigate('/'); }}
          >
            Logout
          </button>
        ) : (
          <button
            type="button"
            className="nav-link"
            onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
          >
            Login
          </button>
        )}
        {user?.isAdmin && (
          <Link to="/admin" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
        )}
        <button
          type="button"
          className="nav-link nav-cart"
          onClick={() => { navigate('/cart'); setMobileMenuOpen(false) }}
          aria-label="Cart"
        >
          Cart
        </button>
      </nav>

      <button
        type="button"
        className="menu-btn"
        aria-label="Menu"
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span /><span /><span />
      </button>
    </motion.header>
  )
}
