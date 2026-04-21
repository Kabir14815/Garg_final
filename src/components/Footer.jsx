import { Link } from 'react-router-dom'
import { useInView } from '../hooks/useInView'
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
  { label: 'About Us', to: '/about' },
  { label: 'Book an Appointment', to: '/book' },
  { label: 'Visit Our Store', href: '#contact' },
  { label: 'Talk to an Expert', href: 'tel:+919876376859' },
  { label: 'Digi Gold', href: '#' },
  { label: 'Blogs', href: '#' },
  { label: 'Jewellery Guide', href: '#' },
]

export default function Footer() {
  const [footerRef, inView] = useInView({ rootMargin: '-60px', threshold: 0.08 })
  const { user } = useAuth()

  return (
    <footer className="footer" id="contact" ref={footerRef}>
      <div className={`footer-cta ${inView ? 'footer-cta--visible' : ''}`}>
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
      </div>
      <nav className={`footer-nav ${inView ? 'footer-nav--visible' : ''}`} aria-label="Footer">
        <ul className="footer-nav-list">
          {footerNavLinks.map(({ label, href, to }) => (
            <li key={label}>
              {to ? (
                <Link to={to}>{label}</Link>
              ) : href.startsWith('tel:') || href.startsWith('http') || href.startsWith('#') ? (
                <a href={href}>{label}</a>
              ) : (
                <Link to={href}>{label}</Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} The House of Garg · Garg Jewellers
          {user?.isAdmin && <> · <Link to="/admin" className="footer-admin-link">Admin</Link></>}
        </p>
      </div>
    </footer>
  )
}
