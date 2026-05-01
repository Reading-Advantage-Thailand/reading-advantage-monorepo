import { render, act } from '@testing-library/react'
import { useDirectionalInput } from './useDirectionalInput'

function InputProbe() {
  const { input } = useDirectionalInput()
  return (
    <div data-testid="input-probe" data-dx={input.dx} data-dy={input.dy} data-cast={input.cast ? '1' : '0'} />
  )
}

describe('useDirectionalInput', () => {
  it('prevents default for arrow keys to avoid page scrolling', () => {
    render(<InputProbe />)
    const event = new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true, cancelable: true })
    act(() => {
      window.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  })

  it('prevents default for space to avoid page scrolling', () => {
    render(<InputProbe />)
    const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true })
    act(() => {
      window.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  })
})
