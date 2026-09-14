import type { AttendanceRecord, AttendanceStatus } from './attendance'
import type { SubjectType } from './timetable'

export interface AttendanceTotals {
  attended: number
  conducted: number
}

export interface SubjectStats {
  subjectCode: string
  subjectName: string
  type: SubjectType
  tillMinor1: AttendanceTotals
  cumulative: AttendanceTotals
}

export interface BunkProjection {
  kind: 'miss' | 'need'
  count: number
}

function isConducted(status: AttendanceStatus): boolean {
  return status === 'Present' || status === 'Absent'
}

export function attendanceTotals(
  records: readonly AttendanceRecord[],
  cutoff?: string,
): AttendanceTotals {
  let attended = 0
  let conducted = 0
  for (const r of records) {
    if (cutoff !== undefined && r.date > cutoff) continue
    if (r.status === 'Present') attended++
    if (isConducted(r.status)) conducted++
  }
  return { attended, conducted }
}

export function attendancePercent(attended: number, conducted: number): number | null {
  if (conducted === 0) return null
  return (attended / conducted) * 100
}

export function bunkProjection(
  attended: number,
  conducted: number,
): BunkProjection | null {
  if (conducted === 0) return null
  if (4 * attended >= 3 * conducted) {
    return {
      kind: 'miss',
      count: Math.max(0, Math.floor((4 * attended - 3 * conducted) / 3)),
    }
  }
  return {
    kind: 'need',
    count: Math.max(0, Math.ceil(3 * conducted - 4 * attended)),
  }
}

export function perSubjectStats(
  records: readonly AttendanceRecord[],
  cutoff?: string,
): SubjectStats[] {
  const map = new Map<string, SubjectStats>()
  for (const r of records) {
    let cur = map.get(r.subjectCode)
    if (!cur) {
      cur = {
        subjectCode: r.subjectCode,
        subjectName: r.subjectName,
        type: r.type,
        tillMinor1: { attended: 0, conducted: 0 },
        cumulative: { attended: 0, conducted: 0 },
      }
      map.set(r.subjectCode, cur)
    }
    if (cutoff === undefined || r.date <= cutoff) {
      if (r.status === 'Present') cur.tillMinor1.attended++
      if (isConducted(r.status)) cur.tillMinor1.conducted++
    }
    if (r.status === 'Present') cur.cumulative.attended++
    if (isConducted(r.status)) cur.cumulative.conducted++
  }
  return [...map.values()].sort((a, b) => (a.subjectCode < b.subjectCode ? -1 : 1))
}