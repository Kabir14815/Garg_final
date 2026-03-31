// WhatsApp order: opens WhatsApp with pre-filled message.
// Replace with your business number (with country code, no + or spaces).
const WHATSAPP_NUMBER = '919876376859'

export function buildWhatsAppOrderMessage({
  customerName = '',
  productName = '',
  weight = '',
  price = '',
  contactNumber = '',
  deliveryMethod = 'Pickup', // or 'Visit Store'
}) {
  const lines = [
    '*Garg Jewellers - Order Enquiry*',
    '',
    `Customer Name: ${customerName}`,
    `Product: ${productName}`,
    `Weight: ${weight}`,
    `Price: ₹${price}`,
    `Contact: ${contactNumber}`,
    `Delivery: ${deliveryMethod}`,
  ]
  return lines.join('\n')
}

export function openWhatsAppOrder(orderDetails) {
  const text = encodeURIComponent(buildWhatsAppOrderMessage(orderDetails))
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

const BOOKING_STORAGE_KEY = 'garg-booking-requests'

export function buildWhatsAppBookingMessage({
  name = '',
  phone = '',
  email = '',
  date = '',
  time = '',
  visitType = '',
  notes = '',
}) {
  const lines = [
    '*Garg Jewellers — Store appointment / consultation*',
    '',
    `Name: ${name}`,
    `Phone: ${phone}`,
    email ? `Email: ${email}` : null,
    `Preferred date: ${date}`,
    `Preferred time: ${time}`,
    `Visit type: ${visitType}`,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

export function openWhatsAppBooking(details) {
  const text = encodeURIComponent(buildWhatsAppBookingMessage(details))
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function saveBookingRequestLocal(payload) {
  try {
    const prev = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY) || '[]')
    const entry = { ...payload, savedAt: new Date().toISOString() }
    prev.unshift(entry)
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(prev.slice(0, 20)))
  } catch {
    /* ignore quota / private mode */
  }
}
