'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

const POLL_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export function CheckAllButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const checkAll = useCallback(async (silent = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/feed/check-all', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Check failed')
      if (!silent) {
        toast.success(`Checked ${data.sources_checked} sources — ${data.total_items_found} links found`)
      }
      router.refresh()
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof Error ? err.message : 'Check all failed')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  // Check all sources once on initial mount (silent)
  useEffect(() => {
    checkAll(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll every 10 minutes while the page is open
  useEffect(() => {
    const id = setInterval(() => checkAll(true), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [checkAll])

  return (
    <button
      onClick={() => checkAll(false)}
      disabled={loading}
      className="flex items-center gap-2 text-sm px-3 py-1.5 rounded font-medium transition-colors"
      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
    >
      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Checking…' : 'Check All Sources'}
    </button>
  )
}
