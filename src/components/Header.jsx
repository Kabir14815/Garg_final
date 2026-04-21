import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import ShopMegaMenu from './ShopMegaMenu'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const LOGO_SRC = '/images/logo-thg.png'

function MainNavLink({ to, children, onNavigate, className = '' }) {
  const location = useLocation()
  const isActive = location.pathname === to
  return (
    <Link
      to={to}
      className={`nav-link ${isActive ? 'is-active' : ''} ${className}`.trim()}
      onClick={onNavigate}
    >
      {children}
    </Link>
  )
}

export default function Header() {
  const [shopOpen, setShopOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const location = useLocation()
  const isHome = location.pathname === '/'

  const closeMenus = () => {
    setShopOpen(false)
    setMobileMenuOpen(false)
  }

  return (
    <header className={`header ${isHome ? 'header--over-video' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="header-brand" onClick={closeMenus}>
          <img
            src={LOGO_SRC}
            alt="The House of Garg monogram"
            className="header-logo-img"
            width={44}
            height={44}
            decoding="async"
          />
          <span className="logo-text">
            Garg <span className="logo-accent">Jewellers</span>
          </span>
        </Link>

        <div className="header-nav-wrap">
          <nav
            className={`header-nav nav-right ${mobileMenuOpen ? 'is-open' : ''}`}
            aria-label="Main navigation"
          >
            <div
              className="nav-item nav-shop"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <Link
                to="/shop"
                className={`nav-link ${location.pathname.startsWith('/shop') || location.pathname.startsWith('/product') ? 'is-active' : ''}`}
                onClick={() => { setShopOpen(false); setMobileMenuOpen(false) }}
                aria-expanded={shopOpen}
                aria-haspopup="true"
              >
                Shop
              </Link>
              <ShopMegaMenu open={shopOpen} onClose={() => setShopOpen(false)} />
            </div>
            <MainNavLink to="/about" onNavigate={closeMenus}>About</MainNavLink>
            <MainNavLink to="/book" onNavigate={closeMenus}>Book</MainNavLink>
            {user ? (
              <button
                type="button"
                className="nav-link"
                onClick={() => { logout(); closeMenus(); navigate('/') }}
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                className={`nav-link ${location.pathname === '/login' ? 'is-active' : ''}`}
                onClick={() => { navigate('/login'); closeMenus() }}
              >
                Login
              </button>
            )}
            {user?.isAdmin && (
              <MainNavLink to="/admin" onNavigate={closeMenus}>Admin</MainNavLink>
            )}
            <button
              type="button"
              className="nav-link nav-cart"
              onClick={() => { navigate('/cart'); closeMenus() }}
              aria-label="View cart"
            >
              Cart
            </button>
          </nav>

          <button
            type="button"
            className={`menu-btn ${mobileMenuOpen ? 'menu-btn--open' : ''}`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  )
}
