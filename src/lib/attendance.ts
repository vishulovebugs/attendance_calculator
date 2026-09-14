import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import type { Holiday } from '../data/calendar'
import type { Group } from '../types'
import type { Day, SubjectType, TimetableEntry } from './timetable'
import { expandEntry } from './timetable'
import { isHoliday } from './calendar'
import { isInSportsMeet } from './calendar'
import { db } from './firebase'

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'No Class', 'Holiday'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export interface AttendanceSlot {
  slotId: string
  day: Day
  startTime: string
  endTime: string
  subjectCode: string
  subjectName: string
  type: SubjectType
  group?: Group
}

export interface AttendanceRecord {
  date: string
  slotId: string
  day: Day
  startTime: string
  endTime: string
  subjectCode: string
  subjectName: string
  type: SubjectType
  group?: Group
  status: AttendanceStatus
}

export function attendanceDocId(date: string, slotId: string): string {
  return `${date}_${slotId}`
}

export function slotsForWeekday(
  entries: readonly TimetableEntry[],
  weekday: Day,
  group: Group,
): AttendanceSlot[] {
  return entries
    .filter((e) => e.day === weekday)
    .filter((e) => e.type !== 'Lab' || e.group === group)
    .flatMap((e) =>
      expandEntry(e).map((hour) => ({
        slotId: `${e.day}-${hour.start}`,
        day: e.day,
        startTime: hour.start,
        endTime: hour.end,
        subjectCode: e.subjectCode,
        subjectName: e.subjectName,
        type: e.type,
        group: e.group,
      })),
    )
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
}

export function defaultStatus(
  date: string,
  holidays: readonly Holiday[],
  sportsRange: { start: string | null; end: string | null },
): AttendanceStatus | null {
  if (isHoliday(date, holidays) || isInSportsMeet(date, sportsRange)) return 'Holiday'
  return null
}

export async function getAttendanceForDate(
  uid: string,
  date: string,
): Promise<AttendanceRecord[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'attendance'))
  return snapshot.docs
    .map((d) => d.data() as AttendanceRecord)
    .filter((r) => r.date === date)
}

export async function setAttendance(
  uid: string,
  record: AttendanceRecord,
): Promise<void> {
  const id = attendanceDocId(record.date, record.slotId)
  await setDoc(doc(db, 'users', uid, 'attendance', id), record)
}