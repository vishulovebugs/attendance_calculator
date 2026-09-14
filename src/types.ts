export const BRANCHES = ['CSE', 'IT', 'CSE-AI', 'CSE-DS', 'ECE'] as const
export type Branch = (typeof BRANCHES)[number]

export const GROUPS = ['A', 'B', 'C', 'D'] as const
export type Group = (typeof GROUPS)[number]

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const
export type Semester = (typeof SEMESTERS)[number]

export interface UserProfile {
  name: string
  semester: number
  branch: Branch
  section: string
  group: Group
  email: string | null
  createdAt: string
}

export interface OnboardingInputs {
  name: string
  semester: number
  branch: Branch
  section: string
  group: Group
}