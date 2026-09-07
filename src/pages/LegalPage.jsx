import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPage } from '../api/client'
import { defaultLegalPage } from '../data/legalPages'
import './LegalPage.css'

const SLUG_META = {
  privacy: { eyebrow: 'Legal', fallbackTitle: 'Privacy Policy', otherTo: '/terms', otherLabel: 'Terms of Service' },
  terms: { eyebrow: 'Legal', fallbackTitle: 'Terms of Service', otherTo: '/privacy', otherLabel: 'Privacy Policy' },
}

function renderBody(body) {
  const blocks = (body || '').trim().split(/\n{2,}/)
  return blocks.map((block, i) => {
    const line = block.trim()
    if (!line) return null
    if (line.startsWith('### ')) {
      return <h3 key={i} className="legal-h3">{line.slice(4)}</h3>
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="legal-h2">{line.slice(3)}</h2>
    }
    return (
      <p key={i} className="legal-copy">
        {line.split('\n').map((part, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {part}
          </span>
        ))}
      </p>
    )
  })
}

export default function LegalPage({ slug }) {
  const meta = SLUG_META[slug] || { eyebrow: 'Legal', fallbackTitle: 'Legal' }
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getPage(slug)
      .then((data) => {
        if (!cancelled) setPage(data)
      })
      .catch(() => {
        if (!cancelled) setPage(defaultLegalPage(slug))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [slug])

  const title = page?.title || meta.fallbackTitle

  return (
    <div className="legal-page">
      <p className="legal-eyebrow">{meta.eyebrow}</p>
      <h1 className="legal-title">{title}</h1>
      {loading && <p className="legal-status">Loading…</p>}
      {!loading && page && (
        <div className="legal-body">{renderBody(page.body)}</div>
      )}
      <p className="legal-back">
        <Link to="/">← Back to home</Link>
        {meta.otherTo && (
          <>
            {' · '}
            <Link to={meta.otherTo}>{meta.otherLabel}</Link>
          </>
        )}
      </p>
    </div>
  )
}

