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
  getAdminEnrollments,
  getAdminEnrollmentStats,
  getAdminEnrollmentDetail,
  approveEnrollment,
  rejectEnrollment,
  cancelEnrollment,
  createInstallment,
  updateInstallment,
  createWithdrawal,
  updateWithdrawalStatus,
  getAdminWithdrawals,
  sendAdminNotification,
  getAdminNotifications,
  getAdminCategoryTree,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../api/client'
import { useMetalRates } from '../context/MetalRatesContext'
import { useAuth } from '../context/AuthContext'
import {
  PURITIES,
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

// ─── Category helpers ────────────────────────────────────────────────────────

function findCategoryPath(tree, targetId, path = []) {
  if (!targetId || !Array.isArray(tree)) return null
  for (const node of tree) {
    const next = [...path, node]
    if (node.id === targetId) return next
    if (node.children?.length) {
      const found = findCategoryPath(node.children, targetId, next)
      if (found) return found
    }
  }
  return null
}

// ─── Category tree editor ────────────────────────────────────────────────────

function CategoryNodeRow({ node, depth, onAddChild, onRename, onToggle, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(node.name)
  const [adding, setAdding] = useState(false)
  const [childName, setChildName] = useState('')

  const saveRename = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === node.name) {
      setEditing(false)
      setName(node.name)
      return
    }
    await onRename(node.id, trimmed)
    setEditing(false)
  }

  const saveChild = async () => {
    const trimmed = childName.trim()
    if (!trimmed) return
    await onAddChild(node.id, trimmed)
    setChildName('')
    setAdding(false)
  }

  return (
    <div className="category-node" style={{ marginLeft: depth * 18 }}>
      <div className={`category-node-row ${node.is_active === false ? 'inactive' : ''}`}>
        <span className="category-depth-mark">{depth === 0 ? '◆' : '↳'}</span>
        {editing ? (
          <>
            <input
              className="category-inline-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveRename()}
              autoFocus
            />
            <button type="button" className="btn-primary btn-sm-pad" onClick={saveRename}>Save</button>
            <button type="button" className="btn-outline btn-sm-pad" onClick={() => { setEditing(false); setName(node.name) }}>Cancel</button>
          </>
        ) : (
          <>
            <strong>{node.name}</strong>
            <span className="category-slug">/{node.slug}</span>
            <div className="category-node-actions">
              <button type="button" className="btn-outline btn-sm-pad" onClick={() => setEditing(true)}>Rename</button>
              <button type="button" className="btn-outline btn-sm-pad" onClick={() => setAdding((v) => !v)}>+ Sub</button>
              <button type="button" className="btn-outline btn-sm-pad" onClick={() => onToggle(node)}>
                {node.is_active === false ? 'Activate' : 'Deactivate'}
              </button>
              <button type="button" className="btn-danger btn-sm-pad" onClick={() => onDelete(node)}>Delete</button>
            </div>
          </>
        )}
      </div>
      {adding && (
        <div className="category-add-row" style={{ marginLeft: 18 }}>
          <input
            className="category-inline-input"
            placeholder="New subcategory name"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveChild()}
            autoFocus
          />
          <button type="button" className="btn-primary btn-sm-pad" onClick={saveChild}>Add</button>
          <button type="button" className="btn-outline btn-sm-pad" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}
      {(node.children || []).map((child) => (
        <CategoryNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onAddChild={onAddChild}
          onRename={onRename}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function CategoryTreeEditor() {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rootName, setRootName] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getAdminCategoryTree(true)
      .then(setTree)
      .catch((e) => setError(e.message || 'Failed to load categories'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAddRoot = async () => {
    const trimmed = rootName.trim()
    if (!trimmed) return
    try {
      await createCategory({ name: trimmed, parentId: null })
      setRootName('')
      load()
    } catch (e) {
      setError(e.message || 'Failed to create category')
    }
  }

  const handleAddChild = async (parentId, name) => {
    await createCategory({ name, parentId })
    load()
  }

  const handleRename = async (id, name) => {
    await updateCategory(id, { name })
    load()
  }

  const handleToggle = async (node) => {
    await updateCategory(node.id, { isActive: node.is_active === false })
    load()
  }

  const handleDelete = async (node) => {
    if (!window.confirm(`Delete "${node.name}"? This only works if it has no children or products.`)) return
    try {
      await deleteCategory(node.id)
      load()
    } catch (e) {
      setError(e.message || 'Delete failed')
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2>Categories</h2>
          <p className="admin-section-sub">
            Build nested groups (e.g. Gold → Women Collection → Rings). Products pick a leaf from this tree.
          </p>
        </div>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <div className="category-add-root">
        <input
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
          placeholder="New top-level category (e.g. Gold)"
          onKeyDown={(e) => e.key === 'Enter' && handleAddRoot()}
        />
        <button type="button" className="btn-primary" onClick={handleAddRoot} disabled={!rootName.trim()}>
          + Add root
        </button>
      </div>
      {loading ? (
        <p className="admin-muted">Loading categories…</p>
      ) : tree.length === 0 ? (
        <p className="admin-muted">No categories yet. Add a root category to get started.</p>
      ) : (
        <div className="category-tree">
          {tree.map((node) => (
            <CategoryNodeRow
              key={node.id}
              node={node}
              depth={0}
              onAddChild={handleAddChild}
              onRename={handleRename}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
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
  categoryId: '',
  categoryAncestors: [],
}

function ProductCategoryPicker({ tree, valueId, onChange }) {
  const path = findCategoryPath(tree, valueId) || []
  const levels = []
  let nodes = tree || []
  for (let i = 0; ; i++) {
    if (!nodes.length && i === 0) break
    levels.push({
      options: nodes,
      selectedId: path[i]?.id || '',
    })
    const selected = nodes.find((n) => n.id === (path[i]?.id || ''))
    if (!selected || !(selected.children || []).length) break
    nodes = selected.children
  }
  // Always show one empty next level if current selection has children already handled;
  // if nothing selected at a level that has options, stop.
  if (path.length && (path[path.length - 1].children || []).length) {
    levels.push({ options: path[path.length - 1].children, selectedId: '' })
  } else if (!path.length && (tree || []).length) {
    // only roots shown
  }

  const setLevel = (levelIndex, id) => {
    if (!id) {
      // Clear from this level down
      const parent = path[levelIndex - 1]
      onChange(parent || null)
      return
    }
    const options = levels[levelIndex]?.options || []
    const node = options.find((n) => n.id === id)
    if (node) onChange(node)
  }

  return (
    <div className="category-cascade">
      {levels.map((level, idx) => (
        <div className="form-row" key={`cat-level-${idx}`}>
          <label>{idx === 0 ? 'Category' : `Subgroup ${idx}`}</label>
          <select
            value={level.selectedId}
            onChange={(e) => setLevel(idx, e.target.value)}
            required={idx === 0}
          >
            <option value="">Select…</option>
            {level.options.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>
      ))}
      {path.length > 0 && (
        <p className="form-hint-inline">
          Selected path: {path.map((p) => p.name).join(' → ')}
        </p>
      )}
    </div>
  )
}

function ProductForm({ title, initial, onSave, onCancel, formError, onFormError }) {
  const [form, setForm] = useState(initial || emptyProduct)
  const [tree, setTree] = useState([])

  useEffect(() => {
    getCategoryTree(true).then(setTree).catch(() => setTree([]))
  }, [])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleCategoryPick = (node) => {
    if (!node) {
      setForm((f) => ({ ...f, categoryId: '', categoryAncestors: [] }))
      return
    }
    const path = findCategoryPath(tree, node.id) || [node]
    const root = path[0]
    const leaf = path[path.length - 1]
    const metalSlug = (root?.slug || root?.name || 'gold').toLowerCase()
    const metalName = root?.name || 'Gold'
    setForm((f) => ({
      ...f,
      categoryId: leaf.id,
      categoryAncestors: path.map((p) => p.id),
      category: metalSlug,
      metalType: metalName,
      type: path.length > 1 ? leaf.name : (f.type || 'Ring'),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.categoryId) {
      onFormError?.('Please select a category (and subgroup if needed)')
      return
    }
    const payload = {
      ...form,
      weight: Number(form.weight) || 0,
      makingCharges: Number(form.makingCharges) || 0,
      diamondWeight: form.diamondWeight ? Number(form.diamondWeight) : null,
      purity: form.purity || null,
      images: Array.isArray(form.images) ? form.images : [],
      categoryId: form.categoryId,
      categoryAncestors: form.categoryAncestors || [],
    }
    await onSave(payload)
  }

  const isGold = (form.category || '').toLowerCase() === 'gold'
    || (form.metalType || '').toLowerCase() === 'gold'
  const isDiamond = (form.category || '').toLowerCase() === 'diamond'
    || (form.metalType || '').toLowerCase() === 'diamond'

  return (
    <form className="admin-form product-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {formError && <p className="admin-error">{formError}</p>}

      <div className="form-row">
        <label>Product name</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>

      <ProductCategoryPicker
        tree={tree}
        valueId={form.categoryId}
        onChange={handleCategoryPick}
      />

      <div className="form-grid-2">
        {isGold && (
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
        {isDiamond && (
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
  totalRedeemable: '',
  subtitle: '',
  description: '',
  isActive: true,
}

function KittyPlanForm({ title, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyPlan)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const suggestedRedeemable = (Number(form.monthlyAmount) || 0) * ((Number(form.durationMonths) || 0) + (Number(form.bonusMonths) || 0))

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
        totalRedeemable: Number(form.totalRedeemable) || suggestedRedeemable,
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
        <label>Group name</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. Ratnam group" />
      </div>
      <div className="form-row">
        <label>Sub-heading</label>
        <input value={form.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="e.g. GOLD INVESTMENT PLAN" />
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
      <div className="form-row">
        <label>Total redeemable (₹)</label>
        <input 
          type="number" 
          min="1" 
          value={form.totalRedeemable} 
          onChange={(e) => set('totalRedeemable', e.target.value)} 
          placeholder={`Suggested: ₹${suggestedRedeemable.toLocaleString('en-IN')}`}
          required 
        />
        {suggestedRedeemable > 0 && (
          <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
            Calculated: ₹{suggestedRedeemable.toLocaleString('en-IN')} (monthly × total months)
          </small>
        )}
      </div>
      <div className="form-row">
        <label>Description</label>
        <textarea rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Full plan details shown to customers" />
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

// ─── Approval Modal ───────────────────────────────────────────────────────────

function ApprovalModal({ enrollment, onClose, onApprove, onReject }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [rejectReason, setRejectReason] = useState('')
  const [mode, setMode] = useState('approve')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const handleApprove = async () => {
    setSaving(true)
    setErr(null)
    try {
      await onApprove(enrollment.id, startDate)
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to approve')
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setErr('Please provide a rejection reason')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await onReject(enrollment.id, rejectReason)
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to reject')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enrollment Request</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>
        
        <div className="enrollment-detail-grid">
          <div className="detail-item">
            <span className="detail-label">Enrollment Code</span>
            <span className="detail-value">{enrollment.enrollmentCode}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Customer Name</span>
            <span className="detail-value">{enrollment.userName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">{enrollment.userEmail}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{enrollment.userPhone || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Requested On</span>
            <span className="detail-value">{enrollment.createdAt?.slice(0, 10) || '—'}</span>
          </div>
          {enrollment.notes && (
            <div className="detail-item detail-full">
              <span className="detail-label">Notes</span>
              <span className="detail-value">{enrollment.notes}</span>
            </div>
          )}
        </div>

        {err && <p className="admin-error">{err}</p>}

        <div className="approval-tabs">
          <button 
            type="button" 
            className={`approval-tab ${mode === 'approve' ? 'active' : ''}`}
            onClick={() => setMode('approve')}
          >
            Approve
          </button>
          <button 
            type="button" 
            className={`approval-tab tab-reject ${mode === 'reject' ? 'active' : ''}`}
            onClick={() => setMode('reject')}
          >
            Reject
          </button>
        </div>

        {mode === 'approve' && (
          <div className="approval-form">
            <div className="form-row">
              <label>Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-primary btn-success" 
                onClick={handleApprove}
                disabled={saving}
              >
                {saving ? 'Approving…' : 'Approve Enrollment'}
              </button>
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="approval-form">
            <div className="form-row">
              <label>Rejection Reason</label>
              <textarea 
                rows={3} 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this enrollment is being rejected…"
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-primary btn-danger" 
                onClick={handleReject}
                disabled={saving}
              >
                {saving ? 'Rejecting…' : 'Reject Enrollment'}
              </button>
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Installment Modal ────────────────────────────────────────────────────────

function InstallmentModal({ enrollment, plan, onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    amountPaid: plan?.monthlyAmount || '',
    paymentDate: today,
    paymentMethod: 'cash',
    referenceNumber: '',
    remarks: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        enrollmentId: enrollment.id,
        amountPaid: Number(form.amountPaid) || 0,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber,
        remarks: form.remarks,
        status: 'paid',
      })
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to record installment')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Installment</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>
        <p className="modal-subtitle">{enrollment.userName} — {plan?.name}</p>
        <p className="modal-info">
          Installment #{enrollment.installmentsPaid + 1} of {enrollment.totalInstallments}
        </p>
        {err && <p className="admin-error">{err}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-row">
              <label>Amount (₹)</label>
              <input 
                type="number" 
                min="1" 
                value={form.amountPaid} 
                onChange={(e) => set('amountPaid', e.target.value)} 
                required 
              />
            </div>
            <div className="form-row">
              <label>Payment Date</label>
              <input 
                type="date" 
                value={form.paymentDate} 
                onChange={(e) => set('paymentDate', e.target.value)} 
                required 
              />
            </div>
            <div className="form-row">
              <label>Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <label>Reference Number</label>
              <input 
                value={form.referenceNumber} 
                onChange={(e) => set('referenceNumber', e.target.value)} 
                placeholder="Transaction ID / Cheque No."
              />
            </div>
          </div>
          <div className="form-row">
            <label>Remarks (optional)</label>
            <input 
              value={form.remarks} 
              onChange={(e) => set('remarks', e.target.value)} 
              placeholder="Any notes about this payment"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Record Installment'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Withdrawal Modal ─────────────────────────────────────────────────────────

function WithdrawalModal({ enrollment, plan, onClose, onSave }) {
  const totalSaved = enrollment.amountPaid || 0
  const bonus = plan ? (plan.monthlyAmount * plan.bonusMonths) : 0
  
  const [form, setForm] = useState({
    withdrawalType: 'full',
    principalAmount: totalSaved,
    bonusAmount: bonus,
    deductions: 0,
    transactionReference: '',
    adminNotes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const netAmount = (Number(form.principalAmount) || 0) + (Number(form.bonusAmount) || 0) - (Number(form.deductions) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        enrollmentId: enrollment.id,
        withdrawalType: form.withdrawalType,
        principalAmount: Number(form.principalAmount) || 0,
        bonusAmount: Number(form.bonusAmount) || 0,
        deductions: Number(form.deductions) || 0,
        transactionReference: form.transactionReference,
        adminNotes: form.adminNotes,
      })
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to create withdrawal')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Withdrawal / Payout</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>
        <p className="modal-subtitle">{enrollment.userName} — {plan?.name}</p>
        {err && <p className="admin-error">{err}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-row">
              <label>Withdrawal Type</label>
              <select value={form.withdrawalType} onChange={(e) => set('withdrawalType', e.target.value)}>
                <option value="full">Full Redemption</option>
                <option value="partial">Partial Withdrawal</option>
                <option value="closure">Early Closure</option>
              </select>
            </div>
            <div className="form-row">
              <label>Principal Amount (₹)</label>
              <input 
                type="number" 
                min="0" 
                value={form.principalAmount} 
                onChange={(e) => set('principalAmount', e.target.value)} 
              />
            </div>
            <div className="form-row">
              <label>Bonus Amount (₹)</label>
              <input 
                type="number" 
                min="0" 
                value={form.bonusAmount} 
                onChange={(e) => set('bonusAmount', e.target.value)} 
              />
            </div>
            <div className="form-row">
              <label>Deductions (₹)</label>
              <input 
                type="number" 
                min="0" 
                value={form.deductions} 
                onChange={(e) => set('deductions', e.target.value)} 
              />
            </div>
          </div>
          <div className="withdrawal-summary">
            <span>Net Payout Amount:</span>
            <strong className="net-amount">₹{netAmount.toLocaleString('en-IN')}</strong>
          </div>
          <div className="form-row">
            <label>Transaction Reference (optional)</label>
            <input 
              value={form.transactionReference} 
              onChange={(e) => set('transactionReference', e.target.value)} 
              placeholder="Payment reference / ID"
            />
          </div>
          <div className="form-row">
            <label>Admin Notes (optional)</label>
            <textarea 
              rows={2} 
              value={form.adminNotes} 
              onChange={(e) => set('adminNotes', e.target.value)} 
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Withdrawal'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Enhanced Kitty Stats ─────────────────────────────────────────────────────

function EnhancedKittyStats({ stats }) {
  if (!stats) return null
  
  return (
    <div className="kitty-stats">
      <div className="kitty-stat-card kitty-stat-pending">
        <div className="kitty-stat-value">{stats.pending || 0}</div>
        <div className="kitty-stat-label">Pending Approvals</div>
      </div>
      <div className="kitty-stat-card kitty-stat-active">
        <div className="kitty-stat-value">{stats.active || 0}</div>
        <div className="kitty-stat-label">Active</div>
      </div>
      <div className="kitty-stat-card kitty-stat-completed">
        <div className="kitty-stat-value">{stats.completed || 0}</div>
        <div className="kitty-stat-label">Completed</div>
      </div>
      <div className="kitty-stat-card kitty-stat-savings">
        <div className="kitty-stat-value">₹{(stats.total_collected || 0).toLocaleString('en-IN')}</div>
        <div className="kitty-stat-label">Total Collected</div>
      </div>
      <div className="kitty-stat-card">
        <div className="kitty-stat-value">₹{(stats.total_withdrawn || 0).toLocaleString('en-IN')}</div>
        <div className="kitty-stat-label">Total Withdrawn</div>
      </div>
    </div>
  )
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
  const [kittyTab, setKittyTab] = useState('pending')
  const [kittyPlans, setKittyPlans] = useState([])
  const [kittyMembers, setKittyMembers] = useState([])
  const [kittyEnrollments, setKittyEnrollments] = useState([])
  const [kittyStats, setKittyStats] = useState(null)
  const [kittyWithdrawals, setKittyWithdrawals] = useState([])
  const [kittyLoading, setKittyLoading] = useState(false)
  const [kittyError, setKittyError] = useState(null)
  const [kittyFormMode, setKittyFormMode] = useState(null)
  const [editingPlan, setEditingPlan] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [kittyDeleteConfirm, setKittyDeleteConfirm] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [approvalTarget, setApprovalTarget] = useState(null)
  const [installmentTarget, setInstallmentTarget] = useState(null)
  const [withdrawalTarget, setWithdrawalTarget] = useState(null)

  // ── Notifications ──
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody, setNotifBody] = useState('')
  const [notifAudience, setNotifAudience] = useState('all')
  const [notifImage, setNotifImage] = useState('')
  const [notifLink, setNotifLink] = useState('home')
  const [notifProductId, setNotifProductId] = useState('')
  const [notifSending, setNotifSending] = useState(false)
  const [notifMessage, setNotifMessage] = useState('')
  const [notifError, setNotifError] = useState(null)
  const [notifHistory, setNotifHistory] = useState([])
  const [notifDeviceCount, setNotifDeviceCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)

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
    Promise.allSettled([
      getKittyPlans(),
      getKittyMembers(),
      getAdminEnrollments(),
      getAdminEnrollmentStats(),
      getAdminWithdrawals(),
    ])
      .then(([plansR, membersR, enrollmentsR, statsR, withdrawalsR]) => {
        if (plansR.status === 'fulfilled') setKittyPlans(plansR.value)
        if (membersR.status === 'fulfilled') setKittyMembers(membersR.value)
        if (enrollmentsR.status === 'fulfilled') setKittyEnrollments(enrollmentsR.value)
        if (statsR.status === 'fulfilled') setKittyStats(statsR.value)
        if (withdrawalsR.status === 'fulfilled') setKittyWithdrawals(withdrawalsR.value)
        const failed = [plansR, membersR, enrollmentsR, statsR, withdrawalsR]
          .find((r) => r.status === 'rejected')
        if (failed) setKittyError(failed.reason?.message || 'Failed to load some kitty data')
      })
      .finally(() => setKittyLoading(false))
  }, [])

  useEffect(() => { if (tab === 'kitty') loadKitty() }, [tab, loadKitty])

  useEffect(() => { if (tab === 'rates') setRatesForm({ ...rates }) }, [tab, rates])

  const loadNotifications = useCallback(() => {
    setNotifLoading(true)
    setNotifError(null)
    getAdminNotifications(20)
      .then((data) => {
        setNotifHistory(data.items)
        setNotifDeviceCount(data.deviceCount)
      })
      .catch((e) => setNotifError(e.message || 'Failed to load notifications'))
      .finally(() => setNotifLoading(false))
  }, [])

  useEffect(() => { if (tab === 'notifications') loadNotifications() }, [tab, loadNotifications])

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

  // ── Enhanced enrollment handlers ──
  const handleApproveEnrollment = async (id, startDate) => {
    await approveEnrollment(id, startDate)
    loadKitty()
  }

  const handleRejectEnrollment = async (id, reason) => {
    await rejectEnrollment(id, reason)
    loadKitty()
  }

  const handleCancelEnrollment = async (enrollment) => {
    const reason = prompt('Reason for cancellation:')
    if (reason === null) return
    try {
      await cancelEnrollment(enrollment.id, reason || 'Cancelled by admin')
      loadKitty()
    } catch (err) {
      setKittyError(err.message || 'Cancel failed')
    }
  }

  const handleCreateInstallment = async (data) => {
    await createInstallment(data)
    loadKitty()
  }

  const handleCreateWithdrawal = async (data) => {
    await createWithdrawal(data)
    loadKitty()
  }

  const handleReleaseWithdrawal = async (withdrawal) => {
    const ref = prompt('Transaction reference (optional):')
    if (ref === null) return
    try {
      await updateWithdrawalStatus(withdrawal.id, 'released', { transactionReference: ref })
      loadKitty()
    } catch (err) {
      setKittyError(err.message || 'Failed to release withdrawal')
    }
  }

  const handleSendNotification = async (e) => {
    e.preventDefault()
    if (!notifTitle.trim() || !notifBody.trim()) {
      setNotifError('Title and message are required')
      return
    }
    setNotifSending(true)
    setNotifError(null)
    setNotifMessage('')
    try {
      await sendAdminNotification(
        {
          title: notifTitle.trim(),
          body: notifBody.trim(),
          audience: notifAudience,
          imageUrl: notifImage.trim() || null,
          deepLinkType: notifLink,
          productId: notifLink === 'product' ? notifProductId.trim() : null,
        },
        user?.email,
      )
      setNotifMessage('Notification sent to app users.')
      setNotifTitle('')
      setNotifBody('')
      setNotifImage('')
      setNotifProductId('')
      loadNotifications()
    } catch (err) {
      setNotifError(err.message || 'Failed to send notification')
    } finally {
      setNotifSending(false)
    }
  }

  const filteredMembers = statusFilter === 'all'
    ? kittyMembers
    : kittyMembers.filter((m) => m.status === statusFilter)

  const pendingEnrollments = kittyEnrollments.filter((e) => e.status === 'pending')
  const activeEnrollments = kittyEnrollments.filter((e) => e.status === 'active')
  const pendingWithdrawals = kittyWithdrawals.filter((w) => w.status === 'pending')

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
        <button type="button" className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
          <span className="tab-icon">🗂️</span> Categories
        </button>
        <button type="button" className={tab === 'rates' ? 'active' : ''} onClick={() => setTab('rates')}>
          <span className="tab-icon">📈</span> Metal Rates
        </button>
        <button type="button" className={tab === 'kitty' ? 'active' : ''} onClick={() => setTab('kitty')}>
          <span className="tab-icon">🪙</span> Kitty Scheme
        </button>
        <button type="button" className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>
          <span className="tab-icon">🔔</span> Notifications
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
                categoryId: editingProduct.categoryId || '',
                categoryAncestors: editingProduct.categoryAncestors || [],
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

      {/* ── Categories Tab ── */}
      {tab === 'categories' && <CategoryTreeEditor />}

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
              <p className="admin-section-sub">Manage savings plans, enrollments, installments, and withdrawals.</p>
            </div>
          </div>

          {kittyError && <p className="admin-error">{kittyError}</p>}
          {kittyLoading && <div className="admin-loading">Loading kitty data…</div>}

          {!kittyLoading && (
            <>
              <EnhancedKittyStats stats={kittyStats} />

              {/* Kitty sub-tabs */}
              <nav className="admin-sub-tabs">
                <button type="button" className={kittyTab === 'pending' ? 'active' : ''} onClick={() => setKittyTab('pending')}>
                  Pending Approvals {pendingEnrollments.length > 0 && <span className="badge-count">{pendingEnrollments.length}</span>}
                </button>
                <button type="button" className={kittyTab === 'enrollments' ? 'active' : ''} onClick={() => setKittyTab('enrollments')}>
                  Enrollments ({kittyEnrollments.length})
                </button>
                <button type="button" className={kittyTab === 'withdrawals' ? 'active' : ''} onClick={() => setKittyTab('withdrawals')}>
                  Withdrawals {pendingWithdrawals.length > 0 && <span className="badge-count">{pendingWithdrawals.length}</span>}
                </button>
                <button type="button" className={kittyTab === 'members' ? 'active' : ''} onClick={() => setKittyTab('members')}>
                  Legacy Members ({kittyMembers.length})
                </button>
                <button type="button" className={kittyTab === 'plans' ? 'active' : ''} onClick={() => setKittyTab('plans')}>
                  Plans ({kittyPlans.length})
                </button>
              </nav>

              {/* ─ Pending Approvals sub-tab ─ */}
              {kittyTab === 'pending' && (
                <div>
                  <div className="kitty-sub-header">
                    <h3>Enrollment Requests Awaiting Approval</h3>
                  </div>
                  
                  {pendingEnrollments.length === 0 ? (
                    <div className="admin-empty">No pending enrollment requests.</div>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Customer</th>
                            <th>Plan</th>
                            <th>Requested</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingEnrollments.map((e) => {
                            const plan = kittyPlans.find((p) => p.id === e.planId)
                            return (
                              <tr key={e.id}>
                                <td className="td-code">{e.enrollmentCode}</td>
                                <td>
                                  <div className="member-name">{e.userName}</div>
                                  <div className="member-contact">{e.userEmail}</div>
                                </td>
                                <td>
                                  <div>{plan?.name || '—'}</div>
                                  {plan && <div className="member-plan-amount">₹{plan.monthlyAmount.toLocaleString('en-IN')}/mo</div>}
                                </td>
                                <td>{e.createdAt?.slice(0, 10) || '—'}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-sm btn-success"
                                    onClick={() => setApprovalTarget(e)}
                                  >
                                    Review
                                  </button>
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

              {/* ─ Enrollments sub-tab ─ */}
              {kittyTab === 'enrollments' && (
                <div>
                  <div className="kitty-sub-header">
                    <div className="kitty-filters">
                      {['all', 'active', 'completed', 'cancelled', 'rejected'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                          onClick={() => setStatusFilter(s)}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                          <span className="filter-count">
                            {s === 'all' ? kittyEnrollments.length : kittyEnrollments.filter((e) => e.status === s).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(statusFilter === 'all' ? kittyEnrollments : kittyEnrollments.filter((e) => e.status === statusFilter)).length === 0 ? (
                    <div className="admin-empty">No enrollments found.</div>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Customer</th>
                            <th>Plan</th>
                            <th>Progress</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(statusFilter === 'all' ? kittyEnrollments : kittyEnrollments.filter((e) => e.status === statusFilter)).map((e) => {
                            const plan = kittyPlans.find((p) => p.id === e.planId)
                            return (
                              <tr key={e.id}>
                                <td className="td-code">{e.enrollmentCode}</td>
                                <td>
                                  <div className="member-name">{e.userName}</div>
                                  <div className="member-contact">{e.userEmail}</div>
                                </td>
                                <td>{plan?.name || '—'}</td>
                                <td>
                                  <PaymentProgress paid={e.installmentsPaid} total={e.totalInstallments} />
                                </td>
                                <td>
                                  <div>Paid: ₹{(e.amountPaid || 0).toLocaleString('en-IN')}</div>
                                  <div className="member-plan-amount">Remaining: ₹{(e.remainingAmount || 0).toLocaleString('en-IN')}</div>
                                </td>
                                <td><StatusBadge status={e.status} /></td>
                                <td>
                                  <div className="member-actions">
                                    {e.status === 'active' && (
                                      <>
                                        <button
                                          type="button"
                                          className="btn-sm btn-pay"
                                          onClick={() => setInstallmentTarget({ enrollment: e, plan })}
                                        >
                                          + Installment
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-sm btn-success"
                                          onClick={() => setWithdrawalTarget({ enrollment: e, plan })}
                                        >
                                          Payout
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-sm btn-warn"
                                          onClick={() => handleCancelEnrollment(e)}
                                        >
                                          Cancel
                                        </button>
                                      </>
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

              {/* ─ Withdrawals sub-tab ─ */}
              {kittyTab === 'withdrawals' && (
                <div>
                  <div className="kitty-sub-header">
                    <h3>Withdrawal / Payout Records</h3>
                  </div>

                  {kittyWithdrawals.length === 0 ? (
                    <div className="admin-empty">No withdrawal records yet.</div>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Type</th>
                            <th>Principal</th>
                            <th>Bonus</th>
                            <th>Deductions</th>
                            <th>Net Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kittyWithdrawals.map((w) => (
                            <tr key={w.id}>
                              <td className="td-code">{w.withdrawalCode}</td>
                              <td>{w.withdrawalType}</td>
                              <td>₹{(w.principalAmount || 0).toLocaleString('en-IN')}</td>
                              <td>₹{(w.bonusAmount || 0).toLocaleString('en-IN')}</td>
                              <td>₹{(w.deductions || 0).toLocaleString('en-IN')}</td>
                              <td className="td-amount">₹{(w.netAmount || 0).toLocaleString('en-IN')}</td>
                              <td><StatusBadge status={w.status} /></td>
                              <td>
                                {w.status === 'pending' && (
                                  <button
                                    type="button"
                                    className="btn-sm btn-success"
                                    onClick={() => handleReleaseWithdrawal(w)}
                                  >
                                    Release
                                  </button>
                                )}
                                {w.releaseDate && (
                                  <span className="release-date">Released: {w.releaseDate.slice(0, 10)}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

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
                        totalRedeemable: editingPlan.totalRedeemable ?? '',
                        subtitle: editingPlan.subtitle || '',
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
                        {plan.subtitle && <p className="plan-subtitle">{plan.subtitle}</p>}
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

      {/* ── Notifications Tab ── */}
      {tab === 'notifications' && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Push notifications</h2>
              <p className="admin-section-sub">
                Send a message to the Garg Jewellers iOS and Android apps.
                {notifDeviceCount > 0
                  ? ` ${notifDeviceCount} device${notifDeviceCount === 1 ? '' : 's'} registered.`
                  : ' Devices register when customers open the app and allow notifications.'}
              </p>
            </div>
          </div>

          {notifError && <p className="admin-error">{notifError}</p>}
          {notifMessage && <p className="admin-msg success">{notifMessage}</p>}

          <form className="admin-form" onSubmit={handleSendNotification}>
            <h3>Compose</h3>
            <div className="form-row">
              <label>Title</label>
              <input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                maxLength={80}
                placeholder="New gold collection"
                required
              />
            </div>
            <div className="form-row">
              <label>Message</label>
              <textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                maxLength={240}
                placeholder="22K bangles now in store. Visit today."
                required
              />
            </div>
            <div className="form-grid-2">
              <div className="form-row">
                <label>Audience</label>
                <select value={notifAudience} onChange={(e) => setNotifAudience(e.target.value)}>
                  <option value="all">All app users</option>
                  <option value="kitty">Kitty members (logged-in)</option>
                </select>
              </div>
              <div className="form-row">
                <label>Opens in app</label>
                <select value={notifLink} onChange={(e) => setNotifLink(e.target.value)}>
                  <option value="home">Home</option>
                  <option value="shop">Shop</option>
                  <option value="rates">Metal rates</option>
                  <option value="kitty">Kitty</option>
                  <option value="product">Product</option>
                </select>
              </div>
            </div>
            {notifLink === 'product' && (
              <div className="form-row">
                <label>Product</label>
                <select value={notifProductId} onChange={(e) => setNotifProductId(e.target.value)}>
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-row">
              <label>Image URL (optional)</label>
              <input
                value={notifImage}
                onChange={(e) => setNotifImage(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={notifSending}>
              {notifSending ? 'Sending…' : 'Send notification'}
            </button>
          </form>

          <div className="admin-section-header" style={{ marginTop: '2rem' }}>
            <div>
              <h2>Recent sends</h2>
              <p className="admin-section-sub">Last 20 notifications</p>
            </div>
          </div>

          {notifLoading && <p className="admin-section-sub">Loading…</p>}
          {!notifLoading && notifHistory.length === 0 && (
            <div className="admin-empty">No notifications sent yet.</div>
          )}
          {notifHistory.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Audience</th>
                    <th>Status</th>
                    <th>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {notifHistory.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <div className="member-name">{n.title}</div>
                        <div className="member-contact">{n.body}</div>
                      </td>
                      <td>{n.audience === 'kitty' ? 'Kitty' : 'All users'}</td>
                      <td>
                        <span className={`notif-status ${n.status}`}>
                          {n.status}{n.error ? ` — ${n.error}` : ''}
                        </span>
                      </td>
                      <td>{n.createdAt ? new Date(n.createdAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Approval Modal */}
      {approvalTarget && (
        <ApprovalModal
          enrollment={approvalTarget}
          onClose={() => setApprovalTarget(null)}
          onApprove={handleApproveEnrollment}
          onReject={handleRejectEnrollment}
        />
      )}

      {/* Installment Modal */}
      {installmentTarget && (
        <InstallmentModal
          enrollment={installmentTarget.enrollment}
          plan={installmentTarget.plan}
          onClose={() => setInstallmentTarget(null)}
          onSave={handleCreateInstallment}
        />
      )}

      {/* Withdrawal Modal */}
      {withdrawalTarget && (
        <WithdrawalModal
          enrollment={withdrawalTarget.enrollment}
          plan={withdrawalTarget.plan}
          onClose={() => setWithdrawalTarget(null)}
          onSave={handleCreateWithdrawal}
        />
      )}
    </motion.div>
  )
}
