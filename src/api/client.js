// Dev: leave VITE_API_URL unset — same-origin `/api` (Vite proxy in vite.config.js).
// Production (e.g. Netlify + API on Render): set VITE_API_URL = https://your-api.onrender.com (no trailing slash).
const _raw = import.meta.env.VITE_API_URL
const API_BASE = typeof _raw === 'string' ? _raw.replace(/\/$/, '') : ''

/** Image paths from the API are like /uploads/...; prefix API origin on Netlify so <img> hits Render, not the static host. */
function toPublicImageUrl(path) {
  if (!path || typeof path !== 'string') return path
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/') && API_BASE) return `${API_BASE}${path}`
  return path
}

/** When saving, store relative /uploads/... paths the backend expects. */
function toApiImagePath(path) {
  if (!path || typeof path !== 'string') return path
  if (API_BASE && path.startsWith(`${API_BASE}/`)) return path.slice(API_BASE.length) || path
  return path
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  let res
  try {
    res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch (e) {
    const err = new Error(e.message === 'Failed to fetch' ? 'Unable to reach server. Please check your connection and try again.' : e.message)
    err.status = 0
    err.body = { detail: err.message }
    throw err
  }
  if (!res.ok) {
    const err = new Error(res.statusText || 'Request failed')
    err.status = res.status
    try {
      const data = await res.json()
      err.body = data
      if (typeof data?.detail === 'string') err.message = data.detail
    } catch (_) {}
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

// Map backend rates to frontend shape (gold24k, gold22k, silver, diamondIndex)
export function mapRatesFromApi(data) {
  return {
    gold24k: data.gold_24k ?? 6320,
    gold22k: data.gold_22k ?? 5800,
    silver: data.silver ?? 78,
    diamondIndex: data.diamond ?? 52000,
    bronze: data.bronze ?? 0,
  }
}

export function mapRatesToApi(rates) {
  return {
    gold_24k: rates.gold24k,
    gold_22k: rates.gold22k,
    silver: rates.silver,
    diamond: rates.diamondIndex,
    bronze: rates.bronze ?? 0,
  }
}

// Metal rates
export async function getMetalRates() {
  const data = await request('/api/metal-rates')
  return mapRatesFromApi(data)
}

export async function updateMetalRates(rates) {
  const data = await request('/api/metal-rates', {
    method: 'PUT',
    body: JSON.stringify(mapRatesToApi(rates)),
  })
  return mapRatesFromApi(data)
}

// Products (backend uses snake_case; we normalize to camelCase for frontend)
function productFromApi(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    purity: p.purity ?? null,
    type: p.product_type || p.type || 'Ring',
    weight: p.weight ?? 0,
    makingCharges: p.making_charges ?? 0,
    metalType: p.metal_type,
    diamondWeight: p.diamond_weight ?? null,
    images: (p.images ?? []).map(toPublicImageUrl),
  }
}

function productToApi(p) {
  return {
    name: p.name,
    category: p.category,
    weight: Number(p.weight) || 0,
    making_charges: Number(p.makingCharges) ?? 0,
    metal_type: p.metalType,
    purity: p.purity || null,
    product_type: p.type || p.product_type || 'Ring',
    diamond_weight: p.diamondWeight ?? null,
    images: (Array.isArray(p.images) ? p.images : []).map(toApiImagePath),
  }
}

export async function getProducts() {
  const list = await request('/api/products')
  return list.map(productFromApi)
}

export async function getProduct(id) {
  const p = await request(`/api/products/${id}`)
  return productFromApi(p)
}

export async function createProduct(product) {
  const p = await request('/api/products', {
    method: 'POST',
    body: JSON.stringify(productToApi(product)),
  })
  return productFromApi(p)
}

export async function updateProduct(id, product) {
  const p = await request(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productToApi(product)),
  })
  return productFromApi(p)
}

export async function deleteProduct(id) {
  await request(`/api/products/${id}`, { method: 'DELETE' })
}

// Auth — email/password (admin)
export async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(email, password, name) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: name || undefined }),
  })
}

// Auth — phone / OTP (customers)
export async function sendOtp(phone) {
  return request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone, otp) {
  return request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  })
}

