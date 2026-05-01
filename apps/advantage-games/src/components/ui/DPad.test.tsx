import { render, fireEvent, screen } from '@testing-library/react'
import { DPad } from './DPad'

describe('DPad', () => {
  it('calls onInput when buttons are clicked', () => {
    const handleInput = jest.fn()
    render(<DPad onInput={handleInput} />)

    // Find buttons by role? No, they are just buttons.
    // I can look for SVGs or classes.
    // Since I didn't add aria-labels, I'll select by the rendered SVG presence maybe?
    // Or just fire events on all buttons.
    
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(5)

    // Click Top Button (first one usually in DOM order? No, grid layout makes it tricky)
    // Up is first rendered button
    fireEvent.mouseDown(buttons[0])
    expect(handleInput).toHaveBeenCalledWith({ dx: 0, dy: -1 })
    
    fireEvent.mouseUp(buttons[0])
    expect(handleInput).toHaveBeenCalledWith({ dx: 0, dy: 0 })
  })
})
