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