// Auth — email / OTP
export async function sendEmailOtp(email) {
  return request('/api/auth/send-email-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function verifyEmailOtp(email, otp) {
  return request('/api/auth/verify-email-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
}

// User dashboard
export async function getUserKitties(phone) {
  return request(`/api/user/kitties?phone=${encodeURIComponent(phone)}`)
}

// ─── Kitty Savings Scheme ─────────────────────────────────────────────────

function kittyPlanFromApi(p) {
  return {
    id: p.id,
    name: p.name,
    monthlyAmount: p.monthly_amount,
    durationMonths: p.duration_months,
    bonusMonths: p.bonus_months,
    totalRedeemable: p.total_redeemable,
    description: p.description ?? '',
    isActive: p.is_active,
  }
}

function kittyPlanToApi(p) {
  return {
    name: p.name,
    monthly_amount: Number(p.monthlyAmount),
    duration_months: Number(p.durationMonths),
    bonus_months: Number(p.bonusMonths),
    total_redeemable: p.totalRedeemable ? Number(p.totalRedeemable) : null,
    description: p.description || null,
    is_active: p.isActive,
  }
}

function kittyMemberFromApi(m) {
  return {
    id: m.id,
    planId: m.plan_id,
    name: m.name,
    phone: m.phone,
    email: m.email ?? '',
    startDate: m.start_date,
    notes: m.notes ?? '',
    status: m.status,
    payments: m.payments ?? [],
    redemptionDate: m.redemption_date ?? null,
    paymentsMade: m.payments_made ?? 0,
    planDuration: m.plan_duration ?? 11,
  }
}

function kittyMemberToApi(m) {
  return {
    plan_id: m.planId,
    name: m.name,
    phone: m.phone,
    email: m.email || null,
    start_date: m.startDate,
    notes: m.notes || null,
  }
}

export async function getKittyPlans() {
  const list = await request('/api/kitty/plans')
  return list.map(kittyPlanFromApi)
}

export async function createKittyPlan(plan) {
  const p = await request('/api/kitty/plans', {
    method: 'POST',
    body: JSON.stringify(kittyPlanToApi(plan)),
  })
  return kittyPlanFromApi(p)
}

export async function updateKittyPlan(id, plan) {
  const p = await request(`/api/kitty/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(kittyPlanToApi(plan)),
  })
  return kittyPlanFromApi(p)
}

export async function deleteKittyPlan(id) {
  await request(`/api/kitty/plans/${id}`, { method: 'DELETE' })
}

export async function getKittyMembers() {
  const list = await request('/api/kitty/members')
  return list.map(kittyMemberFromApi)
}

export async function createKittyMember(member) {
  const m = await request('/api/kitty/members', {
    method: 'POST',
    body: JSON.stringify(kittyMemberToApi(member)),
  })
  return kittyMemberFromApi(m)
}

export async function updateKittyMember(id, data) {
  const payload = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.phone !== undefined) payload.phone = data.phone
  if (data.email !== undefined) payload.email = data.email || null
  if (data.notes !== undefined) payload.notes = data.notes || null
  if (data.status !== undefined) payload.status = data.status
  if (data.redemptionDate !== undefined) payload.redemption_date = data.redemptionDate || null
  const m = await request(`/api/kitty/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return kittyMemberFromApi(m)
}

export async function addKittyPayment(memberId, month, amount, note) {
  const m = await request(`/api/kitty/members/${memberId}/payments`, {
    method: 'POST',
    body: JSON.stringify({ month, amount: amount || null, note: note || null }),
  })
  return kittyMemberFromApi(m)
}

export async function deleteKittyMember(id) {
  await request(`/api/kitty/members/${id}`, { method: 'DELETE' })
}

// ─── Enhanced Kitty Admin APIs ─────────────────────────────────────────────

// Enrollment transformers
function enrollmentFromApi(e) {
  return {
    id: e.id,
    enrollmentCode: e.enrollment_code,
    planId: e.plan_id,
    userEmail: e.user_email,
    userName: e.user_name,
    userPhone: e.user_phone ?? '',
    status: e.status,
    startDate: e.start_date,
    totalInstallments: e.total_installments,
    installmentsPaid: e.installments_paid ?? 0,
    installmentsPending: e.installments_pending,
    amountPaid: e.amount_paid ?? 0,
    remainingAmount: e.remaining_amount,
    totalRedeemable: e.total_redeemable,
    nextDueDate: e.next_due_date,
    totalWithdrawn: e.total_withdrawn ?? 0,
    approvalDate: e.approval_date,
    approvedBy: e.approved_by,
    rejectionReason: e.rejection_reason,
    notes: e.notes ?? '',
    createdAt: e.created_at,
    plan: e.plan ? kittyPlanFromApi(e.plan) : null,
    installments: (e.installments ?? []).map(installmentFromApi),
    withdrawals: (e.withdrawals ?? []).map(withdrawalFromApi),
    ledger: e.ledger ?? [],
  }
}

function installmentFromApi(i) {
  return {
    id: i.id,
    enrollmentId: i.enrollment_id,
    installmentNumber: i.installment_number,
    dueDate: i.due_date,
    amountDue: i.amount_due,
    amountPaid: i.amount_paid,
    paymentDate: i.payment_date,
    paymentMethod: i.payment_method ?? 'cash',
    referenceNumber: i.reference_number ?? '',
    receiptUrl: i.receipt_url,
    status: i.status,
    remarks: i.remarks ?? '',
    recordedBy: i.recorded_by ?? '',
    createdAt: i.created_at,
  }
}

function withdrawalFromApi(w) {
  return {
    id: w.id,
    enrollmentId: w.enrollment_id,
    withdrawalCode: w.withdrawal_code,
    amount: w.amount,
    withdrawalType: w.withdrawal_type,
    principalAmount: w.principal_amount,
    bonusAmount: w.bonus_amount,
    deductions: w.deductions,
    netAmount: w.net_amount,
    status: w.status,
    releaseDate: w.release_date,
    transactionReference: w.transaction_reference ?? '',
    supportingDocuments: w.supporting_documents ?? [],
    adminNotes: w.admin_notes ?? '',
    approvedBy: w.approved_by,
    createdBy: w.created_by ?? '',
    createdAt: w.created_at,
  }
}

// Admin Plan APIs (new endpoints)
export async function getAdminKittyPlans(includeInactive = true) {
  const list = await request(`/api/admin/kitty/plans?include_inactive=${includeInactive}`)
  return list.map(kittyPlanFromApi)
}

export async function createAdminKittyPlan(plan) {
  const p = await request('/api/admin/kitty/plans', {
    method: 'POST',
    body: JSON.stringify({
      name: plan.name,
      monthly_amount: Number(plan.monthlyAmount),
      duration_months: Number(plan.durationMonths),
      bonus_months: Number(plan.bonusMonths),
      description: plan.description || '',
      joining_fee: Number(plan.joiningFee || 0),
      processing_fee: Number(plan.processingFee || 0),
      late_fee: Number(plan.lateFee || 0),
      start_date: plan.startDate || null,
      end_date: plan.endDate || null,
      status: plan.status || 'active',
      is_active: plan.isActive !== false,
      terms_conditions: plan.termsConditions || '',
    }),
  })
  return kittyPlanFromApi(p)
}

export async function updateAdminKittyPlan(id, plan) {
  const payload = {}
  if (plan.name !== undefined) payload.name = plan.name
  if (plan.monthlyAmount !== undefined) payload.monthly_amount = Number(plan.monthlyAmount)
  if (plan.durationMonths !== undefined) payload.duration_months = Number(plan.durationMonths)
  if (plan.bonusMonths !== undefined) payload.bonus_months = Number(plan.bonusMonths)
  if (plan.description !== undefined) payload.description = plan.description || ''
  if (plan.isActive !== undefined) payload.is_active = plan.isActive
  if (plan.status !== undefined) payload.status = plan.status
  if (plan.joiningFee !== undefined) payload.joining_fee = Number(plan.joiningFee || 0)
  if (plan.processingFee !== undefined) payload.processing_fee = Number(plan.processingFee || 0)
  if (plan.lateFee !== undefined) payload.late_fee = Number(plan.lateFee || 0)
  if (plan.termsConditions !== undefined) payload.terms_conditions = plan.termsConditions || ''
  
  const p = await request(`/api/admin/kitty/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return kittyPlanFromApi(p)
}

export async function deleteAdminKittyPlan(id) {
  await request(`/api/admin/kitty/plans/${id}`, { method: 'DELETE' })
}

// Admin Enrollment APIs
export async function getAdminEnrollments(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  if (filters.userEmail) params.append('user_email', filters.userEmail)
  if (filters.planId) params.append('plan_id', filters.planId)
  const list = await request(`/api/admin/kitty/enrollments?${params.toString()}`)
  return list.map(enrollmentFromApi)
}

export async function getAdminEnrollmentStats() {
  return request('/api/admin/kitty/enrollments/stats')
}

export async function getAdminEnrollmentDetail(id) {
  const e = await request(`/api/admin/kitty/enrollments/${id}`)
  return enrollmentFromApi(e)
}

export async function approveEnrollment(id, startDate = null) {
  const e = await request(`/api/admin/kitty/enrollments/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ start_date: startDate }),
  })
  return enrollmentFromApi(e)
}

