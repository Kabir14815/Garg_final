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
