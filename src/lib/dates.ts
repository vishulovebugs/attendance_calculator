import { DAYS } from './timetable'

export type Weekday = (typeof DAYS)[number] | 'Saturday' | 'Sunday'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

export function weekdayForDate(date: string): Weekday {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return (
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
  )[day] as Weekday
}

export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}