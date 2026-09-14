import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OnboardingScreen from './OnboardingScreen'

describe('OnboardingScreen', () => {
  it('cannot submit with empty required fields', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(<OnboardingScreen onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Section is required')).toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('submits valid inputs', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(<OnboardingScreen onComplete={onComplete} />)

    await user.type(screen.getByLabelText('Name'), 'Aarav Sharma')
    await user.type(screen.getByLabelText('Section'), 'A')
    await user.selectOptions(screen.getByLabelText('Branch'), 'CSE-AI')
    await user.selectOptions(screen.getByLabelText('Group'), 'B')

    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aarav Sharma',
        semester: 1,
        branch: 'CSE-AI',
        section: 'A',
        group: 'B',
      }),
    )
  })
})