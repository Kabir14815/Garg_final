import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { GST_RATE, MIN_ORDER_VALUE } from '../data/shopData'
import { useMetalRates } from '../context/MetalRatesContext'
import { getProduct } from '../api/client'
import { openWhatsAppOrder } from '../utils/whatsappOrder'
import './ProductPage.css'

function calcPrice(product, rates) {
  const rate = (product.metalRate != null && product.metalRate > 0)
    ? product.metalRate
    : (product.category === 'gold' && product.purity === '24K' ? rates.gold24k
      : product.category === 'gold' && product.purity === '22K' ? rates.gold22k
      : product.category === 'gold' && product.purity === '18K' ? Math.round(rates.gold22k * 0.83)
      : product.category === 'silver' ? rates.silver
      : product.category === 'diamond' ? rates.diamondIndex
      : 0)
  const metalValue = product.category === 'diamond'
    ? (product.diamondWeight || 0) * rate
    : (product.weight || 0) * rate
  const making = product.makingCharges || 0
  const beforeGst = metalValue + making
  const gst = beforeGst * GST_RATE
  return {
    metalValue: Math.round(metalValue),
    makingCharges: making,
    gst: Math.round(gst),
    final: Math.round(beforeGst + gst),
    ratePerGram: rate,
  }
}

export default function ProductPage() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const { rates } = useMetalRates()
  const [deliveryMethod, setDeliveryMethod] = useState('Pickup')
  const [customerName, setCustomerName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    getProduct(productId)
      .then(setProduct)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) {
    return (
      <div className="product-page product-page--loading">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    )
  }
  if (notFound || !product) {
    return (
      <div className="product-page">
        <p>Product not found.</p>
        <Link to="/shop">Back to Shop</Link>
      </div>
    )
  }

  const price = calcPrice(product, rates)
  const canOrder = price.final >= MIN_ORDER_VALUE

  function handleWhatsAppOrder() {
    if (!canOrder) return
    openWhatsAppOrder({
      customerName: customerName || 'Customer',
      productName: product.name,
      weight: product.weight ? `${product.weight}g` : product.diamondWeight ? `${product.diamondWeight}ct` : '—',
      price: price.final.toLocaleString('en-IN'),
      contactNumber: contactNumber || '—',
      deliveryMethod,
    })
  }

  return (
    <div className="product-page">
      <motion.div
        className="product-layout"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4 }}
      >
        <div className="product-gallery">
          <div className="product-image-main">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} />
            ) : (
              <span className="product-image-placeholder">◆</span>
            )}
          </div>
        </div>
        <div className="product-detail">
          <Link to="/shop" className="product-back">← Back to Shop</Link>
          <h1 className="product-name">{product.name}</h1>
          <dl className="product-specs">
            {(product.weight || 0) > 0 && (
              <>
                <dt>Weight</dt>
                <dd>{product.weight} g</dd>
              </>
            )}
            {(product.diamondWeight || 0) > 0 && (
              <>
                <dt>Diamond weight</dt>
                <dd>{product.diamondWeight} ct</dd>
              </>
            )}
            {product.purity && (
              <>
                <dt>Metal purity</dt>
                <dd>{product.purity}</dd>
              </>
            )}
            <dt>Product type</dt>
            <dd>{product.type}</dd>
          </dl>

          <div className="product-pricing">
            <h3>Price breakdown</h3>
            <table className="price-table">
              <tbody>
                {price.ratePerGram > 0 && (
                  <tr>
                    <td>Current metal rate</td>
                    <td>₹{price.ratePerGram}/g</td>
                  </tr>
                )}
                {(product.weight || 0) > 0 && price.ratePerGram > 0 && (
                  <tr>
                    <td>Metal value ({product.weight}g × ₹{price.ratePerGram})</td>
                    <td>₹{price.metalValue.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                <tr>
                  <td>Making charges</td>
                  <td>₹{price.makingCharges.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>GST (3%)</td>
                  <td>₹{price.gst.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="price-final">
                  <td>Final price</td>
                  <td>₹{price.final.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
            <p className="price-formula">
              Final Price = (Metal Weight × Current Rate) + Making Charges + GST
            </p>
          </div>

          {!canOrder && (
            <div className="product-min-order-msg">
              Minimum order value is ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}. This item is below the minimum.
            </div>
          )}

          <div className="product-whatsapp-section">
            <h3>Order on WhatsApp</h3>
            <p className="product-whatsapp-desc">We'll send a pre-filled message to WhatsApp with your details.</p>
            <div className="whatsapp-fields">
              <input
                type="text"
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="whatsapp-input"
              />
              <input
                type="tel"
                placeholder="Contact number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="whatsapp-input"
              />
              <div className="delivery-options">
                <label>
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'Pickup'}
                    onChange={() => setDeliveryMethod('Pickup')}
                  />
                  Pickup
                </label>
                <label>
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'Visit Store'}
                    onChange={() => setDeliveryMethod('Visit Store')}
                  />
                  Visit Store
                </label>
              </div>
            </div>
            <button
              type="button"
              className="btn-whatsapp"
              onClick={handleWhatsAppOrder}
              disabled={!canOrder}
              title={!canOrder ? `Minimum order is ₹${MIN_ORDER_VALUE.toLocaleString('en-IN')}` : ''}
            >
              Order on WhatsApp
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