export async function rejectEnrollment(id, reason) {
  const e = await request(`/api/admin/kitty/enrollments/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  })
  return enrollmentFromApi(e)
}

export async function cancelEnrollment(id, reason) {
  const e = await request(`/api/admin/kitty/enrollments/${id}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  })
  return enrollmentFromApi(e)
}

// Admin Installment APIs
export async function getAdminInstallments(filters = {}) {
  const params = new URLSearchParams()
  if (filters.enrollmentId) params.append('enrollment_id', filters.enrollmentId)
  if (filters.status) params.append('status', filters.status)
  const list = await request(`/api/admin/kitty/installments?${params.toString()}`)
  return list.map(installmentFromApi)
}

export async function createInstallment(data) {
  const i = await request('/api/admin/kitty/installments', {
    method: 'POST',
    body: JSON.stringify({
      enrollment_id: data.enrollmentId,
      due_date: data.dueDate || null,
      amount_due: data.amountDue || null,
      amount_paid: data.amountPaid || null,
      payment_date: data.paymentDate || null,
      payment_method: data.paymentMethod || 'cash',
      reference_number: data.referenceNumber || '',
      receipt_url: data.receiptUrl || null,
      remarks: data.remarks || '',
      status: data.status || 'paid',
    }),
  })
  return installmentFromApi(i)
}

