import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateMetalRates,
  uploadProductImage,
  getKittyPlans,
  createKittyPlan,
  updateKittyPlan,
  deleteKittyPlan,
  getKittyMembers,
  createKittyMember,
  updateKittyMember,
  addKittyPayment,
  deleteKittyMember,
} from '../api/client'
import { useMetalRates } from '../context/MetalRatesContext'
import { useAuth } from '../context/AuthContext'
import {
  METAL_TYPES,
  PURITIES,
  PRODUCT_TYPES,
} from '../data/shopData'
import './AdminPage.css'

// ─── Product image uploader ───────────────────────────────────────────────────

function AdminProductImages({ images, onChange, onError }) {
  const [uploading, setUploading] = useState(false)

  const pickFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    onError(null)
    try {
      const next = [...images]
      for (const file of files) {
        const { url } = await uploadProductImage(file)
        next.push(url)
      }
      onChange(next)
    } catch (err) {
      onError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="form-row admin-images-row">
      <label>Product images</label>
      <p className="admin-images-hint">Upload JPEG, PNG, WebP, or GIF — up to 5 MB per file. Select multiple at once.</p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        multiple
        disabled={uploading}
        className="admin-file-input"
        onChange={pickFiles}
      />
      {uploading && <p className="admin-images-status">Uploading…</p>}
      {images.length > 0 && (
        <ul className="admin-image-previews">
          {images.map((src, i) => (
            <li key={`${src}-${i}`} className="admin-image-preview">
              <img src={src} alt="" />
              <button
                type="button"
                className="admin-image-remove"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                aria-label="Remove image"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Shared product form (add + edit) ────────────────────────────────────────

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

function ProductForm({ title, initial, onSave, onCancel, formError, onFormError }) {
  const [form, setForm] = useState(initial || emptyProduct)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      weight: Number(form.weight) || 0,
      makingCharges: Number(form.makingCharges) || 0,
      diamondWeight: form.diamondWeight ? Number(form.diamondWeight) : null,
      purity: form.purity || null,
      images: Array.isArray(form.images) ? form.images : [],
    }
    await onSave(payload)
  }

  return (
    <form className="admin-form product-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {formError && <p className="admin-error">{formError}</p>}

      <div className="form-row">
        <label>Product name</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {['gold', 'silver', 'diamond', 'bronze'].map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Metal type</label>
          <select value={form.metalType} onChange={(e) => set('metalType', e.target.value)}>
            {METAL_TYPES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Product type</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {form.category === 'gold' && (
          <div className="form-row">
            <label>Purity</label>
            <select value={form.purity} onChange={(e) => set('purity', e.target.value)}>
              <option value="">—</option>
              {PURITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-row">
          <label>Weight (g)</label>
          <input type="number" step="0.01" min="0" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
        </div>
        {form.category === 'diamond' && (
          <div className="form-row">
            <label>Diamond weight (ct)</label>
            <input type="number" step="0.01" min="0" value={form.diamondWeight} onChange={(e) => set('diamondWeight', e.target.value)} />
          </div>
        )}
        <div className="form-row">
          <label>Making charges (₹)</label>
          <input type="number" min="0" value={form.makingCharges} onChange={(e) => set('makingCharges', e.target.value)} />
        </div>
      </div>

      <AdminProductImages
        images={form.images || []}
        onChange={(urls) => set('images', urls)}
        onError={onFormError}
      />
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save product</button>
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ─── Kitty Plan Form ─────────────────────────────────────────────────────────

const emptyPlan = {
  name: '',
  monthlyAmount: '',
  durationMonths: 11,
  bonusMonths: 1,
  description: '',
  isActive: true,
}

function KittyPlanForm({ title, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyPlan)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const totalRedeemable = (Number(form.monthlyAmount) || 0) * ((Number(form.durationMonths) || 0) + (Number(form.bonusMonths) || 0))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        ...form,
        monthlyAmount: Number(form.monthlyAmount),
        durationMonths: Number(form.durationMonths),
        bonusMonths: Number(form.bonusMonths),
      })
    } catch (e) {
      setErr(e.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form className="admin-form kitty-plan-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {err && <p className="admin-error">{err}</p>}
      <div className="form-row">
        <label>Plan name</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. Gold Savings – ₹2,000/mo" />
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Monthly amount (₹)</label>
          <input type="number" min="1" value={form.monthlyAmount} onChange={(e) => set('monthlyAmount', e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Duration (months)</label>
          <input type="number" min="1" max="60" value={form.durationMonths} onChange={(e) => set('durationMonths', e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Bonus months</label>
          <input type="number" min="0" max="12" value={form.bonusMonths} onChange={(e) => set('bonusMonths', e.target.value)} />
        </div>
      </div>
      <div className="kitty-plan-preview">
        <span>Total redeemable:</span>
        <strong>₹{totalRedeemable.toLocaleString('en-IN')}</strong>
      </div>
      <div className="form-row">
        <label>Description (optional)</label>
        <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div className="form-row form-row-inline">
        <input type="checkbox" id="plan-active" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
        <label htmlFor="plan-active">Active (open to new enrollments)</label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</button>
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ─── Kitty Member Form ───────────────────────────────────────────────────────

const emptyMember = {
  planId: '',
  name: '',
  phone: '',
  email: '',
  startDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

function KittyMemberForm({ title, initial, plans, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ...emptyMember, planId: plans[0]?.id || '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSave(form)
    } catch (e) {
      setErr(e.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form className="admin-form kitty-member-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {err && <p className="admin-error">{err}</p>}
      <div className="form-row">
        <label>Plan</label>
        <select value={form.planId} onChange={(e) => set('planId', e.target.value)} required>
          <option value="">Select a plan…</option>
          {plans.filter((p) => p.isActive).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>Customer name</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Email (optional)</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="form-row">
          <label>Start date</label>
          <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
        </div>
      </div>
      <div className="form-row">
        <label>Notes (optional)</label>
        <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Enroll member'}</button>
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ─── Payment modal ───────────────────────────────────────────────────────────

function PaymentModal({ member, plan, onClose, onPaid }) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(currentMonth)
  const [amount, setAmount] = useState(plan?.monthlyAmount || '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onPaid(member.id, month, Number(amount) || null, note)
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to record payment')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Payment</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>
        <p className="modal-subtitle">{member.name} — {plan?.name}</p>
        {err && <p className="admin-error">{err}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Amount (₹)</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cash payment" />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status}</span>
}

// ─── Payment Progress Bar ─────────────────────────────────────────────────────

function PaymentProgress({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
  return (
    <div className="payment-progress" title={`${paid}/${total} months paid`}>
      <div className="payment-progress-bar" style={{ width: `${pct}%` }} />
      <span className="payment-progress-label">{paid}/{total}</span>
    </div>
  )
}

// ─── Kitty Stats ──────────────────────────────────────────────────────────────

function KittyStats({ members, plans }) {
  const total = members.length
  const active = members.filter((m) => m.status === 'active').length
  const completed = members.filter((m) => m.status === 'completed').length
  const totalSavings = members.reduce((sum, m) => {
    const plan = plans.find((p) => p.id === m.planId)
    return sum + (plan?.monthlyAmount || 0) * m.paymentsMade
  }, 0)

  return (
    <div className="kitty-stats">
      <div className="kitty-stat-card">
        <div className="kitty-stat-value">{total}</div>
        <div className="kitty-stat-label">Total Members</div>
      </div>
      <div className="kitty-stat-card kitty-stat-active">
        <div className="kitty-stat-value">{active}</div>
        <div className="kitty-stat-label">Active</div>
      </div>
      <div className="kitty-stat-card kitty-stat-completed">
        <div className="kitty-stat-value">{completed}</div>
        <div className="kitty-stat-label">Completed</div>
      </div>
      <div className="kitty-stat-card kitty-stat-savings">
        <div className="kitty-stat-value">₹{totalSavings.toLocaleString('en-IN')}</div>
        <div className="kitty-stat-label">Total Collected</div>
      </div>
    </div>
  )
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, logout } = useAuth()
  const reduceMotion = useReducedMotion()
  const [tab, setTab] = useState('products')

  // ── Products ──
  const [products, setProducts] = useState([])
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState(null)
  const [formMode, setFormMode] = useState(null) // null | 'add' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Metal Rates ──
  const { rates, setRates, fetchRates } = useMetalRates()
  const [ratesForm, setRatesForm] = useState({ ...rates })
  const [ratesSaving, setRatesSaving] = useState(false)
  const [ratesMessage, setRatesMessage] = useState('')

  // ── Kitty ──
  const [kittyTab, setKittyTab] = useState('members')
  const [kittyPlans, setKittyPlans] = useState([])
  const [kittyMembers, setKittyMembers] = useState([])
  const [kittyLoading, setKittyLoading] = useState(false)
  const [kittyError, setKittyError] = useState(null)
  const [kittyFormMode, setKittyFormMode] = useState(null) // null | 'addPlan' | 'editPlan' | 'addMember' | 'editMember'
  const [editingPlan, setEditingPlan] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [kittyDeleteConfirm, setKittyDeleteConfirm] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  // ── Load products ──
  const loadProducts = useCallback(() => {
    setProductLoading(true)
    getProducts()
      .then(setProducts)
      .catch((e) => setProductError(e.message || 'Failed to load products'))
      .finally(() => setProductLoading(false))
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // ── Load kitty data ──
  const loadKitty = useCallback(() => {
    setKittyLoading(true)
    setKittyError(null)
    Promise.all([getKittyPlans(), getKittyMembers()])
      .then(([plans, members]) => { setKittyPlans(plans); setKittyMembers(members) })
      .catch((e) => setKittyError(e.message || 'Failed to load kitty data'))
      .finally(() => setKittyLoading(false))
  }, [])

  useEffect(() => { if (tab === 'kitty') loadKitty() }, [tab, loadKitty])

  useEffect(() => { if (tab === 'rates') setRatesForm({ ...rates }) }, [tab, rates])

  // ── Product handlers ──
  const handleSaveProduct = async (payload) => {
    try {
      if (formMode === 'edit' && editingProduct) {
        await updateProduct(editingProduct.id, payload)
      } else {
        await createProduct(payload)
      }
      setFormMode(null)
      setEditingProduct(null)
      setProductError(null)
      loadProducts()
    } catch (err) {
      throw err
    }
  }

  const handleEditProduct = (p) => {
    setEditingProduct(p)
    setFormMode('edit')
  }

  const handleDeleteProduct = async (id) => {
    try {
      await deleteProduct(id)
      setDeleteConfirm(null)
      loadProducts()
    } catch (err) {
      setProductError(err.message || 'Delete failed')
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
      setRatesMessage('Rates updated successfully.')
    } catch (err) {
      setRatesMessage(err.message || 'Failed to update rates')
    } finally {
      setRatesSaving(false)
    }
  }

  // ── Kitty plan handlers ──
  const handleSavePlan = async (plan) => {
    if (kittyFormMode === 'editPlan' && editingPlan) {
      await updateKittyPlan(editingPlan.id, plan)
    } else {
      await createKittyPlan(plan)
    }
    setKittyFormMode(null)
    setEditingPlan(null)
    loadKitty()
  }

  const handleDeletePlan = async (id) => {
    try {
      await deleteKittyPlan(id)
      setKittyDeleteConfirm(null)
      loadKitty()
    } catch (err) {
      setKittyError(err.message || 'Delete failed')
    }
  }

  // ── Kitty member handlers ──
  const handleSaveMember = async (member) => {
    if (kittyFormMode === 'editMember' && editingMember) {
      await updateKittyMember(editingMember.id, member)
    } else {
      await createKittyMember(member)
    }
    setKittyFormMode(null)
    setEditingMember(null)
    loadKitty()
  }

  const handleAddPayment = async (memberId, month, amount, note) => {
    await addKittyPayment(memberId, month, amount, note)
    loadKitty()
  }

  const handleMarkRedeemed = async (member) => {
    const today = new Date().toISOString().slice(0, 10)
    await updateKittyMember(member.id, { status: 'completed', redemptionDate: today })
    loadKitty()
  }

  const handleCancelMember = async (member) => {
    await updateKittyMember(member.id, { status: 'cancelled' })
    loadKitty()
  }

  const handleDeleteMember = async (id) => {
    try {
      await deleteKittyMember(id)
      setKittyDeleteConfirm(null)
      loadKitty()
    } catch (err) {
      setKittyError(err.message || 'Delete failed')
    }
  }

  const filteredMembers = statusFilter === 'all'
    ? kittyMembers
    : kittyMembers.filter((m) => m.status === statusFilter)

  // ── Render ──
  return (
    <motion.div
      className="admin-page"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
    >
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo-mark">G</div>
          <div>
            <h1>Admin Dashboard</h1>
            <p className="admin-welcome">Welcome back, {user?.name || user?.email}</p>
          </div>
        </div>
        <div className="admin-header-right">
          <Link to="/" className="admin-back">← Back to site</Link>
          <button type="button" className="btn-outline btn-sm-pad" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="admin-tabs">
        <button type="button" className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          <span className="tab-icon">📦</span> Products
        </button>
        <button type="button" className={tab === 'rates' ? 'active' : ''} onClick={() => setTab('rates')}>
          <span className="tab-icon">📈</span> Metal Rates
        </button>
        <button type="button" className={tab === 'kitty' ? 'active' : ''} onClick={() => setTab('kitty')}>
          <span className="tab-icon">🪙</span> Kitty Scheme
        </button>
      </nav>

      {/* ── Products Tab ── */}
      {tab === 'products' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Products</h2>
              <p className="admin-section-sub">{products.length} products in catalogue</p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => { setFormMode('add'); setEditingProduct(null) }}
              disabled={formMode !== null}
            >
              + Add product
            </button>
          </div>

          {productError && <p className="admin-error">{productError}</p>}

          {formMode === 'add' && (
            <ProductForm
              title="New product"
              initial={emptyProduct}
              onSave={handleSaveProduct}
              onCancel={() => { setFormMode(null); setProductError(null) }}
              formError={null}
              onFormError={setProductError}
            />
          )}

          {formMode === 'edit' && editingProduct && (
            <ProductForm
              title={`Edit: ${editingProduct.name}`}
              initial={{
                name: editingProduct.name,
                category: editingProduct.category,
                weight: editingProduct.weight ?? '',
                makingCharges: editingProduct.makingCharges ?? '',
                metalType: editingProduct.metalType || 'Gold',
                purity: editingProduct.purity ?? '',
                type: editingProduct.type || 'Ring',
                diamondWeight: editingProduct.diamondWeight ?? '',
                images: editingProduct.images ?? [],
              }}
              onSave={handleSaveProduct}
              onCancel={() => { setFormMode(null); setEditingProduct(null); setProductError(null) }}
              formError={null}
              onFormError={setProductError}
            />
          )}

          {productLoading ? (
            <div className="admin-loading">Loading products…</div>
          ) : products.length === 0 ? (
            <div className="admin-empty">No products yet. Add your first product above.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Metal / Purity</th>
                    <th>Weight</th>
                    <th>Making (₹)</th>
                    <th>Images</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className={formMode === 'edit' && editingProduct?.id === p.id ? 'row-editing' : ''}>
                      <td className="td-name">{p.name}</td>
                      <td><span className={`category-pill cat-${p.category}`}>{p.category}</span></td>
                      <td>{p.metalType}{p.purity ? ` (${p.purity})` : ''}</td>
                      <td>{p.weight ? `${p.weight}g` : p.diamondWeight ? `${p.diamondWeight}ct` : '—'}</td>
                      <td>₹{(p.makingCharges || 0).toLocaleString('en-IN')}</td>
                      <td>{(p.images || []).length}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => handleEditProduct(p)}
                          disabled={formMode !== null}
                        >Edit</button>
                        {deleteConfirm === p.id ? (
                          <>
                            <button type="button" className="btn-sm btn-danger" onClick={() => handleDeleteProduct(p.id)}>Confirm</button>
                            <button type="button" className="btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" className="btn-sm btn-danger" onClick={() => setDeleteConfirm(p.id)} disabled={formMode !== null}>Delete</button>
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

      {/* ── Metal Rates Tab ── */}
      {tab === 'rates' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Metal Rates</h2>
              <p className="admin-section-sub">Changes here instantly update all product prices on the site.</p>
            </div>
          </div>
          <form className="admin-form rates-form" onSubmit={handleSaveRates}>
            <div className="rates-grid">
              <div className="form-row">
                <label>Gold 24K (₹/g)</label>
                <input
                  type="number"
                  value={ratesForm.gold24k}
                  onChange={(e) => setRatesForm((r) => ({ ...r, gold24k: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-row">
                <label>Gold 22K (₹/g)</label>
                <input
                  type="number"
                  value={ratesForm.gold22k}
                  onChange={(e) => setRatesForm((r) => ({ ...r, gold22k: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-row">
                <label>Silver (₹/g)</label>
                <input
                  type="number"
                  value={ratesForm.silver}
                  onChange={(e) => setRatesForm((r) => ({ ...r, silver: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-row">
                <label>Diamond index (₹)</label>
                <input
                  type="number"
                  value={ratesForm.diamondIndex}
                  onChange={(e) => setRatesForm((r) => ({ ...r, diamondIndex: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-row">
                <label>Bronze (₹/g)</label>
                <input
                  type="number"
                  value={ratesForm.bronze ?? 0}
                  onChange={(e) => setRatesForm((r) => ({ ...r, bronze: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            {ratesMessage && (
              <p className={ratesMessage.toLowerCase().includes('fail') ? 'admin-error' : 'admin-msg success'}>
                {ratesMessage}
              </p>
            )}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={ratesSaving}>
                {ratesSaving ? 'Saving…' : 'Update rates'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Kitty Tab ── */}
      {tab === 'kitty' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Kitty Savings Scheme</h2>
              <p className="admin-section-sub">Manage monthly savings plans and enrolled customers.</p>
            </div>
          </div>

          {kittyError && <p className="admin-error">{kittyError}</p>}
          {kittyLoading && <div className="admin-loading">Loading kitty data…</div>}

          {!kittyLoading && (
            <>
              <KittyStats members={kittyMembers} plans={kittyPlans} />

              {/* Kitty sub-tabs */}
              <nav className="admin-sub-tabs">
                <button type="button" className={kittyTab === 'members' ? 'active' : ''} onClick={() => setKittyTab('members')}>
                  Members ({kittyMembers.length})
                </button>
                <button type="button" className={kittyTab === 'plans' ? 'active' : ''} onClick={() => setKittyTab('plans')}>
                  Plans ({kittyPlans.length})
                </button>
              </nav>

              {/* ─ Plans sub-tab ─ */}
              {kittyTab === 'plans' && (
                <div>
                  <div className="kitty-sub-header">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => { setKittyFormMode('addPlan'); setEditingPlan(null) }}
                      disabled={kittyFormMode !== null}
                    >
                      + Add plan
                    </button>
                  </div>

                  {kittyFormMode === 'addPlan' && (
                    <KittyPlanForm
                      title="New plan"
                      onSave={handleSavePlan}
                      onCancel={() => { setKittyFormMode(null) }}
                    />
                  )}
                  {kittyFormMode === 'editPlan' && editingPlan && (
                    <KittyPlanForm
                      title={`Edit: ${editingPlan.name}`}
                      initial={{
                        name: editingPlan.name,
                        monthlyAmount: editingPlan.monthlyAmount,
                        durationMonths: editingPlan.durationMonths,
                        bonusMonths: editingPlan.bonusMonths,
                        description: editingPlan.description,
                        isActive: editingPlan.isActive,
                      }}
                      onSave={handleSavePlan}
                      onCancel={() => { setKittyFormMode(null); setEditingPlan(null) }}
                    />
                  )}

                  <div className="kitty-plans-grid">
                    {kittyPlans.length === 0 && (
                      <p className="admin-empty">No plans yet. Create your first savings plan.</p>
                    )}
                    {kittyPlans.map((plan) => (
                      <div key={plan.id} className={`kitty-plan-card ${!plan.isActive ? 'plan-inactive' : ''}`}>
                        <div className="plan-card-header">
                          <h4>{plan.name}</h4>
                          {plan.isActive
                            ? <span className="status-badge status-active">active</span>
                            : <span className="status-badge status-cancelled">inactive</span>
                          }
                        </div>
                        <div className="plan-card-amounts">
                          <div className="plan-amount-item">
                            <span>Monthly</span>
                            <strong>₹{plan.monthlyAmount.toLocaleString('en-IN')}</strong>
                          </div>
                          <div className="plan-amount-item">
                            <span>Duration</span>
                            <strong>{plan.durationMonths} mo + {plan.bonusMonths} bonus</strong>
                          </div>
                          <div className="plan-amount-item plan-total">
                            <span>Total redeemable</span>
                            <strong>₹{plan.totalRedeemable.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                        {plan.description && <p className="plan-desc">{plan.description}</p>}
                        <div className="plan-card-actions">
                          <button
                            type="button"
                            className="btn-sm"
                            onClick={() => { setEditingPlan(plan); setKittyFormMode('editPlan') }}
                            disabled={kittyFormMode !== null}
                          >Edit</button>
                          {kittyDeleteConfirm === plan.id ? (
                            <>
                              <button type="button" className="btn-sm btn-danger" onClick={() => handleDeletePlan(plan.id)}>Confirm delete</button>
                              <button type="button" className="btn-sm" onClick={() => setKittyDeleteConfirm(null)}>Cancel</button>
                            </>
                          ) : (
                            <button type="button" className="btn-sm btn-danger" onClick={() => setKittyDeleteConfirm(plan.id)} disabled={kittyFormMode !== null}>Delete</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─ Members sub-tab ─ */}
              {kittyTab === 'members' && (
                <div>
                  <div className="kitty-sub-header">
                    <div className="kitty-filters">
                      {['all', 'active', 'completed', 'cancelled'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                          onClick={() => setStatusFilter(s)}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                          <span className="filter-count">
                            {s === 'all' ? kittyMembers.length : kittyMembers.filter((m) => m.status === s).length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => { setKittyFormMode('addMember'); setEditingMember(null) }}
                      disabled={kittyFormMode !== null || kittyPlans.filter((p) => p.isActive).length === 0}
                    >
                      + Enroll member
                    </button>
                  </div>

                  {kittyFormMode === 'addMember' && (
                    <KittyMemberForm
                      title="Enroll new member"
                      plans={kittyPlans}
                      onSave={handleSaveMember}
                      onCancel={() => setKittyFormMode(null)}
                    />
                  )}
                  {kittyFormMode === 'editMember' && editingMember && (
                    <KittyMemberForm
                      title={`Edit: ${editingMember.name}`}
                      initial={{
                        planId: editingMember.planId,
                        name: editingMember.name,
                        phone: editingMember.phone,
                        email: editingMember.email,
                        startDate: editingMember.startDate,
                        notes: editingMember.notes,
                      }}
                      plans={kittyPlans}
                      onSave={handleSaveMember}
                      onCancel={() => { setKittyFormMode(null); setEditingMember(null) }}
                    />
                  )}

                  {filteredMembers.length === 0 && !kittyFormMode && (
                    <div className="admin-empty">
                      {statusFilter === 'all' ? 'No members enrolled yet.' : `No ${statusFilter} members.`}
                    </div>
                  )}

                  {filteredMembers.length > 0 && (
                    <div className="admin-table-wrap">
                      <table className="admin-table kitty-member-table">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Plan</th>
                            <th>Progress</th>
                            <th>Since</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMembers.map((m) => {
                            const plan = kittyPlans.find((p) => p.id === m.planId)
                            return (
                              <tr key={m.id}>
                                <td>
                                  <div className="member-name">{m.name}</div>
                                  <div className="member-contact">{m.phone}{m.email ? ` · ${m.email}` : ''}</div>
                                </td>
                                <td>
                                  <div>{plan?.name || '—'}</div>
                                  {plan && <div className="member-plan-amount">₹{plan.monthlyAmount.toLocaleString('en-IN')}/mo</div>}
                                </td>
                                <td>
                                  <PaymentProgress paid={m.paymentsMade} total={m.planDuration} />
                                </td>
                                <td>{m.startDate}</td>
                                <td><StatusBadge status={m.status} /></td>
                                <td>
                                  <div className="member-actions">
                                    {m.status === 'active' && (
                                      <button
                                        type="button"
                                        className="btn-sm btn-pay"
                                        onClick={() => setPaymentTarget(m)}
                                      >
                                        + Payment
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="btn-sm"
                                      onClick={() => { setEditingMember(m); setKittyFormMode('editMember') }}
                                      disabled={kittyFormMode !== null}
                                    >Edit</button>
                                    {m.status === 'active' && (
                                      <button
                                        type="button"
                                        className="btn-sm btn-success"
                                        onClick={() => handleMarkRedeemed(m)}
                                      >Redeem</button>
                                    )}
                                    {m.status === 'active' && (
                                      <button
                                        type="button"
                                        className="btn-sm btn-warn"
                                        onClick={() => handleCancelMember(m)}
                                      >Cancel</button>
                                    )}
                                    {kittyDeleteConfirm === m.id ? (
                                      <>
                                        <button type="button" className="btn-sm btn-danger" onClick={() => handleDeleteMember(m.id)}>Confirm</button>
                                        <button type="button" className="btn-sm" onClick={() => setKittyDeleteConfirm(null)}>No</button>
                                      </>
                                    ) : (
                                      <button type="button" className="btn-sm btn-danger" onClick={() => setKittyDeleteConfirm(m.id)}>Delete</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Payment Modal */}
      {paymentTarget && (
        <PaymentModal
          member={paymentTarget}
          plan={kittyPlans.find((p) => p.id === paymentTarget.planId)}
          onClose={() => setPaymentTarget(null)}
          onPaid={handleAddPayment}
        />
      )}
    </motion.div>
  )
}
