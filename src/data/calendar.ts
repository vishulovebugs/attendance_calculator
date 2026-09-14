export interface DateRange {
  start: string | null
  end: string | null
}

export interface SportsMeetRange extends DateRange {
  note: string
}

export interface MinorExamWindow extends DateRange {
  editable: boolean
}

export interface AcademicCalendar {
  semesterLabel: string
  teachingStart: string
  teachingEnd: string
  teachingWeeks: number
  sportsMeet: SportsMeetRange
  examStart: string
  examEnd: string
  winterVacationStart: string
  winterVacationEnd: string
  minor1: MinorExamWindow
  minor2: MinorExamWindow
}

export interface Holiday {
  date: string
  day: string
  name: string
  fallsOnWeekend: boolean
}

export const DEFAULT_CALENDAR: AcademicCalendar = {
  semesterLabel: 'Odd Semester 2026-27',
  teachingStart: '2026-08-03',
  teachingEnd: '2026-12-06',
  teachingWeeks: 18,
  sportsMeet: {
    start: '2026-10-14',
    end: '2026-10-16',
    note: 'No classes, treat like a holiday range',
  },
  examStart: '2026-12-07',
  examEnd: '2027-01-03',
  winterVacationStart: '2027-01-04',
  winterVacationEnd: '2027-01-17',
  minor1: {
    start: '2026-09-21',
    end: '2026-09-27',
    editable: true,
  },
  minor2: {
    start: null,
    end: null,
    editable: true,
  },
}

export const HOLIDAYS: Holiday[] = [
  { date: '2026-08-15', day: 'Saturday', name: 'Independence Day', fallsOnWeekend: true },
  { date: '2026-08-26', day: 'Wednesday', name: 'Milad-un-Nabi', fallsOnWeekend: false },
  { date: '2026-09-04', day: 'Friday', name: 'Janmashtami (Vaishnva)', fallsOnWeekend: false },
  { date: '2026-10-02', day: 'Friday', name: "Mahatma Gandhi's Birthday", fallsOnWeekend: false },
  { date: '2026-10-20', day: 'Tuesday', name: 'Dussehra', fallsOnWeekend: false },
  { date: '2026-10-26', day: 'Monday', name: "Maharishi Valmiki's Birthday", fallsOnWeekend: false },
  { date: '2026-11-08', day: 'Sunday', name: 'Diwali (Deepavali)', fallsOnWeekend: true },
  { date: '2026-11-24', day: 'Tuesday', name: "Guru Nanak's Birthday", fallsOnWeekend: false },
]