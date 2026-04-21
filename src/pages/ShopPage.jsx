import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  METAL_TYPES,
  PURITIES,
  PRODUCT_TYPES,
  MIN_ORDER_VALUE,
  GST_RATE,
} from '../data/shopData'
import { useMetalRates } from '../context/MetalRatesContext'
import { getProducts } from '../api/client'
import './ShopPage.css'

function calcFinalPrice(product, rates) {
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
  return Math.round(beforeGst + gst)
}

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || ''
  const { rates } = useMetalRates()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [metalFilter, setMetalFilter] = useState('')
  const [purityFilter, setPurityFilter] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [weightMin, setWeightMin] = useState('')
  const [weightMax, setWeightMax] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message || 'Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = [...products]
    if (categoryParam) list = list.filter((p) => p.category === categoryParam)
    if (metalFilter) list = list.filter((p) => p.category.toLowerCase() === metalFilter.toLowerCase())
    if (purityFilter) list = list.filter((p) => p.purity === purityFilter)
    if (typeFilter) list = list.filter((p) => p.type === typeFilter)
    if (priceMin !== '') {
      const min = Number(priceMin)
      list = list.filter((p) => calcFinalPrice(p, rates) >= min)
    }
    if (priceMax !== '') {
      const max = Number(priceMax)
      list = list.filter((p) => calcFinalPrice(p, rates) <= max)
    }
    if (weightMin !== '') list = list.filter((p) => (p.weight || 0) >= Number(weightMin))
    if (weightMax !== '') list = list.filter((p) => (p.weight || 0) <= Number(weightMax))
    return list
  }, [products, categoryParam, metalFilter, purityFilter, typeFilter, priceMin, priceMax, weightMin, weightMax, rates])

  return (
    <div className="shop-page">
      <div className="shop-layout">
        <aside className="shop-filters">
          <h3>Filters</h3>
          <div className="filter-group">
            <label>Metal Type</label>
            <select value={metalFilter} onChange={(e) => setMetalFilter(e.target.value)}>
              <option value="">All</option>
              {METAL_TYPES.map((m) => (
                <option key={m} value={m.toLowerCase()}>{m}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Purity</label>
            <select value={purityFilter} onChange={(e) => setPurityFilter(e.target.value)}>
              <option value="">All</option>
              {PURITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Product Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Price Range (₹)</label>
            <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Weight (g)</label>
            <input type="number" placeholder="Min" value={weightMin} onChange={(e) => setWeightMin(e.target.value)} />
            <input type="number" placeholder="Max" value={weightMax} onChange={(e) => setWeightMax(e.target.value)} />
          </div>
          <p className="shop-min-order">Minimum order: ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}</p>
        </aside>
        <div className="shop-main">
          <h1 className="shop-title">Shop</h1>
          {loading && (
            <div className="shop-loading">
              <div className="loading-spinner" aria-hidden="true" />
              <p>Loading products…</p>
            </div>
          )}
          {error && <p className="shop-error" role="alert">{error}</p>}
          {!loading && !error && (
            <>
              <div className="shop-grid">
                {filtered.map((product, i) => {
                  const price = calcFinalPrice(product, rates)
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.3) }}
                    >
                      <Link
                        to={`/product/${product.id}`}
                        className="shop-card hover-lift"
                      >
                        <div className="shop-card-image">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} />
                        ) : (
                          <span className="shop-card-icon">◆</span>
                        )}
                      </div>
                      <div className="shop-card-body">
                        <h3>{product.name}</h3>
                        <p>{product.purity && `${product.purity} · `}{product.type} {product.weight ? `· ${product.weight}g` : ''}</p>
                        <p className="shop-card-price">₹{price.toLocaleString('en-IN')}</p>
                      </div>
                    </Link>
                    </motion.div>
                  )
                })}
              </div>
              {filtered.length === 0 && (
                <p className="shop-empty">No products match your filters.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
