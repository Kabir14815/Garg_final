import { Link } from 'react-router-dom'
import './AboutPage.css'

const values = [
  {
    title: 'Honest metal',
    text:
      'We stand behind purity and clear hallmarks. What you see is what you wear — no shortcuts, no surprises at billing.',
  },
  {
    title: 'Artisan craft',
    text:
      'Our makers blend classical motifs with clean, modern lines so every piece feels timeless yet right for today.',
  },
  {
    title: 'Personal service',
    text:
      'Jewellery is personal. We listen first — for weddings, gifts, or heirlooms — then guide you without rush.',
  },
]

const milestones = [
  { year: 'Heritage', text: 'Rooted in Punjab’s goldsmithing traditions, serving families across generations.' },
  { year: 'Bespoke', text: 'Custom design and remodelling for pieces that tell your story.' },
  { year: 'Today', text: 'A curated boutique experience with transparent pricing and private consultations.' },
]

const services = [
  { title: 'Bridal & wedding', desc: 'Necklaces, sets, and coordination for the whole celebration.' },
  { title: 'Daily & festive', desc: 'Gold you can live in — lightweight options and statement pieces.' },
  { title: 'Custom design', desc: 'Sketches to finished jewel, with your metal or ours.' },
  { title: 'Care & trust', desc: 'Sizing, polishing, and honest advice on care and storage.' },
]

const journeyPhotos = [
  {
    src: '/images/journey/about-photo1.png',
    caption: 'Where craft meets intention — detail that lasts generations.',
    alt: 'Garg Jewellers — fine gold craftsmanship',
  },
  {
    src: '/images/journey/DSC05504.JPG',
    caption: 'Heritage collections, curated for today’s celebrations.',
    alt: 'Heritage jewellery display at Garg Jewellers',
  },
  {
    src: '/images/journey/DSC05635.JPG',
    caption: 'The boutique — unhurried conversations and honest guidance.',
    alt: 'Boutique jewellery experience',
  },
  {
    src: '/images/journey/about-photo4.png',
    caption: 'Bridal and festive pieces made to be remembered.',
    alt: 'Bridal and festive gold jewellery',
  },
  {
    src: '/images/journey/about-photo5.png',
    caption: 'The House of Garg — Punjab’s traditions, your story.',
    alt: 'The House of Garg jewellery',
  },
]

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-inner">
          <div className="about-hero-copy">
            <p className="about-eyebrow">Our story</p>
            <h1 className="about-title">The House of Garg</h1>
            <p className="about-lead">
              For generations, Garg Jewellers has brought Punjab’s heritage of fine gold and bespoke design
              to families who expect nothing less than thoughtful craft and royal exclusivity — with warmth,
              not pretence.
            </p>
            <div className="about-hero-actions">
              <Link to="/book" className="about-cta">Book a private consultation</Link>
              <Link to="/shop" className="about-cta about-cta--outline">Explore the shop</Link>
            </div>
          </div>
          <aside className="about-hero-aside" aria-label="At a glance">
            <ul className="about-aside-list">
              <li><strong>Boutique</strong> Private appointments & walk-ins welcome</li>
              <li><strong>Gold & more</strong> Curated collections and custom work</li>
              <li><strong>Punjab</strong> Rooted in local craft, open to the world</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="about-journey" aria-labelledby="about-journey-heading">
        <h2 id="about-journey-heading" className="about-h2">Our journey</h2>
        <p className="about-intro about-journey-lead">
          Moments from our world — craft, collections, and the celebrations we are part of.
        </p>
        <ul className="about-journey-grid">
          {journeyPhotos.map(({ src, caption, alt }) => (
            <li key={src} className="about-journey-card">
              <figure className="about-journey-figure">
                <div className="about-journey-frame">
                  <img src={src} alt={alt} className="about-journey-img" loading="lazy" decoding="async" />
                </div>
                <figcaption className="about-journey-caption">{caption}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section">
        <h2 className="about-h2">What we stand for</h2>
        <p className="about-intro">
          We believe jewellery should outlast trends. These principles guide how we buy, make, and sell.
        </p>
        <ul className="about-values">
          {values.map(({ title, text }) => (
            <li key={title} className="about-value-card">
              <h3 className="about-h3">{title}</h3>
              <p className="about-copy">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section about-section--timeline">
        <h2 className="about-h2">Heritage &amp; today</h2>
        <ol className="about-timeline">
          {milestones.map(({ year, text }) => (
            <li key={year} className="about-timeline-item">
              <span className="about-timeline-year">{year}</span>
              <p className="about-copy">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section">
        <h2 className="about-h2">How we can help</h2>
        <ul className="about-services">
          {services.map(({ title, desc }) => (
            <li key={title} className="about-service">
              <h3 className="about-h3">{title}</h3>
              <p className="about-copy">{desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section about-block--accent about-visit">
        <h2 className="about-h2">Visit us</h2>
        <p className="about-copy">
          Step into our boutique to explore collections, discuss custom work, or plan a celebration
          with our team. Booking ahead helps us reserve unhurried time just for you.
        </p>
        <div className="about-actions">
          <Link to="/book" className="about-cta about-cta--outline">Schedule a visit</Link>
          <a href="tel:+919876376859" className="about-link-phone">+91 98763 76859</a>
        </div>
      </section>
    </div>
  )
}
