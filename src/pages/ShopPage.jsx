import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  PURITIES,
  MIN_ORDER_VALUE,
  GST_RATE,
} from '../data/shopData'
import { useMetalRates } from '../context/MetalRatesContext'
import { getProducts, getCategoryTree } from '../api/client'
import './ShopPage.css'

function calcFinalPrice(product, rates) {
  const rate = (product.metalRate != null && product.metalRate > 0)
    ? product.metalRate
    : (product.category === 'gold' && product.purity === '24K' ? rates.gold24k
      : product.category === 'gold' && product.purity === '22K' ? rates.gold22k
      : product.category === 'gold' && product.purity === '18K' ? Math.round(rates.gold22k * 0.83)
      : product.category === 'gold' && product.purity === '14K' ? Math.round(rates.gold24k * (14 / 24))
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

function productInCategory(product, categoryId) {
  if (!categoryId) return true
  if (product.categoryId === categoryId) return true
  return Array.isArray(product.categoryAncestors) && product.categoryAncestors.includes(categoryId)
}

function normalizePurity(raw) {
  if (!raw) return ''
  const u = raw.toUpperCase()
  if (u.endsWith('K')) return u
  if (/^\d+$/.test(u)) return `${u}K`
  return u
}

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || ''
  const categoryIdParam = searchParams.get('categoryId') || ''
  const purityParam = searchParams.get('purity') || ''
  const { rates } = useMetalRates()
  const [products, setProducts] = useState([])
  const [categoryTree, setCategoryTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [metalFilter, setMetalFilter] = useState('')
  const [categoryIdFilter, setCategoryIdFilter] = useState(categoryIdParam)
  const [purityFilter, setPurityFilter] = useState(normalizePurity(purityParam))
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [weightMin, setWeightMin] = useState('')
  const [weightMax, setWeightMax] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    Promise.all([getProducts(), getCategoryTree(true)])
      .then(([prods, tree]) => {
        setProducts(prods)
        setCategoryTree(tree || [])
      })
      .catch((e) => setError(e.message || 'Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setCategoryIdFilter(categoryIdParam)
  }, [categoryIdParam])

  const rootCategories = categoryTree
  const subgroupOptions = useMemo(() => {
    if (!metalFilter && !categoryParam) return []
    const key = metalFilter || categoryParam
    const root = rootCategories.find(
      (c) => c.slug === key || (c.name || '').toLowerCase() === key.toLowerCase()
    )
    return root?.children || []
  }, [rootCategories, metalFilter, categoryParam])

  const filtered = useMemo(() => {
    let list = [...products]
    if (categoryIdFilter) {
      list = list.filter((p) => productInCategory(p, categoryIdFilter))
    } else if (categoryParam) {
      list = list.filter((p) => p.category === categoryParam)
    }
    if (metalFilter) list = list.filter((p) => p.category.toLowerCase() === metalFilter.toLowerCase())
    if (purityFilter) {
      const normalized = normalizePurity(purityFilter)
      list = list.filter((p) => p.purity === normalized)
    }
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
  }, [products, categoryParam, categoryIdFilter, metalFilter, purityFilter, typeFilter, priceMin, priceMax, weightMin, weightMax, rates])

  return (
    <div className="shop-page">
      <div className="shop-layout">
        <aside className="shop-filters">
          <h3>Filters</h3>
          <div className="filter-group">
            <label>Category</label>
            <select
              value={metalFilter}
              onChange={(e) => {
                setMetalFilter(e.target.value)
                setCategoryIdFilter('')
                setTypeFilter('')
              }}
            >
              <option value="">All</option>
              {rootCategories.map((m) => (
                <option key={m.id} value={m.slug || m.name.toLowerCase()}>{m.name}</option>
              ))}
            </select>
          </div>
          {subgroupOptions.length > 0 && (
            <div className="filter-group">
              <label>Subgroup</label>
              <select
                value={categoryIdFilter}
                onChange={(e) => {
                  setCategoryIdFilter(e.target.value)
                  const node = subgroupOptions.find((n) => n.id === e.target.value)
                  if (node) setTypeFilter(node.name)
                  else setTypeFilter('')
                }}
              >
                <option value="">All</option>
                {subgroupOptions.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          )}
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
            <label>Price min (₹)</label>
            <input type="number" min="0" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0" />
          </div>
          <div className="filter-group">
            <label>Price max (₹)</label>
            <input type="number" min="0" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Any" />
          </div>
          <div className="filter-group">
            <label>Weight min (g)</label>
            <input type="number" min="0" step="0.01" value={weightMin} onChange={(e) => setWeightMin(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Weight max (g)</label>
            <input type="number" min="0" step="0.01" value={weightMax} onChange={(e) => setWeightMax(e.target.value)} />
          </div>
          <p className="filter-note">Min order ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}</p>
        </aside>

        <div className="shop-results">
          {loading && <p>Loading…</p>}
          {error && <p className="shop-error">{error}</p>}
          {!loading && !error && (
            <>
              <p className="shop-count">{filtered.length} pieces</p>
              <div className="shop-grid">
                {filtered.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduceMotion ? 0 : Math.min(i * 0.03, 0.3) }}
                  >
                    <Link to={`/shop/${product.id}`} className="shop-card">
                      <div className="shop-card-image">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} loading="lazy" />
                        ) : (
                          <div className="shop-card-placeholder">G</div>
                        )}
                      </div>
                      <div className="shop-card-body">
                        <h3>{product.name}</h3>
                        <p>{product.purity && `${product.purity} · `}{product.type} {product.weight ? `· ${product.weight}g` : ''}</p>
                        <strong>₹{calcFinalPrice(product, rates).toLocaleString('en-IN')}</strong>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
