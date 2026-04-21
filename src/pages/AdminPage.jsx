import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getMetalRates,
  updateMetalRates,
} from '../api/client'
import { useMetalRates } from '../context/MetalRatesContext'
import {
  METAL_TYPES,
  PURITIES,
  PRODUCT_TYPES,
} from '../data/shopData'
import './AdminPage.css'

const emptyProduct = {
  name: '',
  category: 'gold',
  weight: '',
  makingCharges: '',
  metalType: 'Gold',
  purity: '',
  type: 'Ring',
  diamondWeight: '',
  images: [],
}

export default function AdminPage() {
  const [tab, setTab] = useState('products') // 'products' | 'rates'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formProduct, setFormProduct] = useState(emptyProduct)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { rates, setRates, fetchRates } = useMetalRates()
  const [ratesForm, setRatesForm] = useState({ ...rates })
  const [ratesSaving, setRatesSaving] = useState(false)
  const [ratesMessage, setRatesMessage] = useState('')

  useEffect(() => {
    if (tab === 'rates') setRatesForm({ ...rates })
  }, [tab, rates])

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const loadProducts = () => {
    setLoading(true)
    getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    const payload = {
      ...formProduct,
      weight: Number(formProduct.weight) || 0,
      makingCharges: Number(formProduct.makingCharges) || 0,
      diamondWeight: formProduct.diamondWeight ? Number(formProduct.diamondWeight) : null,
      purity: formProduct.purity || null,
      images: Array.isArray(formProduct.images) ? formProduct.images : [],
    }
    try {
      if (editingId) {
        await updateProduct(editingId, payload)
        setEditingId(null)
      } else {
        await createProduct(payload)
        setShowAddForm(false)
      }
      setFormProduct(emptyProduct)
      loadProducts()
    } catch (err) {
      setError(err.message || 'Save failed')
    }
  }

  const handleEdit = (p) => {
    setEditingId(p.id)
    setFormProduct({
      name: p.name,
      category: p.category,
      weight: p.weight ?? '',
      makingCharges: p.makingCharges ?? '',
      metalType: p.metalType || p.metal_type || 'Gold',
      purity: p.purity ?? '',
      type: p.type || p.product_type || 'Ring',
      diamondWeight: p.diamondWeight ?? p.diamond_weight ?? '',
      images: p.images ?? [],
    })
  }

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id)
      setDeleteConfirm(null)
      loadProducts()
    } catch (err) {
      setError(err.message || 'Delete failed')
    }
  }

  const handleSaveRates = async (e) => {
    e.preventDefault()
    setRatesSaving(true)
    setRatesMessage('')
    try {
      const updated = await updateMetalRates(ratesForm)
      setRates(updated)
      await fetchRates()
      setRatesMessage('Rates updated. Product prices will reflect the new rates.')
      setError(null)
    } catch (err) {
      setRatesMessage(err.message || 'Failed to update rates')
    } finally {
      setRatesSaving(false)
    }
  }

  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className="admin-page"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35 }}
    >
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <Link to="/" className="admin-back">← Back to site</Link>
      </div>
      <nav className="admin-tabs">
        <button type="button" className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Product Management
        </button>
        <button type="button" className={tab === 'rates' ? 'active' : ''} onClick={() => setTab('rates')}>
          Metal Rate Management
        </button>
      </nav>

      {tab === 'products' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <h2>Products</h2>
            <button type="button" className="btn-primary" onClick={() => { setShowAddForm(true); setEditingId(null); setFormProduct(emptyProduct) }}>
              Add product
            </button>
          </div>
          {error && <p className="admin-error">{error}</p>}
          {showAddForm && (
            <form className="admin-form product-form" onSubmit={handleSaveProduct}>
              <h3>New product</h3>
              <div className="form-row">
                <label>Product name</label>
                <input value={formProduct.name} onChange={(e) => setFormProduct((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>Category</label>
                <select value={formProduct.category} onChange={(e) => setFormProduct((p) => ({ ...p, category: e.target.value }))}>
                  {['gold', 'silver', 'diamond', 'bronze'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Metal type</label>
                <select value={formProduct.metalType} onChange={(e) => setFormProduct((p) => ({ ...p, metalType: e.target.value }))}>
                  {METAL_TYPES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Product type</label>
                <select value={formProduct.type} onChange={(e) => setFormProduct((p) => ({ ...p, type: e.target.value }))}>
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {formProduct.category === 'gold' && (
                <div className="form-row">
                  <label>Purity</label>
                  <select value={formProduct.purity} onChange={(e) => setFormProduct((p) => ({ ...p, purity: e.target.value }))}>
                    <option value="">—</option>
                    {PURITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-row">
                <label>Weight (g)</label>
                <input type="number" step="0.01" value={formProduct.weight} onChange={(e) => setFormProduct((p) => ({ ...p, weight: e.target.value }))} />
              </div>
              {(formProduct.category === 'diamond') && (
                <div className="form-row">
                  <label>Diamond weight (ct)</label>
                  <input type="number" step="0.01" value={formProduct.diamondWeight} onChange={(e) => setFormProduct((p) => ({ ...p, diamondWeight: e.target.value }))} />
                </div>
              )}
              <div className="form-row">
                <label>Making charges (₹)</label>
                <input type="number" value={formProduct.makingCharges} onChange={(e) => setFormProduct((p) => ({ ...p, makingCharges: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Image URLs (one per line)</label>
                <textarea
                  value={(formProduct.images || []).join('\n')}
                  onChange={(e) => setFormProduct((p) => ({ ...p, images: e.target.value.split('\n').filter(Boolean) }))}
                  placeholder="https://..."
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={() => { setShowAddForm(false); setFormProduct(emptyProduct) }}>Cancel</button>
              </div>
            </form>
          )}
          {editingId && (
            <form className="admin-form product-form" onSubmit={handleSaveProduct}>
              <h3>Edit product</h3>
              <div className="form-row">
                <label>Product name</label>
                <input value={formProduct.name} onChange={(e) => setFormProduct((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label>Category</label>
                <select value={formProduct.category} onChange={(e) => setFormProduct((p) => ({ ...p, category: e.target.value }))}>
                  {['gold', 'silver', 'diamond', 'bronze'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Metal type</label>
                <select value={formProduct.metalType} onChange={(e) => setFormProduct((p) => ({ ...p, metalType: e.target.value }))}>
                  {METAL_TYPES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Product type</label>
                <select value={formProduct.type} onChange={(e) => setFormProduct((p) => ({ ...p, type: e.target.value }))}>
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {formProduct.category === 'gold' && (
                <div className="form-row">
                  <label>Purity</label>
                  <select value={formProduct.purity} onChange={(e) => setFormProduct((p) => ({ ...p, purity: e.target.value }))}>
                    <option value="">—</option>
                    {PURITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-row">
                <label>Weight (g)</label>
                <input type="number" step="0.01" value={formProduct.weight} onChange={(e) => setFormProduct((p) => ({ ...p, weight: e.target.value }))} />
              </div>
              {(formProduct.category === 'diamond') && (
                <div className="form-row">
                  <label>Diamond weight (ct)</label>
                  <input type="number" step="0.01" value={formProduct.diamondWeight} onChange={(e) => setFormProduct((p) => ({ ...p, diamondWeight: e.target.value }))} />
                </div>
              )}
              <div className="form-row">
                <label>Making charges (₹)</label>
                <input type="number" value={formProduct.makingCharges} onChange={(e) => setFormProduct((p) => ({ ...p, makingCharges: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Image URLs (one per line)</label>
                <textarea
                  value={(formProduct.images || []).join('\n')}
                  onChange={(e) => setFormProduct((p) => ({ ...p, images: e.target.value.split('\n').filter(Boolean) }))}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="submit">Update</button>
                <button type="button" onClick={() => { setEditingId(null); setFormProduct(emptyProduct) }}>Cancel</button>
              </div>
            </form>
          )}
          {loading && <p>Loading products…</p>}
          {!loading && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Metal</th>
                    <th>Weight</th>
                    <th>Making (₹)</th>
                    <th>Images</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td>{p.metalType} {p.purity && `(${p.purity})`}</td>
                      <td>{p.weight ? `${p.weight}g` : p.diamondWeight ? `${p.diamondWeight}ct` : '—'}</td>
                      <td>{p.makingCharges?.toLocaleString('en-IN')}</td>
                      <td>{(p.images || []).length}</td>
                      <td>
                        <button type="button" className="btn-sm" onClick={() => handleEdit(p)}>Edit</button>
                        {deleteConfirm === p.id ? (
                          <>
                            <button type="button" className="btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Confirm</button>
                            <button type="button" className="btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" className="btn-sm btn-danger" onClick={() => setDeleteConfirm(p.id)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'rates' && (
        <section className="admin-section">
          <h2>Metal rates</h2>
          <p className="admin-rates-desc">When you update these rates, all jewellery product prices on the site update automatically.</p>
          <form className="admin-form rates-form" onSubmit={handleSaveRates}>
            <div className="form-row">
              <label>Gold 24K (₹/g)</label>
              <input type="number" value={ratesForm.gold24k} onChange={(e) => setRatesForm((r) => ({ ...r, gold24k: Number(e.target.value) || 0 }))} />
            </div>
            <div className="form-row">
              <label>Gold 22K (₹/g)</label>
              <input type="number" value={ratesForm.gold22k} onChange={(e) => setRatesForm((r) => ({ ...r, gold22k: Number(e.target.value) || 0 }))} />
            </div>
            <div className="form-row">
              <label>Silver (₹/g)</label>
              <input type="number" value={ratesForm.silver} onChange={(e) => setRatesForm((r) => ({ ...r, silver: Number(e.target.value) || 0 }))} />
            </div>
            <div className="form-row">
              <label>Diamond (index ₹)</label>
              <input type="number" value={ratesForm.diamondIndex} onChange={(e) => setRatesForm((r) => ({ ...r, diamondIndex: Number(e.target.value) || 0 }))} />
            </div>
            <div className="form-row">
              <label>Bronze (₹/g, optional)</label>
              <input type="number" value={ratesForm.bronze ?? 0} onChange={(e) => setRatesForm((r) => ({ ...r, bronze: Number(e.target.value) || 0 }))} />
            </div>
            {ratesMessage && <p className={ratesSaving ? 'admin-msg' : (ratesMessage.includes('Failed') ? 'admin-error' : 'admin-msg success')}>{ratesMessage}</p>}
            <div className="form-actions">
              <button type="submit" disabled={ratesSaving}>{ratesSaving ? 'Saving…' : 'Update rates'}</button>
            </div>
          </form>
        </section>
      )}
    </motion.div>
  )
}
