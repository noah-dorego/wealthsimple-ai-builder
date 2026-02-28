import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Severity, ReviewStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

export const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export const severityColor: Record<Severity, string> = {
  critical: 'bg-[var(--severity-critical)] text-white',
  high: 'bg-[var(--severity-high)] text-white',
  medium: 'bg-[var(--severity-medium)] text-white',
  low: 'bg-[var(--severity-low)] text-white',
}

export const statusColor: Record<ReviewStatus, string> = {
  new: 'bg-[var(--status-new)] text-white',
  reviewed: 'bg-[var(--status-reviewed)] text-white',
  action_planned: 'bg-[var(--status-action-planned)] text-white',
  escalated: 'bg-[var(--status-escalated)] text-white',
  resolved: 'bg-[var(--status-resolved)] text-white',
}
