const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    images: p.images ?? [],
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
    images: Array.isArray(p.images) ? p.images : [],
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

// Auth
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
