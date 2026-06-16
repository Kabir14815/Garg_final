import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getUserKitties } from '../api/client'
import './UserDashboard.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(n) {
  return `₹${(n || 0).toLocaleString('en-IN')}`
}

function formatMonth(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${names[parseInt(m, 10) - 1]} ${y}`
}

function nextDueMonth(startDate, paymentsMade) {
  if (!startDate) return null
  const d = new Date(startDate)
  d.setMonth(d.getMonth() + paymentsMade)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const labels = { active: 'Active', completed: 'Completed', cancelled: 'Cancelled' }
  return <span className={`ud-badge ud-badge-${status}`}>{labels[status] || status}</span>
}

// ─── Circular progress ring ───────────────────────────────────────────────────

function ProgressRing({ paid, total, size = 88 }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, paid / total) : 0
  const dash = pct * circ

  return (
    <svg className="ud-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--border-subtle)" strokeWidth={8}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x="50%" y="48%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="var(--charcoal)"
      >
        {paid}/{total}
      </text>
      <text
        x="50%" y="66%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="9"
        fill="var(--text-muted)"
      >
        months
      </text>
    </svg>
  )
}

// ─── Payment History ──────────────────────────────────────────────────────────

function PaymentHistory({ payments }) {
  const [open, setOpen] = useState(false)

  if (!payments?.length) {
    return <p className="ud-no-payments">No payments recorded yet.</p>
  }

  const sorted = [...payments].sort((a, b) => b.month.localeCompare(a.month))

  return (
    <div className="ud-history">
      <button
        type="button"
        className="ud-history-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '▲' : '▼'} Payment history ({payments.length})
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="ud-history-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            {sorted.map((p, i) => (
              <li key={i} className="ud-history-item">
                <span className="ud-history-month">{formatMonth(p.month)}</span>
                <span className="ud-history-amount">{formatINR(p.amount)}</span>
                {p.note && <span className="ud-history-note">{p.note}</span>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Single Kitty Card ────────────────────────────────────────────────────────

function KittyCard({ kitty, index }) {
  const reduceMotion = useReducedMotion()
  const plan = kitty.plan
  const paid = kitty.paymentsMade ?? kitty.payments_made ?? 0
  const duration = kitty.planDuration ?? kitty.plan_duration ?? (plan?.durationMonths ?? 11)
  const totalSaved = kitty.totalSaved ?? kitty.total_saved ?? 0
  const totalRedeemable = kitty.totalRedeemable ?? kitty.total_redeemable ?? 0
  const remaining = Math.max(0, totalRedeemable - totalSaved)
  const nextDue = kitty.status === 'active' ? nextDueMonth(kitty.startDate ?? kitty.start_date, paid) : null

  return (
    <motion.div
      className={`ud-kitty-card ud-kitty-${kitty.status}`}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, delay: index * 0.08 }}
    >
      {/* Card header */}
      <div className="ud-kitty-header">
        <div className="ud-kitty-title">
          <div className="ud-kitty-icon">🪙</div>
          <div>
            <h3>{plan?.name ?? '—'}</h3>
            <p className="ud-kitty-since">
              Started {new Date(kitty.startDate ?? kitty.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <StatusBadge status={kitty.status} />
      </div>

      {/* Main content */}
      <div className="ud-kitty-body">
        {/* Progress ring */}
        <div className="ud-kitty-progress">
          <ProgressRing paid={paid} total={duration} />
          {kitty.status === 'active' && nextDue && (
            <div className="ud-next-due">
              <span className="ud-next-due-label">Next payment</span>
              <span className="ud-next-due-month">{formatMonth(nextDue)}</span>
            </div>
          )}
          {kitty.status === 'completed' && kitty.redemption_date && (
            <div className="ud-next-due">
              <span className="ud-next-due-label">Redeemed on</span>
              <span className="ud-next-due-month">
                {new Date(kitty.redemption_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* Amounts */}
        <div className="ud-kitty-amounts">
          <div className="ud-amount-row">
            <span>Monthly instalment</span>
            <strong>{formatINR(plan?.monthlyAmount ?? plan?.monthly_amount)}</strong>
          </div>
          <div className="ud-amount-row">
            <span>Total saved</span>
            <strong className="ud-amount-saved">{formatINR(totalSaved)}</strong>
          </div>
          <div className="ud-amount-row ud-amount-row-total">
            <span>Total redeemable</span>
            <strong className="ud-amount-total">{formatINR(totalRedeemable)}</strong>
          </div>
          {kitty.status === 'active' && (
            <div className="ud-amount-row">
              <span>Remaining to pay</span>
              <strong>{formatINR(remaining)}</strong>
            </div>
          )}
          {plan?.bonusMonths > 0 && (
            <div className="ud-bonus-note">
              🎁 Includes {plan.bonusMonths} bonus month{plan.bonusMonths > 1 ? 's' : ''} from Garg Jewellers
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="ud-progress-bar-wrap">
        <div
          className="ud-progress-bar-fill"
          style={{ width: `${duration > 0 ? Math.min(100, (paid / duration) * 100) : 0}%` }}
        />
      </div>

      {/* Notes */}
      {kitty.notes && <p className="ud-kitty-notes">📝 {kitty.notes}</p>}

      {/* Payment history */}
      <PaymentHistory payments={kitty.payments} />
    </motion.div>
  )
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ kitties }) {
  const active = kitties.filter((k) => k.status === 'active').length
  const completed = kitties.filter((k) => k.status === 'completed').length
  const totalSaved = kitties.reduce((s, k) => s + (k.totalSaved ?? k.total_saved ?? 0), 0)
  const totalRedeemable = kitties.reduce((s, k) => s + (k.totalRedeemable ?? k.total_redeemable ?? 0), 0)

  return (
    <div className="ud-summary">
      <div className="ud-summary-card">
        <div className="ud-summary-val">{kitties.length}</div>
        <div className="ud-summary-label">Total schemes</div>
      </div>
      <div className="ud-summary-card ud-summary-active">
        <div className="ud-summary-val">{active}</div>
        <div className="ud-summary-label">Active</div>
      </div>
      <div className="ud-summary-card ud-summary-done">
        <div className="ud-summary-val">{completed}</div>
        <div className="ud-summary-label">Completed</div>
      </div>
      <div className="ud-summary-card ud-summary-saved">
        <div className="ud-summary-val">{formatINR(totalSaved)}</div>
        <div className="ud-summary-label">Total saved</div>
      </div>
      <div className="ud-summary-card ud-summary-redeem">
        <div className="ud-summary-val">{formatINR(totalRedeemable)}</div>
        <div className="ud-summary-label">Total redeemable</div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [kitties, setKitties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => {
    if (!user?.phone) return
    setLoading(true)
    setError(null)
    getUserKitties(user.phone)
      .then(setKitties)
      .catch((e) => setError(e.message || 'Failed to load your savings'))
      .finally(() => setLoading(false))
  }, [user?.phone])

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return }
    if (!user.phone) { navigate('/', { replace: true }); return }
    load()
  }, [user, navigate, load])

  const filtered = filter === 'all' ? kitties : kitties.filter((k) => k.status === filter)

  if (!user) return null

  return (
    <motion.div
      className="ud-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
    >
      {/* Hero header */}
      <div className="ud-hero">
        <div className="ud-hero-inner">
          <div className="ud-hero-left">
            <div className="ud-avatar">
              {(user.name || user.phone || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="ud-greeting">
                Namaste{user.name ? `, ${user.name}` : ''}!
              </h1>
              <p className="ud-phone">+91 {user.phone}</p>
            </div>
          </div>
          <div className="ud-hero-right">
            <Link to="/" className="ud-link-btn">← Store</Link>
            <button
              type="button"
              className="ud-link-btn ud-logout"
              onClick={() => { logout(); navigate('/') }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="ud-content">
        {/* Summary */}
        {!loading && kitties.length > 0 && <SummaryBar kitties={kitties} />}

        {/* Title row */}
        <div className="ud-section-header">
          <div>
            <h2 className="ud-section-title">My Savings Plans</h2>
            <p className="ud-section-sub">
              Your active and past kitty schemes with The House of Garg.
            </p>
          </div>
          {kitties.length > 1 && (
            <div className="ud-filter-row">
              {['all', 'active', 'completed', 'cancelled'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`ud-filter-pill ${filter === s ? 'active' : ''}`}
                  onClick={() => setFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* States */}
        {loading && (
          <div className="ud-loading">
            <div className="ud-spinner" />
            <p>Loading your savings…</p>
          </div>
        )}

        {error && (
          <div className="ud-error">
            <p>{error}</p>
            <button type="button" onClick={load} className="ud-retry">Try again</button>
          </div>
        )}

        {!loading && !error && kitties.length === 0 && (
          <div className="ud-empty">
            <div className="ud-empty-icon">🪙</div>
            <h3>No savings plans yet</h3>
            <p>
              Visit The House of Garg store and ask us about our kitty savings scheme.
              We'll enroll you with your phone number.
            </p>
            <Link to="/" className="ud-cta-btn">Visit Store →</Link>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="ud-kitty-grid">
            {filtered.map((k, i) => (
              <KittyCard key={k.id} kitty={k} index={i} />
            ))}
          </div>
        )}

        {!loading && !error && kitties.length > 0 && filtered.length === 0 && (
          <p className="ud-no-filter">No {filter} plans.</p>
        )}

        {/* Info box */}
        {!loading && kitties.length > 0 && (
          <div className="ud-info-box">
            <h4>How it works</h4>
            <ul>
              <li>Pay your monthly instalment at our store or via bank transfer.</li>
              <li>After completing all instalments, your bonus month is added automatically.</li>
              <li>Visit us to redeem your total amount toward any jewellery purchase.</li>
              <li>For queries call us at <a href="tel:+911234567890">+91 12345 67890</a>.</li>
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}
