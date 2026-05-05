import { Link } from 'react-router-dom'
import './AboutPage.css'

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
        <div className="about-banner">
          <img src="/images/artboard-4.png" alt="The House of Garg" className="about-banner-img" loading="lazy" />
        </div>
        <h2 id="about-journey-heading" className="about-h2">OUR JOURNEY</h2>
        <p className="about-intro about-journey-lead">
          Moments from our world — craft, collections, and the celebrations we are part of.
        </p>

        <div className="journey-split">
          <div className="journey-section">
            <h3 className="journey-h3">THEN</h3>
            <div className="journey-split-frame">
              <img src="/images/journey-then.jpg" alt="Our journey then" className="journey-split-img" loading="lazy" decoding="async" />
            </div>
          </div>
          <div className="journey-section">
            <h3 className="journey-h3">NOW</h3>
            <div className="journey-split-frame">
              <img src="/images/journey-now.webp" alt="Our journey now" className="journey-split-img" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
      </section>

      <section className="about-section about-legacy">
        <p className="about-legacy-text">
          <strong className="highlight-garg">Garg Jewellers</strong>, known in Kharar as Ved Parkash and Sons, has built a strong legacy of trust and quality over the years. From a humble beginning to a modern jewellery destination, we have become your one-stop shop for both wedding and everyday jewellery.
        </p>
        <p className="about-legacy-text">
          Offering a beautiful collection of gold, silver, and diamond jewellery, we continue to blend tradition with modern elegance while staying committed to purity and customer satisfaction.
        </p>
      </section>

      <section className="about-section about-owners">
        <h2 className="about-h2 owners-title">MEET OUR OWNERS</h2>
        <div className="owners-grid">
          <div className="owner-card">
            <div className="owner-image-frame">
              <img src="/images/owners-founders.jpg" alt="Yogesh Garg & Naveen Garg" className="owner-img" loading="lazy" />
            </div>
            <h3 className="owner-name">YOGESH GARG & NAVEEN GARG</h3>
            <p className="owner-title">(FOUNDERS)</p>
          </div>
          <div className="owner-card">
            <div className="owner-image-frame">
              <img src="/images/owner-coo.png" alt="Harshul Garg" className="owner-img" loading="lazy" />
            </div>
            <h3 className="owner-name">HARSHUL GARG</h3>
            <p className="owner-title">(COO)</p>
          </div>
        </div>
      </section>

      <section className="about-section about-block--accent about-visit">
        <h2 className="about-h2">Visit us</h2>
        <p className="about-copy">
          Step into our boutique to explore collections, discuss custom work, or plan a celebration
          with our team. Booking ahead helps us reserve unhurried time just for you.
        </p>
        <div className="about-actions">
          <Link to="/book" className="about-cta about-cta--outline">Schedule a visit</Link>
          <a href="tel:+919054900042" className="about-link-phone">+91 98763 76859</a>
        </div>
      </section>
    </div>
  )
}