export async function updateInstallment(id, data) {
  const payload = {}
  if (data.dueDate !== undefined) payload.due_date = data.dueDate
  if (data.amountDue !== undefined) payload.amount_due = data.amountDue
  if (data.amountPaid !== undefined) payload.amount_paid = data.amountPaid
  if (data.paymentDate !== undefined) payload.payment_date = data.paymentDate
  if (data.paymentMethod !== undefined) payload.payment_method = data.paymentMethod
  if (data.referenceNumber !== undefined) payload.reference_number = data.referenceNumber
  if (data.receiptUrl !== undefined) payload.receipt_url = data.receiptUrl
  if (data.remarks !== undefined) payload.remarks = data.remarks
  if (data.status !== undefined) payload.status = data.status
  
  const i = await request(`/api/admin/kitty/installments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return installmentFromApi(i)
}

// Admin Withdrawal APIs
export async function getAdminWithdrawals(filters = {}) {
  const params = new URLSearchParams()
  if (filters.enrollmentId) params.append('enrollment_id', filters.enrollmentId)
  if (filters.status) params.append('status', filters.status)
  const list = await request(`/api/admin/kitty/withdrawals?${params.toString()}`)
  return list.map(withdrawalFromApi)
}

export async function createWithdrawal(data) {
  const w = await request('/api/admin/kitty/withdrawals', {
    method: 'POST',
    body: JSON.stringify({
      enrollment_id: data.enrollmentId,
      amount: data.amount || null,
      withdrawal_type: data.withdrawalType || 'full',
      principal_amount: data.principalAmount || 0,
      bonus_amount: data.bonusAmount || 0,
      deductions: data.deductions || 0,
      transaction_reference: data.transactionReference || '',
      admin_notes: data.adminNotes || '',
    }),
  })
  return withdrawalFromApi(w)
}

export async function updateWithdrawalStatus(id, status, opts = {}) {
  const w = await request(`/api/admin/kitty/withdrawals/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status,
      transaction_reference: opts.transactionReference || null,
      admin_notes: opts.adminNotes || null,
    }),
  })
  return withdrawalFromApi(w)
}

// Admin Ledger APIs
export async function getAdminLedger(enrollmentId) {
  return request(`/api/admin/kitty/ledger/${enrollmentId}`)
}

export async function addLedgerAdjustment(data) {
  return request('/api/admin/kitty/ledger/adjustment', {
    method: 'POST',
    body: JSON.stringify({
      enrollment_id: data.enrollmentId,
      amount: data.amount,
      description: data.description,
      transaction_type: data.transactionType || 'adjustment',
    }),
  })
}

/** Upload one product image; returns public path e.g. /uploads/products/….jpg (dev: proxied to API). */
export async function uploadProductImage(file) {
  const url = `${API_BASE}/api/uploads/product-image`
  const body = new FormData()
  body.append('file', file)
  let res
  try {
    res = await fetch(url, { method: 'POST', body })
  } catch (e) {
    const err = new Error(e.message === 'Failed to fetch' ? 'Unable to reach server.' : e.message)
    err.status = 0
    throw err
  }
  if (!res.ok) {
    const err = new Error(res.statusText || 'Upload failed')
    err.status = res.status
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') err.message = data.detail
    } catch (_) {}
    throw err
  }
  const data = await res.json()
  if (data?.url) data.url = toPublicImageUrl(data.url)
  return data
}
