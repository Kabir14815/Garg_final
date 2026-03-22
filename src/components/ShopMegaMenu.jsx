import { Link } from 'react-router-dom'
import { SHOP_CATEGORIES } from '../data/shopData'
import './ShopMegaMenu.css'

export default function ShopMegaMenu({ open, onClose }) {
  if (!open) return null

  return (
    <div className="mega-menu" onMouseLeave={onClose}>
      <div className="mega-menu-inner">
        {SHOP_CATEGORIES.map((cat) => (
          <div key={cat.id} className="mega-menu-col">
            <Link
              to={`/shop?category=${cat.slug}`}
              className="mega-menu-category"
              onClick={onClose}
            >
              {cat.name}
            </Link>
            {cat.subcategories?.length > 0 && (
              <ul className="mega-menu-sublist">
                {cat.subcategories.map((sub) => (
                  <li key={sub.id}>
                    <Link to={`/shop?category=${cat.slug}&purity=${sub.slug}`} onClick={onClose}>
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <ul className="mega-menu-products">
              {cat.products.map((name) => (
                <li key={name}>
                  <Link to={`/shop?category=${cat.slug}&q=${encodeURIComponent(name)}`} onClick={onClose}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
