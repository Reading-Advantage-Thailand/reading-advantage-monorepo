import { render, screen, fireEvent } from '@testing-library/react'
import { InputController } from './InputController'

describe('InputController', () => {
  it('updates the accessible desktop input', () => {
    render(<InputController onSubmit={jest.fn()} />)
    const input = screen.getByRole('textbox', {
      name: /type spell/i,
    }) as HTMLInputElement

    fireEvent.change(input, { target: { value: 'Manzana' } })
    expect(input.value).toBe('Manzana')
  })

  it('submits and clears the desktop input on Enter', () => {
    const onSubmit = jest.fn()
    render(<InputController onSubmit={onSubmit} />)
    const input = screen.getByRole('textbox', {
      name: /type spell/i,
    }) as HTMLInputElement

    fireEvent.change(input, { target: { value: 'Manzana' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('Manzana')
    expect(input.value).toBe('')
  })

  it('submits the mobile input through the named button', () => {
    const onSubmit = jest.fn()
    render(<InputController onSubmit={onSubmit} mobile />)
    const input = screen.getByRole('textbox', {
      name: /type spell/i,
    })

    fireEvent.change(input, { target: { value: 'Manzana' } })
    fireEvent.click(screen.getByRole('button', { name: /submit spell/i }))

    expect(onSubmit).toHaveBeenCalledWith('Manzana')
  })
})
