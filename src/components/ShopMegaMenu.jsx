import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategoryTree } from '../api/client'
import { SHOP_CATEGORIES } from '../data/shopData'
import './ShopMegaMenu.css'

export default function ShopMegaMenu({ open, onClose }) {
  const [tree, setTree] = useState([])

  useEffect(() => {
    if (!open) return
    getCategoryTree(true)
      .then(setTree)
      .catch(() => setTree([]))
  }, [open])

  if (!open) return null

  const columns = tree.length > 0
    ? tree.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug || cat.name.toLowerCase(),
        children: cat.children || [],
      }))
    : SHOP_CATEGORIES.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        children: (cat.subcategories || []).map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          isPurity: true,
        })),
      }))

  return (
    <div className="mega-menu" onMouseLeave={onClose}>
      <div className="mega-menu-inner">
        {columns.map((cat) => (
          <div key={cat.id} className="mega-menu-col">
            <Link
              to={`/shop?category=${cat.slug}`}
              className="mega-menu-category"
              onClick={onClose}
            >
              {cat.name}
            </Link>
            {cat.children?.length > 0 && (
              <ul className="mega-menu-sublist">
                {cat.children.map((sub) => (
                  <li key={sub.id}>
                    <Link
                      to={
                        sub.isPurity
                          ? `/shop?category=${cat.slug}&purity=${sub.slug}`
                          : `/shop?category=${cat.slug}&categoryId=${sub.id}`
                      }
                      onClick={onClose}
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
