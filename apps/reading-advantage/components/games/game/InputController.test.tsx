import { render, screen, fireEvent } from '@testing-library/react'
import { InputController } from './InputController'

describe('InputController', () => {
  it('updates state on change', () => {
    render(<InputController onSubmit={jest.fn()} />)
    const input = screen.getByPlaceholderText(/type translation/i) as HTMLInputElement
    
    fireEvent.change(input, { target: { value: 'Manzana' } })
    expect(input.value).toBe('Manzana')
  })

  it('calls onSubmit and clears input on Enter', () => {
    const onSubmit = jest.fn()
    render(<InputController onSubmit={onSubmit} />)
    const input = screen.getByPlaceholderText(/type translation/i) as HTMLInputElement
    
    fireEvent.change(input, { target: { value: 'Manzana' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    
    expect(onSubmit).toHaveBeenCalledWith('Manzana')
    expect(input.value).toBe('')
  })
})
