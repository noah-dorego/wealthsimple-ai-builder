'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, RefreshCw, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { FeedSource, FeedSourceCategory, SourceAgency } from '@/lib/types'

const AGENCIES: SourceAgency[] = [
  'CRA', 'CIRO', 'OSC', 'CSA', 'FINTRAC', 'OSFI', 'FCAC', 'Dept-of-Finance', 'Payments-Canada',
]

const CATEGORIES: { value: FeedSourceCategory; label: string }[] = [
  { value: 'news',         label: 'News' },
  { value: 'publications', label: 'Publications' },
  { value: 'orders',       label: 'Orders' },
]

interface Props {
  sources: FeedSource[]
}

export function FeedSourceList({ sources }: Props) {
  const router = useRouter()
  const [checking, setChecking] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<FeedSourceCategory | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [agency, setAgency] = useState<SourceAgency>('CRA')
  const [category, setCategory] = useState<FeedSourceCategory>('news')
  const [adding, setAdding] = useState(false)

  async function handleCheck(id: string) {
    setChecking(id)
    try {
      const res = await fetch(`/api/feed/sources/${id}/check`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Check failed')
      toast.success(`Found ${data.items_found} links`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setChecking(null)
    }
  }

  async function handleDelete(id: string, label: string) {
    try {
      const res = await fetch(`/api/feed/sources/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success(`Removed "${label}"`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function handleAdd() {
    if (!label.trim() || !url.trim()) {
      toast.error('Label and URL are required')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/feed/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, url, source_agency: agency, category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Add failed')
      toast.success('Source added')
      setLabel('')
      setUrl('')
      setAgency('CRA')
      setCategory('news')
      setShowForm(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setAdding(false)
    }
  }

  const filtered = activeCategory
    ? sources.filter(s => s.category === activeCategory)
    : sources

  return (
    <div className="flex flex-col gap-2">
      {/* Category filter chips */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setActiveCategory(null)}
          className="text-xs px-2.5 py-1 rounded-full border transition-colors"
          style={{
            borderColor: activeCategory === null ? 'var(--accent-blue)' : 'var(--border-subtle)',
            backgroundColor: activeCategory === null ? 'color-mix(in srgb, var(--accent-blue) 12%, transparent)' : 'transparent',
            color: activeCategory === null ? 'var(--accent-blue)' : 'var(--text-muted)',
          }}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(prev => prev === c.value ? null : c.value)}
            className="text-xs px-2.5 py-1 rounded-full border transition-colors"
            style={{
              borderColor: activeCategory === c.value ? 'var(--accent-blue)' : 'var(--border-subtle)',
              backgroundColor: activeCategory === c.value ? 'color-mix(in srgb, var(--accent-blue) 12%, transparent)' : 'transparent',
              color: activeCategory === c.value ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Source rows */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        {filtered.map((source, i) => (
          <div
            key={source.id}
            className="flex items-center gap-3 px-3 py-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
            }}
          >
            {/* Label */}
            <span
              className="text-sm font-medium flex-1 min-w-0 truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {source.label}
            </span>

            {/* Agency badge */}
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              {source.source_agency}
            </span>

            {/* Last checked */}
            <span
              className="text-xs shrink-0 w-28 text-right"
              style={{ color: 'var(--text-muted)' }}
            >
              {source.last_checked_at ? formatDate(source.last_checked_at) : 'Never'}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleCheck(source.id)}
                disabled={checking === source.id}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
              >
                <RefreshCw size={11} className={checking === source.id ? 'animate-spin' : ''} />
                Check
              </button>
              <button
                onClick={() => handleDelete(source.id, source.label)}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div
            className="px-3 py-4 text-center text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            No sources in this category.
          </div>
        )}
      </div>

      {/* Add source form */}
      {showForm ? (
        <div
          className="rounded-md p-3 flex flex-col gap-2"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex gap-2">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Label"
              className="flex-1 rounded px-2 py-1.5 text-sm min-w-0"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
            <select
              value={agency}
              onChange={e => setAgency(e.target.value as SourceAgency)}
              className="rounded px-2 py-1.5 text-sm"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as FeedSourceCategory)}
              className="rounded px-2 py-1.5 text-sm"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex-1 text-sm py-1.5 rounded font-medium"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 text-sm py-1.5 rounded"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors"
          style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
        >
          <Plus size={13} />
          Add Source
        </button>
      )}
    </div>
  )
}
