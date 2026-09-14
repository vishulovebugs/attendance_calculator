import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import type { Group } from '../types'
import { db } from './firebase'

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const
export type Day = (typeof DAYS)[number]

export const SUBJECT_TYPES = ['Lecture', 'Lab'] as const
export type SubjectType = (typeof SUBJECT_TYPES)[number]

export const START_HOUR = 9
export const END_HOUR = 17
export const LAB_MAX_START = '15:00'

export interface HourSlot {
  start: string
  end: string
}

export interface TimetableEntry {
  day: Day
  startTime: string
  endTime: string
  subjectCode: string
  subjectName: string
  type: SubjectType
  group?: Group
  units: number
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function buildHourStarts(): string[] {
  const starts: string[] = []
  for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
    starts.push(`${pad2(hour)}:00`)
  }
  return starts
}

export const HOUR_STARTS = buildHourStarts()

export function addHours(time: string, hours: number): string {
  const [hour, minute] = time.split(':').map(Number)
  const total = hour * 60 + minute + hours * 60
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

export function entryId(entry: Pick<TimetableEntry, 'day' | 'startTime'>): string {
  return `${entry.day}-${entry.startTime}`
}

export function expandEntry(entry: TimetableEntry): HourSlot[] {
  const slots: HourSlot[] = []
  let cursor = entry.startTime
  let remaining = entry.units
  while (remaining > 0) {
    const end = addHours(cursor, 1)
    slots.push({ start: cursor, end })
    cursor = end
    remaining -= 1
  }
  return slots
}

export function entryCoversHour(entry: TimetableEntry, slot: HourSlot): boolean {
  return entry.startTime <= slot.start && entry.endTime >= slot.end
}

export function overlapsAt(
  existing: readonly TimetableEntry[],
  slot: HourSlot,
): boolean {
  return existing.some((entry) => entryCoversHour(entry, slot))
}

export function conflictsWith(
  existing: readonly TimetableEntry[],
  candidate: TimetableEntry,
): boolean {
  const slots = expandEntry(candidate)
  return existing.some(
    (entry) =>
      entry.day === candidate.day &&
      slots.some((slot) => entryCoversHour(entry, slot)),
  )
}

export function hourSlotsForDay(_day: Day): HourSlot[] {
  return HOUR_STARTS.map((start) => ({ start, end: addHours(start, 1) }))
}

export function clickableSlotsFor(type: SubjectType): HourSlot[] {
  const starts =
    type === 'Lab'
      ? HOUR_STARTS.filter((start) => start <= LAB_MAX_START)
      : [...HOUR_STARTS]
  return starts.map((start) => ({ start, end: addHours(start, 1) }))
}

function timetableCollection(uid: string) {
  return collection(db, 'users', uid, 'timetable')
}

export async function getTimetable(uid: string): Promise<TimetableEntry[]> {
  const snapshot = await getDocs(timetableCollection(uid))
  return snapshot.docs.map((d) => d.data() as TimetableEntry)
}

export async function saveTimetable(
  uid: string,
  entries: readonly TimetableEntry[],
): Promise<void> {
  const snapshot = await getDocs(timetableCollection(uid))
  const incomingIds = new Set(entries.map(entryId))
  await Promise.all(
    snapshot.docs
      .filter((d) => !incomingIds.has(d.id))
      .map((d) => deleteDoc(doc(db, 'users', uid, 'timetable', d.id))),
  )
  await Promise.all(
    entries.map((entry) =>
      setDoc(doc(db, 'users', uid, 'timetable', entryId(entry)), entry),
    ),
  )
}