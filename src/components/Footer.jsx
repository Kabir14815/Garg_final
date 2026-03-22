import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import './Footer.css'

function LocationIcon() {
  return (
    <svg className="footer-location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

const footerNavLinks = [
  { label: 'Visit Our Store', href: '#contact' },
  { label: 'Book an Appointment', href: '#contact' },
  { label: 'Talk to an Expert', href: 'tel:+919876376859' },
  { label: 'Digi Gold', href: '#' },
  { label: 'Blogs', href: '#' },
  { label: 'Jewellery Guide', href: '#' },
]

export default function Footer() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduceMotion = useReducedMotion()
  const { user } = useAuth()
  return (
    <motion.footer className="footer" id="contact" ref={ref}>
      <motion.div
        className="footer-cta"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: reduceMotion ? 0 : 0.5 }}
      >
        <h2 className="footer-cta-title">THE HOUSE OF GARG</h2>
        <p className="footer-cta-tagline">
          Royalty Claims Its Throne in Punjab – Find a Boutique or Book a Consultation
        </p>
        <p className="footer-cta-contact">
          <a href="https://www.thehouseofgarg.com" target="_blank" rel="noopener noreferrer">
            WWW.THEHOUSEOFGARG.COM
          </a>
          {' | '}
          <a href="tel:+919876376859">+91 98763 76859</a>
          <a href="#contact" className="footer-cta-icon" aria-label="Find us"> <LocationIcon /> </a>
        </p>
      </motion.div>
      <motion.nav
        className="footer-nav"
        aria-label="Footer"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.15 }}
      >
        <ul className="footer-nav-list">
          {footerNavLinks.map(({ label, href }) => (
            <li key={label}>
              {href.startsWith('tel:') || href.startsWith('http') || href.startsWith('#') ? (
                <a href={href}>{label}</a>
              ) : (
                <Link to={href}>{label}</Link>
              )}
            </li>
          ))}
        </ul>
      </motion.nav>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} The House of Garg · Garg Jewellers
          {user?.isAdmin && <> · <Link to="/admin" className="footer-admin-link">Admin</Link></>}
        </p>
      </div>
    </motion.footer>
  )
}
