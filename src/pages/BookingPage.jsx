import { useState } from 'react'
import { Link } from 'react-router-dom'
import { openWhatsAppBooking, saveBookingRequestLocal } from '../utils/whatsappOrder'
import './BookingPage.css'

const VISIT_TYPES = [
  'Private consultation',
  'Bridal / wedding viewing',
  'Gold & jewellery purchase',
  'Repair or resizing',
  'Custom design discussion',
  'Other',
]

const initialForm = {
  name: '',
  phone: '',
  email: '',
  date: '',
  time: '',
  visitType: VISIT_TYPES[0],
  notes: '',
}

export default function BookingPage() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)

  function update(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim() || !form.date || !form.time) return
    saveBookingRequestLocal(form)
    openWhatsAppBooking(form)
    setSubmitted(true)
  }

  return (
    <div className="booking-page">
      <div className="booking-inner">
        <p className="booking-eyebrow">Appointments</p>
        <h1 className="booking-title">Book a visit</h1>
        <p className="booking-intro">
          Choose a preferred date and time. We will open WhatsApp with your details so our team can
          confirm your appointment.
        </p>

        {submitted ? (
          <div className="booking-done">
            <p>Your request was sent to WhatsApp. We will get back to you shortly.</p>
            <Link to="/shop" className="booking-secondary-link">Continue to shop</Link>
          </div>
        ) : (
          <form className="booking-form" onSubmit={handleSubmit}>
            <label className="booking-field">
              <span>Full name *</span>
              <input name="name" value={form.name} onChange={update} required autoComplete="name" />
            </label>
            <label className="booking-field">
              <span>Phone (WhatsApp) *</span>
              <input name="phone" value={form.phone} onChange={update} required type="tel" autoComplete="tel" />
            </label>
            <label className="booking-field">
              <span>Email (optional)</span>
              <input name="email" value={form.email} onChange={update} type="email" autoComplete="email" />
            </label>
            <label className="booking-field">
              <span>Visit type *</span>
              <select name="visitType" value={form.visitType} onChange={update} required>
                {VISIT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <div className="booking-row">
              <label className="booking-field">
                <span>Preferred date *</span>
                <input name="date" value={form.date} onChange={update} required type="date" />
              </label>
              <label className="booking-field">
                <span>Preferred time *</span>
                <input name="time" value={form.time} onChange={update} required type="time" />
              </label>
            </div>
            <label className="booking-field">
              <span>Notes (optional)</span>
              <textarea name="notes" value={form.notes} onChange={update} rows={3} placeholder="Occasion, pieces you are interested in, etc." />
            </label>
            <button type="submit" className="booking-submit">
              Send via WhatsApp
            </button>
            <p className="booking-hint">You can adjust the message in WhatsApp before sending.</p>
          </form>
        )}
      </div>
    </div>
  )
}
