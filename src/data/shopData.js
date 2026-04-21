// Categories and products for Shop. Admin panel can replace these with API later.

export const METAL_TYPES = ['Gold', 'Silver', 'Diamond', 'Bronze']
export const PURITIES = ['24K', '22K', '18K']
export const PRODUCT_TYPES = ['Ring', 'Necklace', 'Chain', 'Bracelet', 'Bangle', 'Earrings', 'Pendant', 'Anklet']

export const SHOP_CATEGORIES = [
  {
    id: 'gold',
    name: 'Gold Jewellery',
    slug: 'gold',
    subcategories: [
      { id: 'gold-24k', name: '24 Karat Gold', slug: '24k' },
      { id: 'gold-22k', name: '22 Karat Gold', slug: '22k' },
      { id: 'gold-18k', name: '18 Karat Gold', slug: '18k' },
    ],
    products: ['Gold Rings', 'Gold Chains', 'Gold Bangles', 'Gold Necklaces', 'Gold Earrings'],
  },
  {
    id: 'silver',
    name: 'Silver Jewellery',
    slug: 'silver',
    subcategories: [],
    products: ['Silver Rings', 'Silver Chains', 'Silver Bracelets', 'Silver Anklets'],
  },
  {
    id: 'diamond',
    name: 'Diamond Jewellery',
    slug: 'diamond',
    subcategories: [],
    products: ['Diamond Rings', 'Diamond Necklaces', 'Diamond Earrings', 'Diamond Bracelets'],
  },
  {
    id: 'bronze',
    name: 'Bronze Jewellery',
    slug: 'bronze',
    subcategories: [],
    products: ['Bronze Rings', 'Bronze Bracelets', 'Bronze Pendants'],
  },
]

// Default metal rates (can be updated from admin / API)
export const DEFAULT_METAL_RATES = {
  gold24k: 6320,
  gold22k: 5800,
  silver: 78,
  diamondIndex: 52000,
  bronze: 0,
}

// GST percentage
export const GST_RATE = 0.03 // 3%

// Min order value in INR
export const MIN_ORDER_VALUE = 10000

// Sample products for shop listing (can be replaced with API)
export const SAMPLE_PRODUCTS = [
  { id: '1', name: 'Gold Ring', category: 'gold', purity: '22K', type: 'Ring', weight: 4.5, makingCharges: 800, metalRate: 5800, images: [] },
  { id: '2', name: 'Gold Chain', category: 'gold', purity: '24K', type: 'Chain', weight: 8.2, makingCharges: 1200, metalRate: 6320, images: [] },
  { id: '3', name: 'Gold Bangle', category: 'gold', purity: '22K', type: 'Bangle', weight: 25, makingCharges: 2500, metalRate: 5800, images: [] },
  { id: '4', name: 'Gold Necklace', category: 'gold', purity: '18K', type: 'Necklace', weight: 12, makingCharges: 1800, metalRate: 4800, images: [] },
  { id: '5', name: 'Gold Earrings', category: 'gold', purity: '22K', type: 'Earrings', weight: 2.8, makingCharges: 500, metalRate: 5800, images: [] },
  { id: '6', name: 'Silver Ring', category: 'silver', purity: null, type: 'Ring', weight: 5, makingCharges: 200, metalRate: 78, images: [] },
  { id: '7', name: 'Silver Chain', category: 'silver', purity: null, type: 'Chain', weight: 15, makingCharges: 400, metalRate: 78, images: [] },
  { id: '8', name: 'Silver Bracelet', category: 'silver', purity: null, type: 'Bracelet', weight: 20, makingCharges: 500, metalRate: 78, images: [] },
  { id: '9', name: 'Diamond Ring', category: 'diamond', purity: null, type: 'Ring', weight: 0, makingCharges: 15000, metalRate: 52000, diamondWeight: 0.5, images: [] },
  { id: '10', name: 'Diamond Necklace', category: 'diamond', purity: null, type: 'Necklace', weight: 0, makingCharges: 25000, metalRate: 52000, diamondWeight: 1.2, images: [] },
  { id: '11', name: 'Bronze Ring', category: 'bronze', purity: null, type: 'Ring', weight: 12, makingCharges: 150, metalRate: 0, images: [] },
  { id: '12', name: 'Bronze Pendant', category: 'bronze', purity: null, type: 'Pendant', weight: 8, makingCharges: 100, metalRate: 0, images: [] },
]
